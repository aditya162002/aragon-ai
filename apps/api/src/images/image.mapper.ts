import type { ImageDto } from '@aragon/shared';
import type { Prisma } from '../db';

/** Columns an `ImageDto` is built from: internal fields (hashes, errors, lock state) are never loaded. */
export const IMAGE_DTO_SELECT = {
  id: true,
  originalName: true,
  format: true,
  sizeBytes: true,
  status: true,
  rejectionReason: true,
  width: true,
  height: true,
  thumbnailKey: true,
  createdAt: true,
  processedAt: true,
} as const satisfies Prisma.ImageSelect;

export type ImageDtoSource = Prisma.ImageGetPayload<{ select: typeof IMAGE_DTO_SELECT }>;

/** Maps a database row to the public DTO. Storage keys stay server-side; only a signed URL goes out. */
export function toImageDto(image: ImageDtoSource, thumbnailUrl: string | null): ImageDto {
  return {
    id: image.id,
    originalName: image.originalName,
    format: image.format,
    sizeBytes: image.sizeBytes,
    status: image.status,
    rejectionReason: image.rejectionReason,
    width: image.width,
    height: image.height,
    thumbnailUrl,
    createdAt: image.createdAt.toISOString(),
    processedAt: image.processedAt?.toISOString() ?? null,
  };
}
