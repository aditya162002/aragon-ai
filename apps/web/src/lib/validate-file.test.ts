import { UPLOAD_LIMITS } from '@aragon/shared';
import { describe, expect, it } from 'vitest';
import { HEADERS, makeFile, withReportedSize } from '../test/fixtures';
import { sniffImageFormat, validateFile } from './validate-file';

describe('validateFile', () => {
  it('accepts a real JPEG and PNG within the size limits', async () => {
    expect(await validateFile(makeFile('selfie.jpg', HEADERS.JPEG, { type: 'image/jpeg' }))).toBeNull();
    expect(await validateFile(makeFile('selfie.png', HEADERS.PNG, { type: 'image/png' }))).toBeNull();
  });

  it('rejects a file whose extension and MIME type are both unsupported', async () => {
    const file = makeFile('notes.txt', HEADERS.JPEG, { type: 'text/plain' });
    expect(await validateFile(file)).toBe('UNSUPPORTED_FORMAT');
  });

  it('rejects a text file renamed to .jpg by its bytes', async () => {
    const spoofed = makeFile('selfie.jpg', HEADERS.TEXT, { type: 'image/jpeg' });
    expect(await validateFile(spoofed)).toBe('UNSUPPORTED_FORMAT');
  });

  it('accepts a .heic file with an empty MIME type when its bytes are HEIC', async () => {
    const heic = makeFile('IMG_0001.HEIC', HEADERS.HEIC, { type: '' });
    expect(await validateFile(heic)).toBeNull();
    expect(await sniffImageFormat(heic)).toBe('HEIC');
  });

  it('rejects files below the minimum size', async () => {
    const tiny = makeFile('tiny.jpg', HEADERS.JPEG, { size: UPLOAD_LIMITS.MIN_FILE_BYTES - 1 });
    expect(await validateFile(tiny)).toBe('FILE_TOO_SMALL');
  });

  it('rejects files above the maximum size', async () => {
    const huge = withReportedSize(makeFile('huge.jpg', HEADERS.JPEG), UPLOAD_LIMITS.MAX_FILE_BYTES + 1);
    expect(await validateFile(huge)).toBe('FILE_TOO_LARGE');
  });

  it('accepts files exactly at the size limits', async () => {
    const smallest = makeFile('a.jpg', HEADERS.JPEG, { size: UPLOAD_LIMITS.MIN_FILE_BYTES });
    const largest = withReportedSize(makeFile('b.jpg', HEADERS.JPEG), UPLOAD_LIMITS.MAX_FILE_BYTES);
    expect(await validateFile(smallest)).toBeNull();
    expect(await validateFile(largest)).toBeNull();
  });
});
