import { describe, expect, it } from 'vitest';
import { detectImageFormat, getFileExtension, hasAcceptedExtension } from './formats';

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

/** Builds a minimal ISO-BMFF header: [size][ftyp][major][minor version][compatible brands...]. */
function ftypBox(majorBrand: string, compatibleBrands: string[]): Uint8Array {
  const size = 16 + compatibleBrands.length * 4;
  return new Uint8Array([
    0, 0, 0, size,
    ...ascii('ftyp'),
    ...ascii(majorBrand),
    0, 0, 0, 0,
    ...compatibleBrands.flatMap(ascii),
  ]);
}

describe('detectImageFormat', () => {
  it('detects JPEG and PNG by signature', () => {
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe('JPEG');
    expect(detectImageFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))).toBe('PNG');
  });

  it('detects HEIC from the major brand', () => {
    expect(detectImageFormat(ftypBox('heic', ['mif1', 'heic']))).toBe('HEIC');
  });

  it('detects HEIC when the major brand is generic but a compatible brand is HEVC', () => {
    expect(detectImageFormat(ftypBox('mif1', ['mif1', 'heic', 'miaf']))).toBe('HEIC');
  });

  it('rejects AVIF even though it shares the generic mif1 brand', () => {
    expect(detectImageFormat(ftypBox('avif', ['mif1', 'miaf']))).toBeNull();
    expect(detectImageFormat(ftypBox('mif1', ['avif', 'miaf']))).toBeNull();
  });

  it('rejects other formats and truncated input', () => {
    expect(detectImageFormat(new Uint8Array(ascii('GIF89a')))).toBeNull();
    expect(detectImageFormat(new Uint8Array(ascii('hello, I am a text file')))).toBeNull();
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectImageFormat(new Uint8Array())).toBeNull();
  });
});

describe('file extensions', () => {
  it('normalises case and handles names without an extension', () => {
    expect(getFileExtension('Selfie.JPG')).toBe('.jpg');
    expect(getFileExtension('README')).toBe('');
  });

  it('accepts only JPG, PNG and HEIC extensions', () => {
    expect(hasAcceptedExtension('a.jpeg')).toBe(true);
    expect(hasAcceptedExtension('a.HEIC')).toBe(true);
    expect(hasAcceptedExtension('a.webp')).toBe(false);
    expect(hasAcceptedExtension('a.jpg.exe')).toBe(false);
  });
});
