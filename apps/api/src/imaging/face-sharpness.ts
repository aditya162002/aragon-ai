import sharp from 'sharp';
import { BLUR } from '../constants';
import { paddedRegion, type Box, type Size } from './box-geometry';
import { laplacianVariance } from './laplacian';

/**
 * Sharpness of the face region: crop the (padded) face, normalise its width so scores are comparable
 * across resolutions, and take the Laplacian variance of the greyscale pixels. Higher = sharper.
 */
export async function measureFaceSharpness(image: Buffer, imageSize: Size, face: Box): Promise<number> {
  const { data, info } = await sharp(image)
    .extract(paddedRegion(face, BLUR.FACE_CROP_PADDING_RATIO, imageSize))
    .resize({ width: BLUR.ANALYSIS_WIDTH_PX })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return laplacianVariance(data, info.width, info.height);
}
