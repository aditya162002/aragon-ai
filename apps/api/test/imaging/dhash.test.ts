import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { DUPLICATE } from '../../src/constants';
import { computeDHash, hammingDistance } from '../../src/imaging/dhash';
import { noiseImage, sceneImage } from '../fixtures/synthetic-images';

const SCENE_WIDTH_PX = 1200;
const SCENE_HEIGHT_PX = 900;
const RECOMPRESSED_WIDTH_PX = 500;
const LOW_JPEG_QUALITY = 40;
/** Random 64-bit hashes differ in 32 bits on average; anything this far apart is clearly unrelated. */
const UNRELATED_MIN_DISTANCE = 16;

describe('computeDHash', () => {
  it('gives identical images a distance of 0', async () => {
    const png = await sceneImage(SCENE_WIDTH_PX, SCENE_HEIGHT_PX).png().toBuffer();
    expect(hammingDistance(await computeDHash(png), await computeDHash(png))).toBe(0);
  });

  it('keeps a downscaled, heavily recompressed copy within the duplicate threshold', async () => {
    const original = await sceneImage(SCENE_WIDTH_PX, SCENE_HEIGHT_PX).png().toBuffer();
    const copy = await sharp(original)
      .resize({ width: RECOMPRESSED_WIDTH_PX })
      .jpeg({ quality: LOW_JPEG_QUALITY })
      .toBuffer();

    const distance = hammingDistance(await computeDHash(original), await computeDHash(copy));
    expect(distance).toBeLessThanOrEqual(DUPLICATE.MAX_HAMMING_DISTANCE);
  });

  it('puts unrelated images far apart', async () => {
    const scene = await sceneImage(SCENE_WIDTH_PX, SCENE_HEIGHT_PX).png().toBuffer();
    const noise = await noiseImage(SCENE_WIDTH_PX, SCENE_HEIGHT_PX).png().toBuffer();

    const distance = hammingDistance(await computeDHash(scene), await computeDHash(noise));
    expect(distance).toBeGreaterThanOrEqual(UNRELATED_MIN_DISTANCE);
  });

  it('fits a signed 64-bit BIGINT column', async () => {
    const hash = await computeDHash(await noiseImage(SCENE_WIDTH_PX, SCENE_HEIGHT_PX).png().toBuffer());
    expect(BigInt.asIntN(DUPLICATE.HASH_BITS, hash)).toBe(hash);
  });
});

describe('hammingDistance', () => {
  it('counts differing bits, including the sign bit', () => {
    expect(hammingDistance(0n, 0b1011n)).toBe(3);
    expect(hammingDistance(-1n, 0n)).toBe(DUPLICATE.HASH_BITS);
  });
});
