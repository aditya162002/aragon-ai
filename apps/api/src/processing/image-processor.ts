import { STORAGE } from '../constants';
import { computeDHash } from '../imaging/dhash';
import type { ImageDecoder } from '../imaging/image-decoder';
import { imageObjectKeys } from '../storage/image-object-keys';
import type { StorageService } from '../storage/storage.service';
import type { ImageJob } from './image-job';
import type { ImageQueue } from './image-queue';
import { ProcessingContext } from './processing-context';
import type { FinalizeResult, ImageAnalysis } from './processing-result';
import type { ValidationPipeline } from './validation-pipeline';

type VerdictStore = Pick<ImageQueue, 'reject' | 'acceptUnlessDuplicate'>;

/**
 * Processes one claimed image end to end: download, validate, store derivatives, record the verdict.
 * Validation outcomes never throw; only infrastructure failures (storage, database) do, so they can be retried.
 */
export class ImageProcessor {
  constructor(
    private readonly storage: StorageService,
    private readonly pipeline: Pick<ValidationPipeline, 'run'>,
    private readonly decoder: Pick<ImageDecoder, 'createThumbnail'>,
    private readonly queue: VerdictStore,
  ) {}

  async process(job: ImageJob): Promise<FinalizeResult> {
    const original = await this.storage.getObject(job.originalKey);
    const context = new ProcessingContext(job, original);
    const outcome = await this.pipeline.run(context);
    const analysis = await this.storeDerivatives(context);

    if (!outcome.passed) return this.queue.reject(job, outcome.reason, analysis);

    const perceptualHash = await computeDHash(context.requireDecoded().working);
    return this.queue.acceptUnlessDuplicate(job, perceptualHash, analysis);
  }

  /**
   * Uploads the normalised copy and thumbnail whenever the image could be decoded (rejected photos included,
   * so users see what was rejected), and collects the findings to persist. Re-uploads on retry are idempotent.
   */
  private async storeDerivatives(context: ProcessingContext): Promise<ImageAnalysis> {
    const { job, decoded, faceDetection, blurScore } = context;
    const findings = { faces: faceDetection, blurScore };
    if (!decoded) {
      return { ...findings, width: null, height: null, normalizedKey: null, thumbnailKey: null };
    }

    const keys = imageObjectKeys(job.userId, job.id);
    const thumbnail = await this.decoder.createThumbnail(decoded.working);
    await Promise.all([
      this.storage.putObject(keys.normalized, decoded.working, STORAGE.JPEG_CONTENT_TYPE),
      this.storage.putObject(keys.thumbnail, thumbnail, STORAGE.JPEG_CONTENT_TYPE),
    ]);

    return {
      ...findings,
      width: decoded.originalWidth,
      height: decoded.originalHeight,
      normalizedKey: keys.normalized,
      thumbnailKey: keys.thumbnail,
    };
  }
}
