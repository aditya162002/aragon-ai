import type { ImageFormat } from './constants';
import type { RejectionReason } from './rejections';

export const IMAGE_STATUSES = ['PENDING', 'PROCESSING', 'ACCEPTED', 'REJECTED', 'FAILED'] as const;
export type ImageStatus = (typeof IMAGE_STATUSES)[number];

/** Statuses that mean "the worker has not produced a verdict yet" (the UI keeps polling). */
export const IN_FLIGHT_STATUSES: readonly ImageStatus[] = ['PENDING', 'PROCESSING'];

export function isInFlight(status: ImageStatus): boolean {
  return IN_FLIGHT_STATUSES.includes(status);
}

/** Public representation of an uploaded image. Storage keys are never exposed. */
export interface ImageDto {
  id: string;
  originalName: string;
  format: ImageFormat;
  sizeBytes: number;
  status: ImageStatus;
  rejectionReason: RejectionReason | null;
  width: number | null;
  height: number | null;
  /** Short-lived signed URL of a JPEG thumbnail; null until the worker has produced one. */
  thumbnailUrl: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface ImageListResponse {
  items: ImageDto[];
  nextCursor: string | null;
}

/** Error envelope returned by every failed API request. `code` is machine-readable. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
