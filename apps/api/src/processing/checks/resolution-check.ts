import { IMAGE_RULES } from '../../constants';
import { RejectionReason } from '../../generated/prisma/enums';
import type { ProcessingContext } from '../processing-context';
import { CHECK_PASSED, checkFailed, type CheckOutcome, type ImageCheck } from './image-check';

/** Judges the upright original (not the downscaled working copy) by its shorter side. */
export class ResolutionCheck implements ImageCheck {
  readonly name = 'resolution';

  async run(context: ProcessingContext): Promise<CheckOutcome> {
    const { originalWidth, originalHeight } = context.requireDecoded();
    return Math.min(originalWidth, originalHeight) < IMAGE_RULES.MIN_SHORT_SIDE_PX
      ? checkFailed(RejectionReason.RESOLUTION_TOO_LOW)
      : CHECK_PASSED;
  }
}
