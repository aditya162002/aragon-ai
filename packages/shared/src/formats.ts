import {
  ACCEPTED_EXTENSIONS,
  HEIC_BRANDS,
  IMAGE_FORMATS,
  ISO_BMFF,
  MAGIC_BYTES,
  type ImageFormat,
} from './constants';

/**
 * Identifies an image by its leading bytes ("magic bytes"), never by file name or MIME type,
 * both of which are client-controlled. Pure and dependency-free so it runs in the browser and Node.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (startsWith(bytes, MAGIC_BYTES.JPEG)) return 'JPEG';
  if (startsWith(bytes, MAGIC_BYTES.PNG)) return 'PNG';
  if (readFtypBrands(bytes).some((brand) => HEIC_BRANDS.includes(brand))) return 'HEIC';
  return null;
}

/** Lower-cased extension including the dot (".jpg"), or "" when the name has none. */
export function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.slice(dotIndex).toLowerCase();
}

export function hasAcceptedExtension(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  return IMAGE_FORMATS.some((format) => ACCEPTED_EXTENSIONS[format].includes(extension));
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

/** Major + compatible brands of an ISO-BMFF `ftyp` box; empty when the file is not ISO-BMFF. */
function readFtypBrands(bytes: Uint8Array): string[] {
  if (readAscii(bytes, ISO_BMFF.BOX_TYPE_OFFSET) !== ISO_BMFF.BOX_TYPE) return [];

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declaredBoxSize = view.getUint32(ISO_BMFF.BOX_SIZE_OFFSET);
  const boxEnd = Math.min(declaredBoxSize, bytes.length);

  const brands = [readAscii(bytes, ISO_BMFF.MAJOR_BRAND_OFFSET)];
  for (
    let offset = ISO_BMFF.COMPATIBLE_BRANDS_OFFSET;
    offset + ISO_BMFF.FIELD_LENGTH <= boxEnd;
    offset += ISO_BMFF.FIELD_LENGTH
  ) {
    brands.push(readAscii(bytes, offset));
  }
  return brands;
}

function readAscii(bytes: Uint8Array, offset: number): string {
  const end = offset + ISO_BMFF.FIELD_LENGTH;
  if (bytes.length < end) return '';
  return String.fromCharCode(...bytes.subarray(offset, end));
}
