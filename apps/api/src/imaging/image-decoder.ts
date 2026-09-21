import decodeHeic from 'heic-decode';
import sharp, { type Sharp } from 'sharp';
import { IMAGE_PROCESSING } from '../constants';
import { ImageFormat } from '../generated/prisma/enums';
import { UnreadableImageError } from './errors';

export interface DecodedImage {
  /** sRGB JPEG, upright, metadata (EXIF/GPS) stripped, at most WORKING_MAX_DIMENSION_PX per side. */
  working: Buffer;
  /** Upright dimensions of the uploaded image (what the resolution rule judges). */
  originalWidth: number;
  originalHeight: number;
  workingWidth: number;
  workingHeight: number;
}

/** A not-yet-encoded image whose orientation is already applied, plus its upright dimensions. */
interface UprightSource {
  pipeline: Sharp;
  width: number;
  height: number;
}

const SAFE_INPUT = { limitInputPixels: IMAGE_PROCESSING.MAX_INPUT_PIXELS } as const;

/**
 * Turns an uploaded original (JPEG, PNG or HEIC) into the normalised working copy every check runs on.
 * Any decoding problem surfaces as UnreadableImageError.
 */
export class ImageDecoder {
  async decode(buffer: Buffer, format: ImageFormat): Promise<DecodedImage> {
    try {
      const source = format === ImageFormat.HEIC ? await this.openHeic(buffer) : await this.openRaster(buffer);
      return await this.toWorkingImage(source);
    } catch (error) {
      if (error instanceof UnreadableImageError) throw error;
      throw new UnreadableImageError(`Could not decode ${format} image`, { cause: error });
    }
  }

  createThumbnail(working: Buffer): Promise<Buffer> {
    return sharp(working)
      .resize({ width: IMAGE_PROCESSING.THUMBNAIL_WIDTH_PX, withoutEnlargement: true })
      .jpeg({ quality: IMAGE_PROCESSING.THUMBNAIL_JPEG_QUALITY })
      .toBuffer();
  }

  /** JPEG/PNG: sharp reads the EXIF orientation and rotates while decoding. */
  private async openRaster(buffer: Buffer): Promise<UprightSource> {
    const { autoOrient } = await sharp(buffer, SAFE_INPUT).metadata();
    return {
      pipeline: sharp(buffer, { ...SAFE_INPUT, autoOrient: true }),
      width: autoOrient.width,
      height: autoOrient.height,
    };
  }

  /**
   * HEIC: sharp's prebuilt libvips has no HEVC decoder, so libheif (WebAssembly) decodes to RGBA.
   * libheif already applies the container's rotation, so the pixels must not be rotated again.
   */
  private async openHeic(buffer: Buffer): Promise<UprightSource> {
    const images = await decodeHeic.all({ buffer });
    try {
      const [primary] = images;
      if (!primary) throw new UnreadableImageError('HEIC file contains no image');
      if (primary.width * primary.height > IMAGE_PROCESSING.MAX_INPUT_PIXELS) {
        throw new UnreadableImageError('HEIC image exceeds the pixel limit');
      }

      const { width, height, data } = await primary.decode();
      const pixels = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      return {
        pipeline: sharp(pixels, {
          ...SAFE_INPUT,
          raw: { width, height, channels: IMAGE_PROCESSING.RGBA_CHANNELS },
        }).removeAlpha(),
        width,
        height,
      };
    } finally {
      images.dispose();
    }
  }

  private async toWorkingImage({ pipeline, width, height }: UprightSource): Promise<DecodedImage> {
    const { data, info } = await pipeline
      .resize({
        width: IMAGE_PROCESSING.WORKING_MAX_DIMENSION_PX,
        height: IMAGE_PROCESSING.WORKING_MAX_DIMENSION_PX,
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toColourspace('srgb')
      .jpeg({ quality: IMAGE_PROCESSING.WORKING_JPEG_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      working: data,
      originalWidth: width,
      originalHeight: height,
      workingWidth: info.width,
      workingHeight: info.height,
    };
  }
}
