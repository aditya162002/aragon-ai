import { DUPLICATE, QUEUE, WORKER } from '../constants';
import type { PrismaClient } from '../db';
import { Prisma } from '../generated/prisma/client';
import { ImageStatus, RejectionReason, type ImageFormat } from '../generated/prisma/enums';
import { describeError } from './describe-error';
import type { ImageJob } from './image-job';
import { ACCEPTED, rejected, type FinalizeResult, type ImageAnalysis, type Verdict } from './processing-result';

type ClaimedRow = {
  id: string;
  user_id: string;
  format: ImageFormat;
  size_bytes: number;
  original_key: string;
  attempts: number;
};

type RetryStatus = typeof ImageStatus.PENDING | typeof ImageStatus.FAILED;

/** Rows waiting for a worker: new uploads, plus rows whose worker died (lock older than STALE_LOCK_MS, DB clock). */
const AWAITING_WORKER = Prisma.sql`(
  status = 'PENDING'
  OR (status = 'PROCESSING' AND locked_at < now() - ${QUEUE.STALE_LOCK_MS}::integer * interval '1 millisecond')
)`;

/** Hashes are compared as fixed-width bit strings so `bit_count(a # b)` yields the Hamming distance. */
const HASH_BIT_STRING = Prisma.raw(`bit(${DUPLICATE.HASH_BITS})`);

/**
 * The `images` table used as a work queue. Claims use FOR UPDATE SKIP LOCKED so concurrent workers never
 * take the same row; delivery is at-least-once, and every finalizing update is guarded by
 * (status = PROCESSING, attempts = claim's attempts) so replays and stale workers cannot overwrite a verdict.
 * Raw SQL is used where Prisma's query API cannot express the statement (row locking, DB clock, bit ops).
 */
export class ImageQueue {
  constructor(private readonly prisma: PrismaClient) {}

  /** Atomically moves up to `limit` of the oldest waiting rows to PROCESSING and returns them. */
  async claimBatch(limit: number): Promise<ImageJob[]> {
    const rows = await this.prisma.$queryRaw<ClaimedRow[]>`
      UPDATE images
      SET status = 'PROCESSING', attempts = attempts + 1, locked_at = now(), updated_at = now()
      WHERE id IN (
        SELECT id FROM images
        WHERE ${AWAITING_WORKER} AND attempts < ${QUEUE.MAX_ATTEMPTS}
        ORDER BY created_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, user_id, format, size_bytes, original_key, attempts`;
    return rows.map(toImageJob);
  }

  /** Marks rows that used up every attempt without a verdict (e.g. the worker kept crashing) as FAILED. */
  failExhausted(): Promise<number> {
    return this.prisma.$executeRaw`
      UPDATE images
      SET status = 'FAILED', locked_at = NULL, processed_at = now(), updated_at = now(),
          last_error = COALESCE(last_error, ${WORKER.EXHAUSTED_ERROR_MESSAGE})
      WHERE ${AWAITING_WORKER} AND attempts >= ${QUEUE.MAX_ATTEMPTS}`;
  }

  async reject(job: ImageJob, reason: RejectionReason, analysis: ImageAnalysis): Promise<FinalizeResult> {
    const verdict = rejected(reason);
    return { verdict, recorded: await finalize(this.prisma, job, verdict, analysis, null) };
  }

  /**
   * Accepts the photo unless the user already has an accepted near-duplicate. Runs under a per-user
   * advisory lock so two near-identical photos processed concurrently cannot both be accepted.
   */
  acceptUnlessDuplicate(job: ImageJob, perceptualHash: bigint, analysis: ImageAnalysis): Promise<FinalizeResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${job.userId}))`;
      const [duplicate] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM images
        WHERE user_id = ${job.userId}::uuid
          AND status = 'ACCEPTED'
          AND id <> ${job.id}::uuid
          AND perceptual_hash IS NOT NULL
          AND bit_count((perceptual_hash # ${perceptualHash}::bigint)::${HASH_BIT_STRING}) <= ${DUPLICATE.MAX_HAMMING_DISTANCE}
        LIMIT 1`;

      const verdict = duplicate ? rejected(RejectionReason.DUPLICATE) : ACCEPTED;
      return { verdict, recorded: await finalize(tx, job, verdict, analysis, perceptualHash) };
    });
  }

  /** Hands the row back after an infrastructure error; FAILED once all attempts are used. */
  async releaseForRetry(job: ImageJob, error: unknown): Promise<RetryStatus> {
    const exhausted = job.attempts >= QUEUE.MAX_ATTEMPTS;
    const status = exhausted ? ImageStatus.FAILED : ImageStatus.PENDING;
    await this.prisma.image.updateMany({
      where: ownedBy(job),
      data: {
        status,
        lastError: describeError(error).slice(0, QUEUE.MAX_ERROR_MESSAGE_LENGTH),
        lockedAt: null,
        processedAt: exhausted ? new Date() : undefined,
      },
    });
    return status;
  }
}

/** Matches the row only while it is still held by this claim. */
function ownedBy(job: ImageJob): Prisma.ImageWhereInput {
  return { id: job.id, status: ImageStatus.PROCESSING, attempts: job.attempts };
}

async function finalize(
  client: Prisma.TransactionClient,
  job: ImageJob,
  verdict: Verdict,
  analysis: ImageAnalysis,
  perceptualHash: bigint | null,
): Promise<boolean> {
  const { count } = await client.image.updateMany({
    where: ownedBy(job),
    data: {
      ...analysis,
      faces: analysis.faces ?? Prisma.DbNull,
      perceptualHash,
      status: verdict.status,
      rejectionReason: verdict.status === ImageStatus.REJECTED ? verdict.reason : null,
      lockedAt: null,
      lastError: null,
      processedAt: new Date(),
    },
  });
  return count > 0;
}

function toImageJob(row: ClaimedRow): ImageJob {
  return {
    id: row.id,
    userId: row.user_id,
    format: row.format,
    sizeBytes: row.size_bytes,
    originalKey: row.original_key,
    attempts: row.attempts,
  };
}
