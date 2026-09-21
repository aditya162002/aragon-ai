import { ORIGINAL_NAME, UPLOAD } from '../constants';

const PATH_SEPARATORS = /[/\\]/;
const CONTROL_CHARACTERS = /\p{Cc}/gu;

/**
 * Makes a client-supplied file name safe to store and display: base name only, no control
 * characters, at most `UPLOAD.MAX_ORIGINAL_NAME_LENGTH` characters. Display only — storage keys
 * are built from server-generated ids.
 */
export function sanitizeOriginalName(rawName: string): string {
  const baseName = rawName.split(PATH_SEPARATORS).at(-1) ?? '';
  const printable = baseName.replace(CONTROL_CHARACTERS, '').trim();
  // Spread by code point so truncation never splits a surrogate pair (VARCHAR counts characters too).
  const truncated = [...printable].slice(0, UPLOAD.MAX_ORIGINAL_NAME_LENGTH).join('').trimEnd();
  return truncated || ORIGINAL_NAME.FALLBACK;
}
