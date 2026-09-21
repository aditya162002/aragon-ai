/**
 * Upload rules shared by the browser (instant feedback) and the API (authoritative checks).
 * Keeping them in one place guarantees both sides enforce identical limits.
 */

export const BYTES_PER_KILOBYTE = 1024;
export const BYTES_PER_MEGABYTE = 1024 * BYTES_PER_KILOBYTE;

export const UPLOAD_LIMITS = {
  /** Files smaller than this are almost always heavily compressed or tiny thumbnails. */
  MIN_FILE_BYTES: 50 * BYTES_PER_KILOBYTE,
  /** Hard cap enforced by the upload middleware; covers 48 MP phone photos. */
  MAX_FILE_BYTES: 20 * BYTES_PER_MEGABYTE,
} as const;

/** How many accepted photos the user is asked for (drives the progress bar). */
export const TARGET_ACCEPTED_PHOTOS = 10;

export const IMAGE_FORMATS = ['JPEG', 'PNG', 'HEIC'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const ACCEPTED_EXTENSIONS: Readonly<Record<ImageFormat, readonly string[]>> = {
  JPEG: ['.jpg', '.jpeg'],
  PNG: ['.png'],
  HEIC: ['.heic', '.heif'],
};

export const ACCEPTED_MIME_TYPES: Readonly<Record<ImageFormat, readonly string[]>> = {
  JPEG: ['image/jpeg'],
  PNG: ['image/png'],
  HEIC: ['image/heic', 'image/heif'],
};

/** Leading bytes needed to identify every supported format (covers a full ISO-BMFF `ftyp` box). */
export const SNIFF_BYTE_LENGTH = 64;

export const MAGIC_BYTES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
} as const;

/** Layout of the ISO-BMFF `ftyp` box that starts every HEIC/HEIF/AVIF file. */
export const ISO_BMFF = {
  BOX_TYPE: 'ftyp',
  BOX_SIZE_OFFSET: 0,
  BOX_TYPE_OFFSET: 4,
  MAJOR_BRAND_OFFSET: 8,
  /** Major brand (4 bytes) + minor version (4 bytes) precede the compatible-brand list. */
  COMPATIBLE_BRANDS_OFFSET: 16,
  FIELD_LENGTH: 4,
} as const;

/** HEVC-coded HEIF brands (image + sequence). `mif1`/`msf1` alone are generic and also used by AVIF. */
export const HEIC_BRANDS: readonly string[] = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs'];
