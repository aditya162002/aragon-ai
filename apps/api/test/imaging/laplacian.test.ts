import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BLUR } from '../../src/constants';
import { laplacianVariance } from '../../src/imaging/laplacian';
import { checkerboardPixels, greyscalePixels, noiseImage } from '../fixtures/synthetic-images';

const SIZE_PX = 64;
const CHECKER_CELL_PX = 4;
const MID_GREY = 128;
const BLUR_SIGMA = 3;

describe('laplacianVariance', () => {
  it('matches a hand-computed value', () => {
    // 4×3 image, single bright pixel at (1, 1). Interior responses: −4·10 = −40 at (1, 1) and +10 at (2, 1).
    // Mean −15, population variance ((−25)² + 25²) / 2 = 625.
    const pixels = new Uint8Array([0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0]);
    expect(laplacianVariance(pixels, 4, 3)).toBe(625);
  });

  it('is zero for a flat image', () => {
    expect(laplacianVariance(new Uint8Array(SIZE_PX * SIZE_PX).fill(MID_GREY), SIZE_PX, SIZE_PX)).toBe(0);
  });

  it('is zero when the image has no interior pixels', () => {
    expect(laplacianVariance(new Uint8Array([0, 255, 255, 0]), 2, 2)).toBe(0);
  });

  it('is far above the blur threshold for a hard-edged checkerboard', () => {
    const pixels = checkerboardPixels(SIZE_PX, SIZE_PX, CHECKER_CELL_PX);
    expect(laplacianVariance(pixels, SIZE_PX, SIZE_PX)).toBeGreaterThan(BLUR.MIN_LAPLACIAN_VARIANCE);
  });

  it('drops below the blur threshold once the same image is Gaussian-blurred', async () => {
    const png = await noiseImage(BLUR.ANALYSIS_WIDTH_PX, BLUR.ANALYSIS_WIDTH_PX).png().toBuffer();
    const crisp = await greyscalePixels(sharp(png));
    const blurred = await greyscalePixels(sharp(png).blur(BLUR_SIGMA));

    const crispScore = laplacianVariance(crisp.data, crisp.width, crisp.height);
    const blurredScore = laplacianVariance(blurred.data, blurred.width, blurred.height);

    expect(crispScore).toBeGreaterThan(BLUR.MIN_LAPLACIAN_VARIANCE);
    expect(blurredScore).toBeLessThan(BLUR.MIN_LAPLACIAN_VARIANCE);
  });
});
