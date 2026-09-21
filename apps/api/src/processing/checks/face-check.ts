import { FACE_RULES } from '../../constants';
import { RejectionReason } from '../../generated/prisma/enums';
import { boxArea } from '../../imaging/box-geometry';
import type { DetectedFace, FaceDetector } from '../../imaging/face-detector';
import type { DecodedImage } from '../../imaging/image-decoder';
import type { ProcessingContext } from '../processing-context';
import { CHECK_PASSED, checkFailed, type CheckOutcome, type ImageCheck } from './image-check';

/**
 * Exactly one prominent face, large enough in the frame. The largest detection is the subject;
 * much smaller faces (bystanders, posters) are tolerated.
 */
export class FaceCheck implements ImageCheck {
  readonly name = 'face';

  constructor(private readonly detector: FaceDetector) {}

  async run(context: ProcessingContext): Promise<CheckOutcome> {
    const decoded = context.requireDecoded();
    const detection = await this.detector.detect(decoded.working);
    context.faceDetection = detection;

    const mainFace = largestFace(detection.faces);
    if (!mainFace) return checkFailed(RejectionReason.NO_FACE);
    context.mainFace = mainFace;

    if (hasProminentSecondFace(detection.faces, mainFace)) return checkFailed(RejectionReason.MULTIPLE_FACES);
    if (isTooSmall(mainFace, decoded)) return checkFailed(RejectionReason.FACE_TOO_SMALL);
    return CHECK_PASSED;
  }
}

function largestFace(faces: readonly DetectedFace[]): DetectedFace | undefined {
  return faces.reduce<DetectedFace | undefined>(
    (largest, face) => (!largest || boxArea(face.box) > boxArea(largest.box) ? face : largest),
    undefined,
  );
}

function hasProminentSecondFace(faces: readonly DetectedFace[], mainFace: DetectedFace): boolean {
  const minArea = FACE_RULES.MIN_SECONDARY_FACE_AREA_RATIO * boxArea(mainFace.box);
  return faces.some((face) => face !== mainFace && boxArea(face.box) >= minArea);
}

/** Too small relative to the frame, or too few pixels in the original upload. */
function isTooSmall(face: DetectedFace, image: DecodedImage): boolean {
  const heightRatio = face.box.height / image.workingHeight;
  const originalHeightPx = heightRatio * image.originalHeight;
  return heightRatio < FACE_RULES.MIN_FACE_HEIGHT_RATIO || originalHeightPx < FACE_RULES.MIN_FACE_HEIGHT_PX;
}
