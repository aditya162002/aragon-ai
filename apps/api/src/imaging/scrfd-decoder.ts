import { FACE_DETECTION, SCRFD_TENSOR } from '../constants';
import { clampBox, intersectionOverUnion, scaleBox, type Size } from './box-geometry';
import type { DetectedFace, FaceDetectionResult, Point } from './face-detector';
import type { StrideOutput } from './scrfd-outputs';

/** How the working image was fitted into the network input (see scrfd-input.ts). */
export type InputGeometry = {
  /** Network-input pixels per working-image pixel. */
  scale: number;
  /** Working-image size, used to clamp boxes. */
  imageSize: Size;
};

/**
 * Turns raw SCRFD outputs into faces in working-image pixels: threshold, merge the three heads,
 * suppress overlapping duplicates, then undo the input resize. Mirrors InsightFace's SCRFD.detect().
 */
export function decodeDetections(outputs: readonly StrideOutput[], geometry: InputGeometry): FaceDetectionResult {
  const candidates = outputs.flatMap((output) => decodeStride(output, FACE_DETECTION.SCORE_THRESHOLD));
  const faces = nonMaxSuppression(candidates, FACE_DETECTION.NMS_IOU_THRESHOLD).map((face) =>
    toImageCoordinates(face, geometry),
  );
  return { faces, topScore: highestScore(outputs) };
}

/** Faces predicted by one head with a score ≥ threshold, in network-input pixels. */
export function decodeStride(output: StrideOutput, scoreThreshold: number): DetectedFace[] {
  const { stride, scores, boxes, landmarks } = output;
  const gridSize = FACE_DETECTION.INPUT_SIZE_PX / stride;
  const faces: DetectedFace[] = [];

  for (let anchor = 0; anchor < scores.length; anchor++) {
    const score = scores[anchor];
    if (score < scoreThreshold) continue;

    // Anchors are laid out row-major over the grid, ANCHORS_PER_LOCATION per cell, centred on the cell corner.
    const location = Math.floor(anchor / FACE_DETECTION.ANCHORS_PER_LOCATION);
    const centerX = (location % gridSize) * stride;
    const centerY = Math.floor(location / gridSize) * stride;

    const boxStart = anchor * FACE_DETECTION.BOX_VALUES_PER_ANCHOR;
    const [left, top, right, bottom] = boxes.subarray(boxStart, boxStart + FACE_DETECTION.BOX_VALUES_PER_ANCHOR);
    const x1 = centerX - left * stride;
    const y1 = centerY - top * stride;
    const x2 = centerX + right * stride;
    const y2 = centerY + bottom * stride;

    const landmarkStart = anchor * FACE_DETECTION.KEYPOINT_VALUES_PER_ANCHOR;
    const offsets = landmarks.subarray(landmarkStart, landmarkStart + FACE_DETECTION.KEYPOINT_VALUES_PER_ANCHOR);

    faces.push({
      box: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
      score,
      landmarks: toPoints(offsets, centerX, centerY, stride),
    });
  }
  return faces;
}

/** Greedy NMS: keep the most confident face, drop any overlapping it by more than the IoU threshold, repeat. */
export function nonMaxSuppression(faces: readonly DetectedFace[], iouThreshold: number): DetectedFace[] {
  const kept: DetectedFace[] = [];
  for (const face of [...faces].sort((a, b) => b.score - a.score)) {
    if (kept.every((keptFace) => intersectionOverUnion(keptFace.box, face.box) <= iouThreshold)) {
      kept.push(face);
    }
  }
  return kept;
}

function toPoints(offsets: Float32Array, centerX: number, centerY: number, stride: number): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < offsets.length; index += SCRFD_TENSOR.VALUES_PER_LANDMARK) {
    points.push([centerX + offsets[index] * stride, centerY + offsets[index + 1] * stride]);
  }
  return points;
}

function toImageCoordinates(face: DetectedFace, { scale, imageSize }: InputGeometry): DetectedFace {
  return {
    box: clampBox(scaleBox(face.box, 1 / scale), imageSize),
    score: face.score,
    landmarks: face.landmarks.map(([x, y]): Point => [x / scale, y / scale]),
  };
}

function highestScore(outputs: readonly StrideOutput[]): number {
  let highest = 0;
  for (const { scores } of outputs) {
    for (const score of scores) highest = Math.max(highest, score);
  }
  return highest;
}
