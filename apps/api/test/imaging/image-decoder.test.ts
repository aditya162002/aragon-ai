import { readFile } from 'node:fs/promises';
import { detectImageFormat } from '@aragon/shared';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { IMAGE_PROCESSING } from '../../src/constants';
import { ImageFormat } from '../../src/generated/prisma/enums';
import { UnreadableImageError } from '../../src/imaging/errors';
import { ImageDecoder } from '../../src/imaging/image-decoder';
import { configureSharp } from '../../src/imaging/sharp-setup';
import { gradientImage, paintRgb, type Rgb } from '../fixtures/synthetic-images';

const HEIC_FIXTURE = new URL('../fixtures/sample.heic', import.meta.url);
/** sample.heic was made with `sips -s format heic` from a 640×480 sharp-generated gradient JPEG. */
const HEIC_FIXTURE_SIZE = { width: 640, height: 480 };
const LANDSCAPE = { width: 300, height: 200 };
const OVERSIZED = { width: 3000, height: 1000 };
/** EXIF orientation 6: stored landscape, displayed rotated 90° clockwise (typical phone portrait). */
const EXIF_ROTATE_90_CW = 6;
const RED: Rgb = [255, 0, 0];
const BLUE: Rgb = [0, 0, 255];
const COLOUR_TOLERANCE = 60;

const decoder = new ImageDecoder();

beforeAll(() => {
  // Exercise the hardened configuration the worker runs with.
  configureSharp();
});

async function pixelAt(jpeg: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return [...data.subarray(offset, offset + IMAGE_PROCESSING.RGB_CHANNELS)];
}

function expectColour(actual: number[], expected: Rgb): void {
  actual.forEach((value, channel) => expect(Math.abs(value - expected[channel])).toBeLessThan(COLOUR_TOLERANCE));
}

describe('ImageDecoder.decode', () => {
  it('decodes a PNG into an sRGB JPEG working copy with original dimensions', async () => {
    const png = await gradientImage(LANDSCAPE.width, LANDSCAPE.height).png().toBuffer();
    const decoded = await decoder.decode(png, ImageFormat.PNG);

    expect(detectImageFormat(decoded.working)).toBe('JPEG');
    expect(decoded).toMatchObject({
      originalWidth: LANDSCAPE.width,
      originalHeight: LANDSCAPE.height,
      workingWidth: LANDSCAPE.width,
      workingHeight: LANDSCAPE.height,
    });
  });

  it('downscales large images to the working size, keeping the original dimensions', async () => {
    const jpeg = await gradientImage(OVERSIZED.width, OVERSIZED.height).jpeg().toBuffer();
    const decoded = await decoder.decode(jpeg, ImageFormat.JPEG);

    expect(decoded.originalWidth).toBe(OVERSIZED.width);
    expect(decoded.workingWidth).toBe(IMAGE_PROCESSING.WORKING_MAX_DIMENSION_PX);
    expect(decoded.workingHeight).toBe(
      Math.round((IMAGE_PROCESSING.WORKING_MAX_DIMENSION_PX * OVERSIZED.height) / OVERSIZED.width),
    );
  });

  it('applies EXIF orientation: reports upright dimensions and produces an upright image', async () => {
    // Left half red, right half blue. Rotated 90° clockwise, the red half ends up on top.
    const jpeg = await paintRgb(LANDSCAPE.width, LANDSCAPE.height, (x) => (x < LANDSCAPE.width / 2 ? RED : BLUE))
      .jpeg()
      .withMetadata({ orientation: EXIF_ROTATE_90_CW })
      .toBuffer();

    const decoded = await decoder.decode(jpeg, ImageFormat.JPEG);

    expect(decoded).toMatchObject({
      originalWidth: LANDSCAPE.height,
      originalHeight: LANDSCAPE.width,
      workingWidth: LANDSCAPE.height,
      workingHeight: LANDSCAPE.width,
    });
    const centerX = Math.floor(decoded.workingWidth / 2);
    expectColour(await pixelAt(decoded.working, centerX, Math.floor(decoded.workingHeight / 4)), RED);
    expectColour(await pixelAt(decoded.working, centerX, Math.floor((decoded.workingHeight * 3) / 4)), BLUE);
  });

  it('strips EXIF metadata from the working copy', async () => {
    const jpeg = await gradientImage(LANDSCAPE.width, LANDSCAPE.height)
      .jpeg()
      .withMetadata({ orientation: EXIF_ROTATE_90_CW })
      .toBuffer();

    const { working } = await decoder.decode(jpeg, ImageFormat.JPEG);
    const metadata = await sharp(working).metadata();

    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
  });

  it('decodes HEIC (via libheif) to the right dimensions', async () => {
    const heic = await readFile(HEIC_FIXTURE);
    const decoded = await decoder.decode(heic, ImageFormat.HEIC);

    expect(detectImageFormat(decoded.working)).toBe('JPEG');
    expect(decoded).toMatchObject({
      originalWidth: HEIC_FIXTURE_SIZE.width,
      originalHeight: HEIC_FIXTURE_SIZE.height,
      workingWidth: HEIC_FIXTURE_SIZE.width,
      workingHeight: HEIC_FIXTURE_SIZE.height,
    });
  });

  it.each([
    ['garbage bytes', ImageFormat.JPEG, async () => Buffer.from('definitely not an image')],
    ['a truncated JPEG', ImageFormat.JPEG, async () => truncate(await gradientImage(LANDSCAPE.width, LANDSCAPE.height).jpeg().toBuffer())],
    ['a PNG labelled as HEIC', ImageFormat.HEIC, () => gradientImage(LANDSCAPE.width, LANDSCAPE.height).png().toBuffer()],
    ['a WebP (loader blocked by the sharp hardening)', ImageFormat.JPEG, () => gradientImage(LANDSCAPE.width, LANDSCAPE.height).webp().toBuffer()],
  ])('rejects %s as unreadable', async (_label, format, makeBytes) => {
    await expect(decoder.decode(await makeBytes(), format)).rejects.toBeInstanceOf(UnreadableImageError);
  });
});

describe('ImageDecoder.createThumbnail', () => {
  it('produces a JPEG of the thumbnail width', async () => {
    const jpeg = await gradientImage(OVERSIZED.width, OVERSIZED.height).jpeg().toBuffer();
    const thumbnail = await decoder.createThumbnail(jpeg);
    const metadata = await sharp(thumbnail).metadata();

    expect(metadata.format).toBe('jpeg');
    expect(metadata.width).toBe(IMAGE_PROCESSING.THUMBNAIL_WIDTH_PX);
  });
});

function truncate(bytes: Buffer): Buffer {
  return bytes.subarray(0, Math.floor(bytes.length / 2));
}
