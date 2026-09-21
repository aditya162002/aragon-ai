import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DUPLICATE, IMAGE_RULES, QUEUE, WORKER } from '../../src/constants';
import type { Prisma } from '../../src/db';
import { ImageFormat, ImageStatus, RejectionReason } from '../../src/generated/prisma/enums';
import type { ImageJob } from '../../src/processing/image-job';
import { ImageQueue } from '../../src/processing/image-queue';
import type { ImageAnalysis } from '../../src/processing/processing-result';
import { createTestDatabase } from './test-database';

const database = await createTestDatabase();

/** Negative on purpose: hashes are stored as signed BIGINT, so the sign bit must round-trip. */
const HASH = BigInt.asIntN(DUPLICATE.HASH_BITS, 0xf0f0_f0f0_f0f0_f0f0n);
const NEAR_HASH = BigInt.asIntN(DUPLICATE.HASH_BITS, HASH ^ 0b1011n); // 3 bits away
const DISTANT_HASH = BigInt.asIntN(DUPLICATE.HASH_BITS, ~HASH); // every bit differs
const STALE_BY_MS = QUEUE.STALE_LOCK_MS * 2;

const ANALYSIS: ImageAnalysis = {
  width: 3000,
  height: 4000,
  normalizedKey: 'users/u/i/normalized.jpg',
  thumbnailKey: 'users/u/i/thumbnail.jpg',
  blurScore: 250.5,
  faces: { faces: [{ box: { x: 10, y: 20, width: 300, height: 400 }, score: 0.9, landmarks: [[50, 60]] }], topScore: 0.9 },
};

