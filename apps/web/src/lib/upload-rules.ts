/** Upload rules from `@aragon/shared`, shaped for the UI, so copy and pickers never drift from what the API enforces. */
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  BYTES_PER_MEGABYTE,
  IMAGE_FORMATS,
  UPLOAD_LIMITS,
  type ImageFormat,
} from '@aragon/shared';
import type { Accept } from 'react-dropzone';
import { PHOTO_RULES, UI } from '../constants';

const FORMAT_DISPLAY_NAMES: Readonly<Record<ImageFormat, string>> = {
  JPEG: 'JPG',
  PNG: 'PNG',
  HEIC: 'HEIC',
};

/** e.g. "JPG, PNG, or HEIC". */
export const ACCEPTED_FORMATS_LABEL = new Intl.ListFormat(UI.LOCALE, { type: 'disjunction' }).format(
  IMAGE_FORMATS.map((format) => FORMAT_DISPLAY_NAMES[format]),
);

export const MAX_FILE_SIZE_LABEL = `${UPLOAD_LIMITS.MAX_FILE_BYTES / BYTES_PER_MEGABYTE} MB`;

export const MIN_RESOLUTION_LABEL = `${PHOTO_RULES.MIN_SHORT_SIDE_PX} px`;

/**
 * react-dropzone `accept` map (MIME type → extensions). It filters the native file picker; dropped files
 * are validated by `validateFile` instead, because browsers often report an empty MIME type for HEIC.
 */
export const DROPZONE_ACCEPT: Accept = Object.fromEntries(
  IMAGE_FORMATS.flatMap((format) =>
    ACCEPTED_MIME_TYPES[format].map((mimeType) => [mimeType, ACCEPTED_EXTENSIONS[format]]),
  ),
);
