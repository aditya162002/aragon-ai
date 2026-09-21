import { FACE_DETECTION } from '../constants';

/** Raw predictions of one SCRFD detection head (one feature-map stride). */
export type StrideOutput = {
  stride: number;
  /** [anchors] confidences, already passed through a sigmoid. */
  scores: Float32Array;
  /** [anchors × 4] distances (left, top, right, bottom) from the anchor centre, in stride units. */
  boxes: Float32Array;
  /** [anchors × 10] landmark offsets (x, y pairs) from the anchor centre, in stride units. */
  landmarks: Float32Array;
};

/** Structural view of an onnxruntime tensor, so this module stays independent of the runtime. */
export type OutputTensor = {
  readonly dims: readonly number[];
  readonly data: unknown;
};

/** Anchors predicted by the head of a given stride for a square INPUT_SIZE_PX input. */
export function anchorCountForStride(stride: number): number {
  const gridSize = FACE_DETECTION.INPUT_SIZE_PX / stride;
  return gridSize * gridSize * FACE_DETECTION.ANCHORS_PER_LOCATION;
}

/**
 * Sorts the model's nine [anchors, values] outputs into per-stride groups. Output names are numeric and
 * vary between exports, so each tensor is identified by its shape: the anchor count gives the stride and
 * the values-per-anchor (1 / 4 / 10) gives the kind.
 */
export function groupOutputsByStride(tensors: readonly OutputTensor[]): StrideOutput[] {
  return FACE_DETECTION.STRIDES.map((stride) => {
    const anchorCount = anchorCountForStride(stride);
    const find = (valuesPerAnchor: number): Float32Array => {
      const tensor = tensors.find(({ dims: [anchors, values] }) => anchors === anchorCount && values === valuesPerAnchor);
      if (!tensor || !(tensor.data instanceof Float32Array)) {
        throw new Error(`SCRFD output of shape [${anchorCount}, ${valuesPerAnchor}] is missing`);
      }
      return tensor.data;
    };

    return {
      stride,
      scores: find(FACE_DETECTION.SCORE_VALUES_PER_ANCHOR),
      boxes: find(FACE_DETECTION.BOX_VALUES_PER_ANCHOR),
      landmarks: find(FACE_DETECTION.KEYPOINT_VALUES_PER_ANCHOR),
    };
  });
}
