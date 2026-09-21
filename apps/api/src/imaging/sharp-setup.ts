import sharp from 'sharp';
import { SHARP_HARDENING } from '../constants';

/**
 * Shrinks libvips' attack surface for untrusted uploads: every file loader is blocked except the
 * JPEG and PNG buffer loaders. Raw pixel input (used for HEIC decoded by libheif) needs no loader.
 * The setting is process-wide, so call it once at worker start-up.
 */
export function configureSharp(): void {
  sharp.block({ operation: [...SHARP_HARDENING.BLOCKED_OPERATIONS] });
  sharp.unblock({ operation: [...SHARP_HARDENING.ALLOWED_OPERATIONS] });
}
