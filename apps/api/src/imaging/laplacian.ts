import { LAPLACIAN } from '../constants';

/**
 * Variance of the 4-neighbour Laplacian over the interior pixels of a greyscale image.
 * Sharp edges produce large second derivatives, so blur pushes the variance towards zero.
 * Returns 0 for images too small to have interior pixels.
 */
export function laplacianVariance(pixels: Uint8Array, width: number, height: number): number {
  let sum = 0;
  let sumOfSquares = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const response =
        pixels[index - width] +
        pixels[index + width] +
        pixels[index - 1] +
        pixels[index + 1] -
        LAPLACIAN.CENTER_WEIGHT * pixels[index];
      sum += response;
      sumOfSquares += response * response;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumOfSquares / count - mean * mean;
}
