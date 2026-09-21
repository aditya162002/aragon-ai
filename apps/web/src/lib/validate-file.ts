import {
  ACCEPTED_MIME_TYPES,
  IMAGE_FORMATS,
  SNIFF_BYTE_LENGTH,
  UPLOAD_LIMITS,
  detectImageFormat,
  hasAcceptedExtension,
  type ImageFormat,
  type RejectionReason,
} from '@aragon/shared';

/** Identifies a file by its leading bytes; its name and MIME type are client-controlled and never trusted. */
export async function sniffImageFormat(file: Blob): Promise<ImageFormat | null> {
  const header = await file.slice(0, SNIFF_BYTE_LENGTH).arrayBuffer();
  return detectImageFormat(new Uint8Array(header));
}

/**
 * Instant client-side check using the same shared rules as the API, so obviously bad files are
 * never uploaded. Returns why the file is rejected, or null when it may be uploaded.
 * The API re-checks everything; this is feedback, not security.
 */
export async function validateFile(file: File): Promise<RejectionReason | null> {
  // Browsers often report an empty MIME type for HEIC, so a matching extension alone is enough here.
  if (!hasAcceptedExtension(file.name) && !hasAcceptedMimeType(file.type)) return 'UNSUPPORTED_FORMAT';

  let format: ImageFormat | null;
  try {
    format = await sniffImageFormat(file);
  } catch {
    return 'UNREADABLE';
  }
  if (format === null) return 'UNSUPPORTED_FORMAT';

  if (file.size < UPLOAD_LIMITS.MIN_FILE_BYTES) return 'FILE_TOO_SMALL';
  if (file.size > UPLOAD_LIMITS.MAX_FILE_BYTES) return 'FILE_TOO_LARGE';
  return null;
}

function hasAcceptedMimeType(mimeType: string): boolean {
  return IMAGE_FORMATS.some((format) => ACCEPTED_MIME_TYPES[format].includes(mimeType));
}
