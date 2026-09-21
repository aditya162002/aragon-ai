import { describe, expect, it, vi } from 'vitest';
import { STORAGE } from '../../src/constants';
import { RejectionReason } from '../../src/generated/prisma/enums';
import { computeDHash } from '../../src/imaging/dhash';
import { CHECK_PASSED, checkFailed, type CheckOutcome } from '../../src/processing/checks/image-check';
import type { ImageJob } from '../../src/processing/image-job';
import { ImageProcessor } from '../../src/processing/image-processor';
import type { ProcessingContext } from '../../src/processing/processing-context';
import { ACCEPTED, rejected, type ImageAnalysis } from '../../src/processing/processing-result';
import { imageObjectKeys } from '../../src/storage/image-object-keys';
import type { StorageService } from '../../src/storage/storage.service';
import { gradientImage } from '../fixtures/synthetic-images';
import { decodedImage, makeJob } from './test-doubles';

const THUMBNAIL = Buffer.from('thumbnail-bytes');
const ORIGINAL = Buffer.from('original-bytes');
const IMAGE = { width: 640, height: 480 };

function setUp(options: { outcome: CheckOutcome; decode: boolean; getObject?: StorageService['getObject'] }) {
  const job = makeJob();
  const storage = {
    getObject: vi.fn(options.getObject ?? (async () => ORIGINAL)),
    putObject: vi.fn(async () => undefined),
    deleteObjects: vi.fn(),
    getSignedReadUrl: vi.fn(),
    ensureBucket: vi.fn(),
  } satisfies StorageService;
  let working = Buffer.alloc(0);
  const pipeline = {
    run: vi.fn(async (context: ProcessingContext) => {
      if (options.decode) {
        working = await gradientImage(IMAGE.width, IMAGE.height).jpeg().toBuffer();
        context.decoded = decodedImage({ working, workingWidth: IMAGE.width, workingHeight: IMAGE.height });
      }
      return options.outcome;
    }),
  };
  const queue = {
    reject: vi.fn(async (_job: ImageJob, reason: RejectionReason) => ({ verdict: rejected(reason), recorded: true })),
    acceptUnlessDuplicate: vi.fn(async () => ({ verdict: ACCEPTED, recorded: true })),
  };
  const decoder = { createThumbnail: vi.fn(async () => THUMBNAIL) };
  const processor = new ImageProcessor(storage, pipeline, decoder, queue);
  return { job, storage, pipeline, queue, processor, working: () => working };
}

describe('ImageProcessor', () => {
  it('rejects an undecodable image without storing derivatives', async () => {
    const { job, storage, queue, processor } = setUp({ outcome: checkFailed(RejectionReason.UNREADABLE), decode: false });

    await processor.process(job);

    expect(storage.getObject).toHaveBeenCalledWith(job.originalKey);
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(queue.reject).toHaveBeenCalledWith(job, RejectionReason.UNREADABLE, {
      width: null,
      height: null,
      normalizedKey: null,
      thumbnailKey: null,
      blurScore: null,
      faces: null,
    } satisfies ImageAnalysis);
  });

  it('still stores the normalised copy and thumbnail of a decoded photo that is rejected later', async () => {
    const { job, storage, queue, processor, working } = setUp({ outcome: checkFailed(RejectionReason.NO_FACE), decode: true });
    const keys = imageObjectKeys(job.userId, job.id);

    const result = await processor.process(job);

    expect(result.verdict).toEqual(rejected(RejectionReason.NO_FACE));
    expect(storage.putObject).toHaveBeenCalledWith(keys.normalized, working(), STORAGE.JPEG_CONTENT_TYPE);
    expect(storage.putObject).toHaveBeenCalledWith(keys.thumbnail, THUMBNAIL, STORAGE.JPEG_CONTENT_TYPE);
    expect(queue.reject).toHaveBeenCalledWith(
      job,
      RejectionReason.NO_FACE,
      expect.objectContaining({ normalizedKey: keys.normalized, thumbnailKey: keys.thumbnail }),
    );
    expect(queue.acceptUnlessDuplicate).not.toHaveBeenCalled();
  });

  it('hands a photo that passed every check to the duplicate-aware accept, with its perceptual hash', async () => {
    const { job, queue, processor, working } = setUp({ outcome: CHECK_PASSED, decode: true });

    const result = await processor.process(job);

    expect(result.verdict).toEqual(ACCEPTED);
    expect(queue.acceptUnlessDuplicate).toHaveBeenCalledWith(
      job,
      await computeDHash(working()),
      expect.objectContaining({ width: decodedImage().originalWidth, height: decodedImage().originalHeight }),
    );
    expect(queue.reject).not.toHaveBeenCalled();
  });

  it('lets infrastructure errors propagate so the worker can retry', async () => {
    const { job, queue, processor } = setUp({
      outcome: CHECK_PASSED,
      decode: true,
      getObject: async () => {
        throw new Error('storage unavailable');
      },
    });

    await expect(processor.process(job)).rejects.toThrow('storage unavailable');
    expect(queue.reject).not.toHaveBeenCalled();
    expect(queue.acceptUnlessDuplicate).not.toHaveBeenCalled();
  });
});
