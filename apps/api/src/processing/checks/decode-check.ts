import { RejectionReason } from '../../generated/prisma/enums';
import { UnreadableImageError } from '../../imaging/errors';
import type { ImageDecoder } from '../../imaging/image-decoder';
import type { ProcessingContext } from '../processing-context';
import { CHECK_PASSED, checkFailed, type CheckOutcome, type ImageCheck } from './image-check';

/** Decodes the original into the working image every later check uses. */
export class DecodeCheck implements ImageCheck {
  readonly name = 'decode';

  constructor(private readonly decoder: Pick<ImageDecoder, 'decode'>) {}

  async run(context: ProcessingContext): Promise<CheckOutcome> {
    try {
      context.decoded = await this.decoder.decode(context.original, context.job.format);
      return CHECK_PASSED;
    } catch (error) {
      if (error instanceof UnreadableImageError) return checkFailed(RejectionReason.UNREADABLE);
      throw error;
    }
  }
}
