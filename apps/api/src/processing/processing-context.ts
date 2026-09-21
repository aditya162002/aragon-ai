import type { DetectedFace, FaceDetectionResult } from '../imaging/face-detector';
import type { DecodedImage } from '../imaging/image-decoder';
import type { ImageJob } from './image-job';

/**
 * State shared by the checks of one validation run. Each check reads what earlier checks produced and
 * records its own findings, which are persisted with the verdict even when a later check rejects the photo.
 */
export class ProcessingContext {
  decoded: DecodedImage | null = null;
  faceDetection: FaceDetectionResult | null = null;
  mainFace: DetectedFace | null = null;
  blurScore: number | null = null;

  constructor(
    readonly job: ImageJob,
    readonly original: Buffer,
  ) {}

  /** The decoded image; throws when called before DecodeCheck ran (a pipeline wiring bug). */
  requireDecoded(): DecodedImage {
    if (!this.decoded) throw new Error('Pipeline misconfigured: image has not been decoded yet');
    return this.decoded;
  }

  /** The main face; throws when called before FaceCheck found one (a pipeline wiring bug). */
  requireMainFace(): DetectedFace {
    if (!this.mainFace) throw new Error('Pipeline misconfigured: no main face has been selected yet');
    return this.mainFace;
  }
}
