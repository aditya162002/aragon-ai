import { describe, expect, it, vi } from 'vitest';
import { QUEUE } from '../../src/constants';
import { ImageStatus, RejectionReason } from '../../src/generated/prisma/enums';
import type { ImageJob } from '../../src/processing/image-job';
import { ACCEPTED, rejected, type FinalizeResult } from '../../src/processing/processing-result';
import { ProcessingWorker } from '../../src/processing/processing-worker';
import { makeJob } from './test-doubles';

function setUp(options: { batches?: ImageJob[][]; process?: (job: ImageJob) => Promise<FinalizeResult> } = {}) {
  const batches = [...(options.batches ?? [])];
  const queue = {
    failExhausted: vi.fn(async () => 0),
    claimBatch: vi.fn(async () => batches.shift() ?? []),
    releaseForRetry: vi.fn(async () => ImageStatus.PENDING as typeof ImageStatus.PENDING),
  };
  const processor = { process: vi.fn(options.process ?? (async () => ({ verdict: ACCEPTED, recorded: true }))) };
  const logger = { info: vi.fn(), error: vi.fn() };
  return { queue, processor, logger, worker: new ProcessingWorker(queue, processor, logger) };
}

describe('ProcessingWorker.runOnce', () => {
  it('processes every claimed image and logs one line per image', async () => {
    const jobs = [makeJob(), makeJob()];
    const { queue, processor, logger, worker } = setUp({
      batches: [jobs],
      process: async (job) => (job === jobs[0] ? { verdict: ACCEPTED, recorded: true } : { verdict: rejected(RejectionReason.BLURRY), recorded: true }),
    });

    await expect(worker.runOnce()).resolves.toBe(jobs.length);

    expect(queue.claimBatch).toHaveBeenCalledWith(QUEUE.BATCH_SIZE);
    expect(processor.process).toHaveBeenCalledTimes(jobs.length);
    expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`${jobs[0].id} ACCEPTED`)));
    expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`${jobs[1].id} REJECTED \\(BLURRY\\)`)));
  });

  it('releases a failing image for retry without affecting the rest of the batch', async () => {
    const [failing, healthy] = [makeJob(), makeJob()];
    const error = new Error('S3 unavailable');
    const { queue, logger, worker } = setUp({
      batches: [[failing, healthy]],
      process: async (job) => {
        if (job === failing) throw error;
        return { verdict: ACCEPTED, recorded: true };
      },
    });

    await worker.runOnce();

    expect(queue.releaseForRetry).toHaveBeenCalledExactlyOnceWith(failing, error);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('S3 unavailable'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`${healthy.id} ACCEPTED`));
  });

  it('logs and survives a database outage while claiming', async () => {
    const { queue, logger, worker } = setUp();
    queue.claimBatch.mockRejectedValueOnce(new Error('connection refused'));

    await expect(worker.runOnce()).resolves.toBe(0);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('connection refused'));
  });
});

describe('ProcessingWorker.start/stop', () => {
  it('interrupts the idle wait on stop instead of sleeping out the poll interval', async () => {
    const { queue, worker } = setUp();
    worker.start();
    await vi.waitFor(() => expect(queue.claimBatch).toHaveBeenCalled());

    const stoppedAt = performance.now();
    await worker.stop();

    expect(performance.now() - stoppedAt).toBeLessThan(QUEUE.POLL_INTERVAL_MS);
  });

  it('waits for the in-flight batch before resolving stop', async () => {
    let finish: (result: FinalizeResult) => void = () => undefined;
    const { processor, worker } = setUp({
      batches: [[makeJob()]],
      process: () => new Promise<FinalizeResult>((resolve) => (finish = resolve)),
    });
    worker.start();
    await vi.waitFor(() => expect(processor.process).toHaveBeenCalled());

    let stopped = false;
    const stopping = worker.stop().then(() => (stopped = true));
    await Promise.resolve();
    expect(stopped).toBe(false);

    finish({ verdict: ACCEPTED, recorded: true });
    await stopping;
    expect(stopped).toBe(true);
  });
});
