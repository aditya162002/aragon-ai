import { PERCENT } from '../constants';

/** `part / whole` as a whole-number percentage clamped to 0–100 (0 when `whole` is not positive). */
export function toPercent(part: number, whole: number): number {
  if (whole <= 0) return PERCENT.MIN;
  const percent = Math.round((part / whole) * PERCENT.MAX);
  return Math.min(PERCENT.MAX, Math.max(PERCENT.MIN, percent));
}
