import sharp from 'sharp';
import { DUPLICATE } from '../constants';

/**
 * 64-bit difference hash: shrink to 9×8 greyscale and record whether each pixel is brighter than its
 * right-hand neighbour. Survives re-encoding, resizing and small exposure changes, so near-identical
 * photos land within a few bits of each other. Returned as a signed 64-bit value to fit a BIGINT column.
 */
export async function computeDHash(image: Buffer): Promise<bigint> {
  const pixels = await sharp(image)
    .greyscale()
    .resize(DUPLICATE.HASH_WIDTH_PX, DUPLICATE.HASH_HEIGHT_PX, { fit: sharp.fit.fill })
    .raw()
    .toBuffer();

  let hash = 0n;
  for (let row = 0; row < DUPLICATE.HASH_HEIGHT_PX; row++) {
    for (let column = 0; column < DUPLICATE.HASH_WIDTH_PX - 1; column++) {
      const index = row * DUPLICATE.HASH_WIDTH_PX + column;
      hash = (hash << 1n) | (pixels[index] > pixels[index + 1] ? 1n : 0n);
    }
  }
  return BigInt.asIntN(DUPLICATE.HASH_BITS, hash);
}

/** Number of differing bits between two hashes (the database computes the same with `bit_count(a # b)`). */
export function hammingDistance(a: bigint, b: bigint): number {
  let difference = BigInt.asUintN(DUPLICATE.HASH_BITS, a ^ b);
  let distance = 0;
  while (difference !== 0n) {
    distance += Number(difference & 1n);
    difference >>= 1n;
  }
  return distance;
}
