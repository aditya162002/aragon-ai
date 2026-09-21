import { BYTES_PER_KILOBYTE, BYTES_PER_MEGABYTE, UPLOAD_LIMITS } from './constants';

/**
 * Every reason a photo can be rejected. The first two are decided before upload (browser/API),
 * the rest by the processing worker. Codes are stable; messages are what the user sees.
 */
export const REJECTION_REASONS = [
  'UNSUPPORTED_FORMAT',
  'FILE_TOO_LARGE',
  'FILE_TOO_SMALL',
  'UNREADABLE',
  'RESOLUTION_TOO_LOW',
  'NO_FACE',
  'MULTIPLE_FACES',
  'FACE_TOO_SMALL',
  'BLURRY',
  'DUPLICATE',
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

export const REJECTION_MESSAGES: Readonly<Record<RejectionReason, string>> = {
  UNSUPPORTED_FORMAT: 'Only JPG, PNG or HEIC photos are supported.',
  FILE_TOO_LARGE: `File is too large (max ${UPLOAD_LIMITS.MAX_FILE_BYTES / BYTES_PER_MEGABYTE} MB).`,
  FILE_TOO_SMALL: `File is too small (min ${UPLOAD_LIMITS.MIN_FILE_BYTES / BYTES_PER_KILOBYTE} KB). Use the original photo.`,
  UNREADABLE: 'This file is damaged or could not be read.',
  RESOLUTION_TOO_LOW: 'Resolution is too low. Use a sharper, higher-resolution photo.',
  NO_FACE: 'No face detected. Make sure your face is clearly visible.',
  MULTIPLE_FACES: 'More than one face detected. Only you should be in the photo.',
  FACE_TOO_SMALL: 'Your face is too small in the frame. Move closer to the camera.',
  BLURRY: 'Photo is blurry. Hold the camera steady and make sure your face is in focus.',
  DUPLICATE: 'Too similar to a photo you already uploaded.',
};

/** Short badge text shown on rejected thumbnails. */
export const REJECTION_LABELS: Readonly<Record<RejectionReason, string>> = {
  UNSUPPORTED_FORMAT: 'Unsupported format',
  FILE_TOO_LARGE: 'File too large',
  FILE_TOO_SMALL: 'File too small',
  UNREADABLE: 'Unreadable',
  RESOLUTION_TOO_LOW: 'Low resolution',
  NO_FACE: 'No face',
  MULTIPLE_FACES: 'Multiple faces',
  FACE_TOO_SMALL: 'Face too small',
  BLURRY: 'Blurry',
  DUPLICATE: 'Duplicate',
};
