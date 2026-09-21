/**
 * The bytes could not be decoded into an image: corrupt, truncated, disguised as another format,
 * or over the decompression-bomb pixel limit. The pipeline maps it to the UNREADABLE verdict.
 */
export class UnreadableImageError extends Error {
  override readonly name = 'UnreadableImageError';
}