describe.runIf(database)('ImageQueue (PostgreSQL)', () => {
  if (!database) return; // narrows the type; the suite is skipped without a database
  const { prisma } = database;
  const queue = new ImageQueue(prisma);
  let userId: string;

  async function insertImage(overrides: Partial<Prisma.ImageUncheckedCreateInput> = {}) {
    return prisma.image.create({
      data: {
        userId,
        originalName: 'selfie.jpg',
        format: ImageFormat.JPEG,
        sizeBytes: IMAGE_RULES.MIN_FILE_BYTES,
        originalKey: 'users/u/i/original',
        ...overrides,
      },
    });
  }

  async function claimOne(): Promise<ImageJob> {
    const [job] = await queue.claimBatch(1);
    if (!job) throw new Error('expected a claimable row');
    return job;
  }

  const findImage = (id: string) => prisma.image.findUniqueOrThrow({ where: { id } });

  beforeEach(async () => {
    await prisma.image.deleteMany();
    await prisma.user.deleteMany();
    userId = (await prisma.user.create({ data: {} })).id;
  });

  afterAll(() => database.drop());

  describe('claimBatch', () => {
    it('hands every pending row to exactly one of several concurrent claimers', async () => {
      const images = await Promise.all([insertImage(), insertImage(), insertImage()]);

      const batches = await Promise.all([queue.claimBatch(2), queue.claimBatch(2), queue.claimBatch(2)]);
      const claimedIds = batches.flat().map((job) => job.id);

      expect(claimedIds.sort()).toEqual(images.map((image) => image.id).sort());
      await expect(queue.claimBatch(QUEUE.BATCH_SIZE)).resolves.toEqual([]);
    });

    it('marks the row PROCESSING, counts the attempt and returns the job', async () => {
      const image = await insertImage({ format: ImageFormat.HEIC, sizeBytes: 123_456 });

      const job = await claimOne();
      const row = await findImage(image.id);

      expect(job).toEqual({
        id: image.id,
        userId,
        format: ImageFormat.HEIC,
        sizeBytes: 123_456,
        originalKey: image.originalKey,
        attempts: 1,
      });
      expect(row.status).toBe(ImageStatus.PROCESSING);
      expect(row.lockedAt).not.toBeNull();
    });

    it('re-claims a row whose worker died (stale lock) but leaves live locks alone', async () => {
      const stale = await insertImage({
        status: ImageStatus.PROCESSING,
        attempts: 1,
        lockedAt: new Date(Date.now() - STALE_BY_MS),
      });
      await insertImage({ status: ImageStatus.PROCESSING, attempts: 1, lockedAt: new Date() });

      const jobs = await queue.claimBatch(QUEUE.BATCH_SIZE);

      expect(jobs.map((job) => [job.id, job.attempts])).toEqual([[stale.id, 2]]);
    });
  });

  describe('failExhausted', () => {
    it('fails rows that used every attempt instead of claiming them again', async () => {
      const exhausted = await insertImage({ attempts: QUEUE.MAX_ATTEMPTS });

      await expect(queue.claimBatch(QUEUE.BATCH_SIZE)).resolves.toEqual([]);
      await expect(queue.failExhausted()).resolves.toBe(1);

      const row = await findImage(exhausted.id);
      expect(row).toMatchObject({ status: ImageStatus.FAILED, lastError: WORKER.EXHAUSTED_ERROR_MESSAGE });
      expect(row.processedAt).not.toBeNull();
    });
  });

  describe('reject', () => {
    it('records the reason and the analysis', async () => {
      const image = await insertImage();
      const job = await claimOne();

      const result = await queue.reject(job, RejectionReason.BLURRY, ANALYSIS);
      const row = await findImage(image.id);

      expect(result).toEqual({ verdict: { status: ImageStatus.REJECTED, reason: RejectionReason.BLURRY }, recorded: true });
      expect(row).toMatchObject({
        status: ImageStatus.REJECTED,
        rejectionReason: RejectionReason.BLURRY,
        width: ANALYSIS.width,
        height: ANALYSIS.height,
        thumbnailKey: ANALYSIS.thumbnailKey,
        blurScore: ANALYSIS.blurScore,
        faces: ANALYSIS.faces,
        lockedAt: null,
      });
      expect(row.processedAt).not.toBeNull();
    });

    it('ignores a verdict from a claim that has since been superseded (fencing)', async () => {
      const image = await insertImage();
      const firstClaim = await claimOne();
      await prisma.image.update({ where: { id: image.id }, data: { lockedAt: new Date(Date.now() - STALE_BY_MS) } });
      const secondClaim = await claimOne();

      await expect(queue.reject(firstClaim, RejectionReason.NO_FACE, ANALYSIS)).resolves.toMatchObject({ recorded: false });
      expect((await findImage(image.id)).status).toBe(ImageStatus.PROCESSING);

      await expect(queue.reject(secondClaim, RejectionReason.NO_FACE, ANALYSIS)).resolves.toMatchObject({ recorded: true });
    });
  });

  describe('acceptUnlessDuplicate', () => {
    it('rejects a near-identical photo as DUPLICATE and accepts a distinct one', async () => {
      await insertImage({ status: ImageStatus.ACCEPTED, perceptualHash: HASH });
      const near = await insertImage();
      const distant = await insertImage();
      const jobs = await queue.claimBatch(QUEUE.BATCH_SIZE);
      const jobFor = (id: string) => jobs.find((job) => job.id === id) as ImageJob;

      const nearResult = await queue.acceptUnlessDuplicate(jobFor(near.id), NEAR_HASH, ANALYSIS);
      const distantResult = await queue.acceptUnlessDuplicate(jobFor(distant.id), DISTANT_HASH, ANALYSIS);

      expect(nearResult.verdict).toEqual({ status: ImageStatus.REJECTED, reason: RejectionReason.DUPLICATE });
      expect(distantResult.verdict).toEqual({ status: ImageStatus.ACCEPTED });
      expect(await findImage(near.id)).toMatchObject({
        status: ImageStatus.REJECTED,
        rejectionReason: RejectionReason.DUPLICATE,
        perceptualHash: NEAR_HASH,
      });
      expect(await findImage(distant.id)).toMatchObject({ status: ImageStatus.ACCEPTED, perceptualHash: DISTANT_HASH });
    });

    it('accepts only one of two near-identical photos finalized concurrently', async () => {
      await Promise.all([insertImage(), insertImage()]);
      const [first, second] = await queue.claimBatch(QUEUE.BATCH_SIZE);

      const results = await Promise.all([
        queue.acceptUnlessDuplicate(first, HASH, ANALYSIS),
        queue.acceptUnlessDuplicate(second, NEAR_HASH, ANALYSIS),
      ]);

      expect(results.map((result) => result.verdict.status).sort()).toEqual([ImageStatus.ACCEPTED, ImageStatus.REJECTED]);
    });
  });

  describe('releaseForRetry', () => {
    it('returns the row to PENDING with the error message', async () => {
      const image = await insertImage();
      const job = await claimOne();

      await expect(queue.releaseForRetry(job, new Error('S3 timed out'))).resolves.toBe(ImageStatus.PENDING);
      expect(await findImage(image.id)).toMatchObject({ status: ImageStatus.PENDING, lastError: 'S3 timed out', lockedAt: null });
    });

    it('fails the row on its last attempt, truncating long errors', async () => {
      const image = await insertImage({ attempts: QUEUE.MAX_ATTEMPTS - 1 });
      const job = await claimOne();

      await expect(queue.releaseForRetry(job, new Error('x'.repeat(QUEUE.MAX_ERROR_MESSAGE_LENGTH * 2)))).resolves.toBe(
        ImageStatus.FAILED,
      );
      const row = await findImage(image.id);
      expect(row.status).toBe(ImageStatus.FAILED);
      expect(row.lastError).toHaveLength(QUEUE.MAX_ERROR_MESSAGE_LENGTH);
    });
  });
});
