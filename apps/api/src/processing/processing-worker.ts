import { setTimeout as sleep } from 'node:timers/promises';
import { QUEUE } from '../constants';
import { ImageStatus } from '../generated/prisma/enums';
import { describeError } from './describe-error';
import type { ImageJob } from './image-job';
import type { ImageProcessor } from './image-processor';
import type { ImageQueue } from './image-queue';
import type { FinalizeResult } from './processing-result';

type WorkQueue = Pick<ImageQueue, 'claimBatch' | 'failExhausted' | 'releaseForRetry'>;
export type WorkerLogger = Pick<Console, 'info' | 'error'>;

const LOG_PREFIX = '[worker]';

/**
 * Polling loop: claim a batch, process it concurrently, repeat; sleep when the queue is empty.
 * Stopping lets the in-flight batch finish, so no claimed row is abandoned mid-way on a clean shutdown.
 */
export class ProcessingWorker {
  private readonly stopController = new AbortController();
  private loop: Promise<void> | null = null;

  constructor(
    private readonly queue: WorkQueue,
    private readonly processor: Pick<ImageProcessor, 'process'>,
    private readonly logger: WorkerLogger = console,
  ) {}

  start(): void {
    this.loop ??= this.runLoop();
  }

  /** Stops polling and resolves once the current batch has been recorded. */
  async stop(): Promise<void> {
    this.stopController.abort();
    await this.loop;
  }

  /** Claims and processes one batch; returns how many images were claimed. */
  async runOnce(): Promise<number> {
    let jobs: ImageJob[];
    try {
      await this.queue.failExhausted();
      jobs = await this.queue.claimBatch(QUEUE.BATCH_SIZE);
    } catch (error) {
      this.logger.error(`${LOG_PREFIX} could not claim images: ${describeError(error)}`);
      return 0;
    }

    await Promise.allSettled(jobs.map((job) => this.processJob(job)));
    return jobs.length;
  }

  private async runLoop(): Promise<void> {
    while (!this.stopController.signal.aborted) {
      const claimed = await this.runOnce();
      if (claimed === 0) await this.idle();
    }
  }

  /** Never rejects: failures are handed back to the queue for another attempt. */
  private async processJob(job: ImageJob): Promise<void> {
    const startedAt = performance.now();
    const took = () => `${Math.round(performance.now() - startedAt)}ms`;
    try {
      const result = await this.processor.process(job);
      this.logger.info(`${LOG_PREFIX} ${job.id} ${describeResult(result)} in ${took()}`);
    } catch (error) {
      const next = await this.releaseForRetry(job, error);
      this.logger.error(`${LOG_PREFIX} ${job.id} failed in ${took()} (attempt ${job.attempts}, ${next}): ${describeError(error)}`);
    }
  }

  /** Returns what happens to the row next, for the log line. */
  private async releaseForRetry(job: ImageJob, error: unknown): Promise<string> {
    try {
      const status = await this.queue.releaseForRetry(job, error);
      return status === ImageStatus.FAILED ? 'giving up' : 'will retry';
    } catch (releaseError) {
      // The row stays PROCESSING and is re-claimed once its lock goes stale.
      return `release failed (${describeError(releaseError)}), will retry after the lock goes stale`;
    }
  }

  private async idle(): Promise<void> {
    try {
      await sleep(QUEUE.POLL_INTERVAL_MS, undefined, { signal: this.stopController.signal });
    } catch (error) {
      if (!this.stopController.signal.aborted) throw error;
    }
  }
}

function describeResult({ verdict, recorded }: FinalizeResult): string {
  const label = verdict.status === ImageStatus.REJECTED ? `${verdict.status} (${verdict.reason})` : verdict.status;
  return recorded ? label : `${label}, not recorded: row was re-claimed by another worker`;
}
