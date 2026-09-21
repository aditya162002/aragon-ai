import { BLUR } from '../../constants';
import { RejectionReason } from '../../generated/prisma/enums';
import { measureFaceSharpness } from '../../imaging/face-sharpness';
import type { ProcessingContext } from '../processing-context';
import { CHECK_PASSED, checkFailed, type CheckOutcome, type ImageCheck } from './image-check';

/** Measures sharpness on the face only, so a deliberately blurred background (portrait mode) is fine. */
export class BlurCheck implements ImageCheck {
  readonly name = 'blur';

  async run(context: ProcessingContext): Promise<CheckOutcome> {
    const { working, workingWidth, workingHeight } = context.requireDecoded();
    const face = context.requireMainFace();

    const blurScore = await measureFaceSharpness(working, { width: workingWidth, height: workingHeight }, face.box);
    context.blurScore = blurScore;
    return blurScore < BLUR.MIN_LAPLACIAN_VARIANCE ? checkFailed(RejectionReason.BLURRY) : CHECK_PASSED;
  }
}
