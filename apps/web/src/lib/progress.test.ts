import { TARGET_ACCEPTED_PHOTOS } from '@aragon/shared';
import { describe, expect, it } from 'vitest';
import { toPercent } from './percent';
import { getAcceptedProgress } from './progress';

describe('getAcceptedProgress', () => {
  it('defaults to the shared target', () => {
    expect(getAcceptedProgress(0)).toMatchObject({
      accepted: 0,
      target: TARGET_ACCEPTED_PHOTOS,
      percent: 0,
      remaining: TARGET_ACCEPTED_PHOTOS,
      isComplete: false,
    });
  });

  it('computes percentage and remaining photos', () => {
    expect(getAcceptedProgress(3, 10)).toMatchObject({ valueNow: 3, percent: 30, remaining: 7, isComplete: false });
  });

  it('caps the bar at 100% when more photos than needed are accepted', () => {
    expect(getAcceptedProgress(12, 10)).toMatchObject({
      accepted: 12,
      valueNow: 10,
      percent: 100,
      remaining: 0,
      isComplete: true,
    });
  });
});

describe('toPercent', () => {
  it('rounds and clamps to 0–100', () => {
    expect(toPercent(1, 3)).toBe(33);
    expect(toPercent(5, 4)).toBe(100);
    expect(toPercent(-1, 4)).toBe(0);
  });

  it('returns 0 for an empty whole instead of NaN', () => {
    expect(toPercent(0, 0)).toBe(0);
  });
});
