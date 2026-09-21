import sharp from 'sharp';
import { FACE_DETECTION, IMAGE_PROCESSING, SCRFD_TENSOR } from '../constants';
import type { InputGeometry } from './scrfd-decoder';

export type ScrfdInput = InputGeometry & {
  /** CHW float tensor data of shape [3, INPUT_SIZE_PX, INPUT_SIZE_PX], RGB order. */
  data: Float32Array;
};

/**
 * Letterboxes an image into the square network input exactly like InsightFace:
 * resize to fit (keeping aspect ratio), place at the top-left, pad the rest with black,
 * then normalise every channel value to (value − mean) / std.
 */
export async function prepareScrfdInput(image: Buffer): Promise<ScrfdInput> {
  const size = FACE_DETECTION.INPUT_SIZE_PX;
  const { width, height } = await sharp(image).metadata();

  const { data: pixels, info } = await sharp(image)
    .resize({ width: size, height: size, fit: sharp.fit.inside })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = IMAGE_PROCESSING.RGB_CHANNELS;
  const planeSize = size * size;
  const data = new Float32Array(channels * planeSize).fill(normalise(SCRFD_TENSOR.PADDING_PIXEL_VALUE));

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const source = (y * info.width + x) * channels;
      const target = y * size + x;
      for (let channel = 0; channel < channels; channel++) {
        data[channel * planeSize + target] = normalise(pixels[source + channel]);
      }
    }
  }

  return {
    data,
    scale: Math.min(size / width, size / height),
    imageSize: { width, height },
  };
}

function normalise(value: number): number {
  return (value - FACE_DETECTION.PIXEL_MEAN) / FACE_DETECTION.PIXEL_STD;
}
