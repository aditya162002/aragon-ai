import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { FACE_DETECTION, FACE_MODEL } from '../../src/constants';
import { ScrfdFaceDetector } from '../../src/imaging/scrfd-face-detector';
import { gradientImage, noiseImage } from '../fixtures/synthetic-images';

const MODEL_PATH = fileURLToPath(new URL(`../../models/${FACE_MODEL.FILE_NAME}`, import.meta.url));
const IMAGE = { width: 1200, height: 900 };

/** Smoke test against the real SCRFD model; skipped until `npm run models:fetch` has been run. */
describe.skipIf(!existsSync(MODEL_PATH))('ScrfdFaceDetector', () => {
  let detector: ScrfdFaceDetector;

  beforeAll(async () => {
    detector = await ScrfdFaceDetector.create(MODEL_PATH);
  });

  it.each([
    ['random noise', () => noiseImage(IMAGE.width, IMAGE.height)],
    ['a smooth gradient', () => gradientImage(IMAGE.width, IMAGE.height)],
  ])('finds no face in %s', async (_label, makeImage) => {
    const result = await detector.detect(await makeImage().jpeg().toBuffer());

    expect(result.faces).toEqual([]);
    expect(result.topScore).toBeGreaterThanOrEqual(0);
    expect(result.topScore).toBeLessThan(FACE_DETECTION.SCORE_THRESHOLD);
  });
});
