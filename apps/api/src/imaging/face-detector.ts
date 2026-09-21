import type { Box } from './box-geometry';

export type Point = [x: number, y: number];

export type DetectedFace = {
  /** In working-image pixels. */
  box: Box;
  score: number;
  /** Eyes, nose tip and mouth corners, in working-image pixels. */
  landmarks: Point[];
};

export type FaceDetectionResult = {
  /** Detections at or above the confidence threshold, after non-maximum suppression. */
  faces: DetectedFace[];
  /** Highest raw confidence seen, even when below the threshold (kept for threshold tuning). */
  topScore: number;
};

/** Port for face detection so checks can be tested without loading a model. */
export interface FaceDetector {
  detect(workingJpeg: Buffer): Promise<FaceDetectionResult>;
}
