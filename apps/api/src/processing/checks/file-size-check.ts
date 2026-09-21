import { IMAGE_RULES } from '../../constants';
import { RejectionReason } from '../../generated/prisma/enums';
import type { ProcessingContext } from '../processing-context';
import { CHECK_PASSED, checkFailed, type CheckOutcome, type ImageCheck } from './image-check';

/** Tiny files are almost always thumbnails or heavily recompressed copies. */
export class FileSizeCheck implements ImageCheck {
  readonly name = 'file-size';

  async run({ job }: ProcessingContext): Promise<CheckOutcome> {
    return job.sizeBytes < IMAGE_RULES.MIN_FILE_BYTES ? checkFailed(RejectionReason.FILE_TOO_SMALL) : CHECK_PASSED;
  }
}
