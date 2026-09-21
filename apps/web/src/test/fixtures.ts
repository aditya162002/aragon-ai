import { ISO_BMFF, MAGIC_BYTES, UPLOAD_LIMITS, type ImageDto } from '@aragon/shared';
import type { PhotoCardModel } from '../lib/to-card-model';
import type { LocalUpload } from '../lib/uploads-reducer';

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

/** Minimal HEIC header: an ISO-BMFF `ftyp` box with the `heic` major brand. */
const HEIC_HEADER = [
  0, 0, 0, ISO_BMFF.COMPATIBLE_BRANDS_OFFSET + ISO_BMFF.FIELD_LENGTH,
  ...ascii(ISO_BMFF.BOX_TYPE),
  ...ascii('heic'),
  0, 0, 0, 0,
  ...ascii('mif1'),
];

export const HEADERS = {
  JPEG: [...MAGIC_BYTES.JPEG],
  PNG: [...MAGIC_BYTES.PNG],
  HEIC: HEIC_HEADER,
  TEXT: ascii('hello, I am a text file'),
} as const;

/** A file whose content starts with `header`, padded to `size` bytes (a valid size by default). */
export function makeFile(
  name: string,
  header: readonly number[],
  { type = '', size = UPLOAD_LIMITS.MIN_FILE_BYTES }: { type?: string; size?: number } = {},
): File {
  const bytes = new Uint8Array(Math.max(size, header.length));
  bytes.set(header);
  return new File([bytes], name, { type });
}

/** Reports `size` without allocating it (for "too large" checks). */
export function withReportedSize(file: File, size: number): File {
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

export function makeImageDto(overrides: Partial<ImageDto> = {}): ImageDto {
  return {
    id: 'img-1',
    originalName: 'selfie.jpg',
    format: 'JPEG',
    sizeBytes: UPLOAD_LIMITS.MIN_FILE_BYTES,
    status: 'PENDING',
    rejectionReason: null,
    width: null,
    height: null,
    thumbnailUrl: null,
    createdAt: '2026-09-21T10:00:00.000Z',
    processedAt: null,
    ...overrides,
  };
}

export function makeLocalUpload(overrides: Partial<LocalUpload> = {}): LocalUpload {
  return {
    localId: 'local-0',
    file: makeFile('selfie.jpg', HEADERS.JPEG),
    name: 'selfie.jpg',
    format: 'JPEG',
    previewUrl: 'blob:preview-0',
    phase: 'queued',
    progress: 0,
    ...overrides,
  };
}

export function makeCard(overrides: Partial<PhotoCardModel> = {}): PhotoCardModel {
  return {
    id: 'img-1',
    origin: 'server',
    name: 'selfie.jpg',
    status: 'accepted',
    format: 'JPEG',
    previewUrl: null,
    thumbnailUrl: null,
    progress: 100,
    reason: null,
    errorMessage: null,
    ...overrides,
  };
}
