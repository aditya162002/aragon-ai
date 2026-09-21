import type { ImageFormat } from '../generated/prisma/enums';

/** An image row claimed from the queue for processing. */
export interface ImageJob {
  id: string;
  userId: string;
  /** Detected from magic bytes by the API. */
  format: ImageFormat;
  sizeBytes: number;
  originalKey: string;
  /**
   * Claim counter after this claim. Doubles as a fencing token: finalizing updates only apply while the
   * row still carries this value, so a worker whose stale lock was re-claimed cannot overwrite the new owner.
   */
  attempts: number;
}
