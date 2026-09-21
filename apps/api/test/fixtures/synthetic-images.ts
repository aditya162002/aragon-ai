/** Synthetic test images generated on the fly: no downloads, no binary fixtures besides the HEIC sample. */
import { randomBytes } from 'node:crypto';
import sharp, { type Sharp } from 'sharp';

const RGB_CHANNELS = 3;
const MAX_BYTE = 255;

export type Rgb = [red: number, green: number, blue: number];

/** RGB image whose pixels are produced by `paint(x, y)`, returned as an encoder-ready sharp instance. */
export function paintRgb(width: number, height: number, paint: (x: number, y: number) => Rgb): Sharp {
  const pixels = Buffer.alloc(width * height * RGB_CHANNELS);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixels.set(paint(x, y), (y * width + x) * RGB_CHANNELS);
    }
  }
  return sharp(pixels, { raw: { width, height, channels: RGB_CHANNELS } });
}

/** Uniform RGB noise: full of edges (very "sharp") and never contains a face. */
export function noiseImage(width: number, height: number): Sharp {
  return sharp(randomBytes(width * height * RGB_CHANNELS), { raw: { width, height, channels: RGB_CHANNELS } });
}

export function gradientImage(width: number, height: number): Sharp {
  return paintRgb(width, height, (x, y) => [
    Math.round((MAX_BYTE * x) / width),
    Math.round((MAX_BYTE * y) / height),
    Math.round((MAX_BYTE * (x + y)) / (width + height)),
  ]);
}

/** Greyscale checkerboard as raw pixels (one byte per pixel). */
export function checkerboardPixels(width: number, height: number, cellSize: number): Uint8Array {
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isLight = (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0;
      pixels[y * width + x] = isLight ? MAX_BYTE : 0;
    }
  }
  return pixels;
}

/** Greyscale raw pixels of an encoded image (for sharpness measurements). */
export async function greyscalePixels(image: Sharp): Promise<{ data: Uint8Array; width: number; height: number }> {
  const { data, info } = await image.greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const SCENE = {
  SKIN: [230, 190, 160] as Rgb,
  SHIRT: [40, 50, 90] as Rgb,
  MAX_BACKGROUND_LIGHT: 200,
  BACKGROUND_BLUE_RATIO: 0.9,
  /** Head disk centre and radius, as fractions of width / height. */
  HEAD_CENTER_X: 0.45,
  HEAD_CENTER_Y: 0.4,
  HEAD_RADIUS: 0.22,
  /** Shoulder block: from this height down, between these horizontal fractions. */
  SHOULDERS_TOP: 0.7,
  SHOULDERS_LEFT: 0.2,
  SHOULDERS_RIGHT: 0.7,
} as const;

/** Photo-like structure (lighting gradient, bright head disk, dark shoulders) without being a real face. */
export function sceneImage(width: number, height: number): Sharp {
  const centerX = width * SCENE.HEAD_CENTER_X;
  const centerY = height * SCENE.HEAD_CENTER_Y;
  const radius = height * SCENE.HEAD_RADIUS;
  return paintRgb(width, height, (x, y) => {
    if ((x - centerX) ** 2 + (y - centerY) ** 2 < radius ** 2) return SCENE.SKIN;
    const inShoulders = y > height * SCENE.SHOULDERS_TOP && x > width * SCENE.SHOULDERS_LEFT && x < width * SCENE.SHOULDERS_RIGHT;
    if (inShoulders) return SCENE.SHIRT;
    const light = Math.round(SCENE.MAX_BACKGROUND_LIGHT * (1 - x / width));
    return [light, light, Math.round(light * SCENE.BACKGROUND_BLUE_RATIO)];
  });
}
