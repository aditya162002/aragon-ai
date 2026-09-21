import type { ImageFormat } from '@aragon/shared';
import { PERCENT, UPLOADS } from '../constants';
import type { LocalUpload } from './uploads-reducer';
import { sniffImageFormat, validateFile } from './validate-file';

/** Validates a picked/dropped file and turns it into a queued (or client-rejected) upload. */
export async function createLocalUpload(file: File, localId: string): Promise<LocalUpload> {
  const [reason, format] = await Promise.all([validateFile(file), sniffImageFormat(file).catch(() => null)]);
  return {
    localId,
    file,
    name: file.name,
    format,
    previewUrl: isPreviewable(format) ? URL.createObjectURL(file) : null,
    phase: reason === null ? 'queued' : 'rejected',
    progress: PERCENT.MIN,
    reason: reason ?? undefined,
  };
}

function isPreviewable(format: ImageFormat | null): boolean {
  return format !== null && UPLOADS.PREVIEWABLE_FORMATS.includes(format);
}
