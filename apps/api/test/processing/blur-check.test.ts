import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BLUR } from '../../src/constants';
import { RejectionReason } from '../../src/generated/prisma/enums';
import { BlurCheck } from '../../src/processing/checks/blur-check';
import { noiseImage } from '../fixtures/synthetic-images';
import { contextWith, decodedImage, face } from './test-doubles';

const IMAGE = { width: 800, height: 1000 };
const FACE_BOX = { x: 250, y: 200, width: 300, height: 380 };
/** Strong enough to wipe out pixel-level detail, like an out-of-focus or shaken photo. */
const BLUR_SIGMA = 4;

async function runOn(working: Buffer) {
  const context = contextWith(decodedImage({ working, workingWidth: IMAGE.width, workingHeight: IMAGE.height }));
  context.mainFace = face(FACE_BOX);
  const outcome = await new BlurCheck().run(context);
  return { outcome, blurScore: context.blurScore };
}

describe('BlurCheck', () => {
  it('passes a sharp face region and records its score', async () => {
    const { outcome, blurScore } = await runOn(await noiseImage(IMAGE.width, IMAGE.height).jpeg().toBuffer());
    expect(outcome).toEqual({ passed: true });
    expect(blurScore).toBeGreaterThan(BLUR.MIN_LAPLACIAN_VARIANCE);
  });

  it('rejects a blurred face region and still records its score', async () => {
    const png = await noiseImage(IMAGE.width, IMAGE.height).png().toBuffer();
    const blurred = await sharp(png).blur(BLUR_SIGMA).jpeg().toBuffer();

    const { outcome, blurScore } = await runOn(blurred);

    expect(outcome).toEqual({ passed: false, reason: RejectionReason.BLURRY });
    expect(blurScore).toBeLessThan(BLUR.MIN_LAPLACIAN_VARIANCE);
  });

  it('handles a face touching the image edge (padding is clamped)', async () => {
    const context = contextWith(
      decodedImage({
        working: await noiseImage(IMAGE.width, IMAGE.height).jpeg().toBuffer(),
        workingWidth: IMAGE.width,
        workingHeight: IMAGE.height,
      }),
    );
    context.mainFace = face({ x: 0, y: 0, width: IMAGE.width, height: IMAGE.height });
    await expect(new BlurCheck().run(context)).resolves.toEqual({ passed: true });
  });
});
