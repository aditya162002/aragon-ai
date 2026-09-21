import { describe, expect, it } from 'vitest';
import { ORIGINAL_NAME, UPLOAD } from '../../src/constants';
import { sanitizeOriginalName } from '../../src/images/original-name';

describe('sanitizeOriginalName', () => {
  it('keeps ordinary and Unicode names as they are', () => {
    expect(sanitizeOriginalName('IMG_0001.HEIC')).toBe('IMG_0001.HEIC');
    expect(sanitizeOriginalName('café 🙂.jpg')).toBe('café 🙂.jpg');
  });

  it('strips POSIX and Windows directories', () => {
    expect(sanitizeOriginalName('../../etc/passwd.jpg')).toBe('passwd.jpg');
    expect(sanitizeOriginalName('C:\\Users\\me\\selfie.png')).toBe('selfie.png');
  });

  it('removes control characters and surrounding whitespace', () => {
    expect(sanitizeOriginalName('  sel\u0000fie\n.jpg\t ')).toBe('selfie.jpg');
  });

  it('truncates by character without splitting emoji', () => {
    const name = sanitizeOriginalName('🙂'.repeat(UPLOAD.MAX_ORIGINAL_NAME_LENGTH + 1));

    expect(name).toBe('🙂'.repeat(UPLOAD.MAX_ORIGINAL_NAME_LENGTH));
  });

  it('falls back when nothing printable is left', () => {
    expect(sanitizeOriginalName('')).toBe(ORIGINAL_NAME.FALLBACK);
    expect(sanitizeOriginalName('uploads/')).toBe(ORIGINAL_NAME.FALLBACK);
    expect(sanitizeOriginalName('\u0007\u0008')).toBe(ORIGINAL_NAME.FALLBACK);
  });
});
