import { TARGET_ACCEPTED_PHOTOS } from '@aragon/shared';
import { toPercent } from './percent';

export interface AcceptedProgress {
  accepted: number;
  target: number;
  /** Accepted count capped at the target, for `aria-valuenow` (must stay within min/max). */
  valueNow: number;
  percent: number;
  remaining: number;
  isComplete: boolean;
}

/** Progress towards the number of accepted photos the user is asked for. */
export function getAcceptedProgress(
  acceptedCount: number,
  target: number = TARGET_ACCEPTED_PHOTOS,
): AcceptedProgress {
  return {
    accepted: acceptedCount,
    target,
    valueNow: Math.min(acceptedCount, target),
    percent: toPercent(acceptedCount, target),
    remaining: Math.max(target - acceptedCount, 0),
    isComplete: acceptedCount >= target,
  };
}
