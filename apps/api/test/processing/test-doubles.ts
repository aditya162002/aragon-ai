import { randomUUID } from 'node:crypto';
import { IMAGE_RULES } from '../../src/constants';
import { ImageFormat } from '../../src/generated/prisma/enums';
import type { Box } from '../../src/imaging/box-geometry';
import type { DetectedFace, FaceDetectionResult, FaceDetector } from '../../src/imaging/face-detector';
import type { DecodedImage } from '../../src/imaging/image-decoder';
import type { ImageJob } from '../../src/processing/image-job';
import { ProcessingContext } from '../../src/processing/processing-context';

const CONFIDENT_SCORE = 0.9;

export function makeJob(overrides: Partial<ImageJob> = {}): ImageJob {
  const id = randomUUID();
  const userId = randomUUID();
  return {
    id,
    userId,
    format: ImageFormat.JPEG,
    sizeBytes: IMAGE_RULES.MIN_FILE_BYTES,
    originalKey: `users/${userId}/${id}/original`,
    attempts: 1,
    ...overrides,
  };
}

/** A decoded image whose pixels are irrelevant to the test (dimensions only). */
export function decodedImage(overrides: Partial<DecodedImage> = {}): DecodedImage {
  return {
    working: Buffer.alloc(0),
    originalWidth: 3000,
    originalHeight: 4000,
    workingWidth: 1536,
    workingHeight: 2048,
    ...overrides,
  };
}

export function contextWith(decoded: DecodedImage | null, job: ImageJob = makeJob()): ProcessingContext {
  const context = new ProcessingContext(job, Buffer.alloc(0));
  context.decoded = decoded;
  return context;
}

export function face(box: Box, score = CONFIDENT_SCORE): DetectedFace {
  return { box, score, landmarks: [] };
}

/** FaceDetector that returns canned detections. */
export class FakeFaceDetector implements FaceDetector {
  constructor(private readonly faces: DetectedFace[]) {}

  async detect(): Promise<FaceDetectionResult> {
    return { faces: this.faces, topScore: Math.max(0, ...this.faces.map((detected) => detected.score)) };
  }
}
