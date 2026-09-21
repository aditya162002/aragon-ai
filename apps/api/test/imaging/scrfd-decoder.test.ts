import { describe, expect, it } from 'vitest';
import { FACE_DETECTION } from '../../src/constants';
import { decodeDetections, decodeStride, nonMaxSuppression } from '../../src/imaging/scrfd-decoder';
import { anchorCountForStride, groupOutputsByStride, type StrideOutput } from '../../src/imaging/scrfd-outputs';

const [SMALL_STRIDE, MEDIUM_STRIDE, LARGE_STRIDE] = FACE_DETECTION.STRIDES;
const BELOW_THRESHOLD = FACE_DETECTION.SCORE_THRESHOLD / 2;

type AnchorSpec = {
  row: number;
  column: number;
  /** Which of the ANCHORS_PER_LOCATION anchors at this grid cell. */
  anchor: number;
  score: number;
  /** Distances left, top, right, bottom from the cell centre, in stride units. */
  distances: [number, number, number, number];
  /** Landmark offsets in stride units, flattened (x, y) pairs. */
  landmarks?: number[];
};

function emptyStride(stride: number): StrideOutput {
  const anchors = anchorCountForStride(stride);
  return {
    stride,
    scores: new Float32Array(anchors * FACE_DETECTION.SCORE_VALUES_PER_ANCHOR),
    boxes: new Float32Array(anchors * FACE_DETECTION.BOX_VALUES_PER_ANCHOR),
    landmarks: new Float32Array(anchors * FACE_DETECTION.KEYPOINT_VALUES_PER_ANCHOR),
  };
}

function strideWith(stride: number, specs: AnchorSpec[]): StrideOutput {
  const output = emptyStride(stride);
  const grid = FACE_DETECTION.INPUT_SIZE_PX / stride;
  for (const spec of specs) {
    const index = (spec.row * grid + spec.column) * FACE_DETECTION.ANCHORS_PER_LOCATION + spec.anchor;
    output.scores[index] = spec.score;
    output.boxes.set(spec.distances, index * FACE_DETECTION.BOX_VALUES_PER_ANCHOR);
    if (spec.landmarks) output.landmarks.set(spec.landmarks, index * FACE_DETECTION.KEYPOINT_VALUES_PER_ANCHOR);
  }
  return output;
}

// Stride-32 cell (row 5, column 6) is centred at (192, 160) in network-input pixels.
const MAIN: AnchorSpec = { row: 5, column: 6, anchor: 0, score: 0.9, distances: [1, 1, 1, 1], landmarks: [0, 0, 0.5, -0.5] };
const OVERLAPPING: AnchorSpec = { row: 5, column: 6, anchor: 1, score: 0.8, distances: [1, 1, 1.2, 1.2] };
// Cell (15, 15) is centred at (480, 480).
const SECOND: AnchorSpec = { row: 15, column: 15, anchor: 0, score: 0.7, distances: [0.5, 0.5, 0.5, 0.5] };
const WEAK: AnchorSpec = { row: 0, column: 0, anchor: 0, score: BELOW_THRESHOLD, distances: [1, 1, 1, 1] };

describe('decodeStride', () => {
  it('converts anchor distances into boxes and keeps only confident anchors', () => {
    const faces = decodeStride(strideWith(LARGE_STRIDE, [MAIN, WEAK]), FACE_DETECTION.SCORE_THRESHOLD);

    expect(faces).toHaveLength(1);
    expect(faces[0].score).toBeCloseTo(MAIN.score);
    expect(faces[0].box).toEqual({ x: 160, y: 128, width: 64, height: 64 });
    expect(faces[0].landmarks.slice(0, 2)).toEqual([
      [192, 160],
      [208, 144],
    ]);
  });
});

describe('nonMaxSuppression', () => {
  it('drops a lower-scoring box that overlaps a kept one, keeps distinct boxes', () => {
    const candidates = decodeStride(strideWith(LARGE_STRIDE, [SECOND, OVERLAPPING, MAIN]), FACE_DETECTION.SCORE_THRESHOLD);
    const kept = nonMaxSuppression(candidates, FACE_DETECTION.NMS_IOU_THRESHOLD);

    expect(kept.map((face) => face.score)).toEqual([MAIN.score, SECOND.score].map(Math.fround));
  });
});

describe('decodeDetections', () => {
  const outputs = [emptyStride(SMALL_STRIDE), emptyStride(MEDIUM_STRIDE), strideWith(LARGE_STRIDE, [MAIN, OVERLAPPING, SECOND, WEAK])];

  it('maps boxes back to working-image pixels and reports the top raw score', () => {
    const result = decodeDetections(outputs, { scale: 0.5, imageSize: { width: 1280, height: 1280 } });

    expect(result.topScore).toBeCloseTo(MAIN.score);
    expect(result.faces.map((face) => face.box)).toEqual([
      { x: 320, y: 256, width: 128, height: 128 },
      { x: 928, y: 928, width: 64, height: 64 },
    ]);
    expect(result.faces[0].landmarks[0]).toEqual([384, 320]);
  });

  it('clamps boxes to the image bounds', () => {
    const result = decodeDetections(outputs, { scale: 0.5, imageSize: { width: 950, height: 1280 } });
    expect(result.faces[1].box).toEqual({ x: 928, y: 928, width: 22, height: 64 });
  });

  it('reports no faces but keeps the top score when nothing clears the threshold', () => {
    const weakOnly = [emptyStride(SMALL_STRIDE), emptyStride(MEDIUM_STRIDE), strideWith(LARGE_STRIDE, [WEAK])];
    const result = decodeDetections(weakOnly, { scale: 1, imageSize: { width: 640, height: 640 } });

    expect(result.faces).toEqual([]);
    expect(result.topScore).toBeCloseTo(BELOW_THRESHOLD);
  });
});

describe('groupOutputsByStride', () => {
  it('identifies outputs by shape regardless of their order', () => {
    const tensors = FACE_DETECTION.STRIDES.flatMap((stride) => {
      const { scores, boxes, landmarks } = strideWith(stride, []);
      const anchors = anchorCountForStride(stride);
      return [
        { dims: [anchors, FACE_DETECTION.KEYPOINT_VALUES_PER_ANCHOR], data: landmarks },
        { dims: [anchors, FACE_DETECTION.SCORE_VALUES_PER_ANCHOR], data: scores },
        { dims: [anchors, FACE_DETECTION.BOX_VALUES_PER_ANCHOR], data: boxes },
      ];
    }).reverse();

    const grouped = groupOutputsByStride(tensors);

    expect(grouped.map((output) => output.stride)).toEqual([...FACE_DETECTION.STRIDES]);
    expect(grouped[0].scores).toHaveLength(anchorCountForStride(SMALL_STRIDE));
    expect(grouped[2].landmarks).toHaveLength(anchorCountForStride(LARGE_STRIDE) * FACE_DETECTION.KEYPOINT_VALUES_PER_ANCHOR);
  });

  it('fails loudly when the model does not produce the expected outputs', () => {
    expect(() => groupOutputsByStride([])).toThrow(/SCRFD output/);
  });
});

describe('anchorCountForStride', () => {
  it('matches the verified model output sizes', () => {
    expect(FACE_DETECTION.STRIDES.map(anchorCountForStride)).toEqual([12800, 3200, 800]);
  });
});
