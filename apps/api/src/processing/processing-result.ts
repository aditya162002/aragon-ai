import { ImageStatus, type RejectionReason } from '../generated/prisma/enums';
import type { FaceDetectionResult } from '../imaging/face-detector';

export type Verdict =
  | { status: typeof ImageStatus.ACCEPTED }
  | { status: typeof ImageStatus.REJECTED; reason: RejectionReason };

export const ACCEPTED: Verdict = { status: ImageStatus.ACCEPTED };

export function rejected(reason: RejectionReason): Verdict {
  return { status: ImageStatus.REJECTED, reason };
}

/** Findings persisted with the verdict. Null when the photo was rejected before the step that produces them. */
export interface ImageAnalysis {
  /** Upright dimensions of the original upload. */
  width: number | null;
  height: number | null;
  normalizedKey: string | null;
  thumbnailKey: string | null;
  blurScore: number | null;
  faces: FaceDetectionResult | null;
}

export interface FinalizeResult {
  verdict: Verdict;
  /** False when the row was no longer ours (its lock went stale and another worker re-claimed it). */
  recorded: boolean;
}
