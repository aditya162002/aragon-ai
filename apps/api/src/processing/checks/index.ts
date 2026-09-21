import type { FaceDetector } from '../../imaging/face-detector';
import type { ImageDecoder } from '../../imaging/image-decoder';
import { BlurCheck } from './blur-check';
import { DecodeCheck } from './decode-check';
import { FaceCheck } from './face-check';
import { FileSizeCheck } from './file-size-check';
import type { ImageCheck } from './image-check';
import { ResolutionCheck } from './resolution-check';

/**
 * The photo rules in evaluation order: cheapest first, each later check relying on what earlier ones
 * produced (decoded image → faces → face crop). The first failure decides the verdict.
 */
export function createImageChecks(decoder: Pick<ImageDecoder, 'decode'>, detector: FaceDetector): ImageCheck[] {
  return [
    new FileSizeCheck(),
    new DecodeCheck(decoder),
    new ResolutionCheck(),
    new FaceCheck(detector),
    new BlurCheck(),
  ];
}
