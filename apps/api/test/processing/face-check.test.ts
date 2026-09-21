import { describe, expect, it } from 'vitest';
import { FACE_RULES } from '../../src/constants';
import { RejectionReason } from '../../src/generated/prisma/enums';
import { FaceCheck } from '../../src/processing/checks/face-check';
import { contextWith, decodedImage, face, FakeFaceDetector } from './test-doubles';

// Working image 1536×2048 (original 3000×4000): a face must be ≥ 15% of the height, i.e. ≥ 307 working px.
const IMAGE = decodedImage();
const MAIN_FACE = face({ x: 500, y: 400, width: 450, height: 600 });
const COMPARABLE_FACE = face({ x: 1000, y: 500, width: 400, height: 500 });
/** Under MIN_SECONDARY_FACE_AREA_RATIO (10%) of the main face's area: a bystander or poster. */
const BYSTANDER = face({ x: 100, y: 100, width: 100, height: 120 });
const SMALL_FACE = face({ x: 500, y: 400, width: 200, height: 250 });

async function runWith(faces: ReturnType<typeof face>[], image = IMAGE) {
  const context = contextWith(image);
  const outcome = await new FaceCheck(new FakeFaceDetector(faces)).run(context);
  return { context, outcome };
}

describe('FaceCheck', () => {
  it('rejects a photo without faces and still records the detection', async () => {
    const { context, outcome } = await runWith([]);
    expect(outcome).toEqual({ passed: false, reason: RejectionReason.NO_FACE });
    expect(context.faceDetection).toEqual({ faces: [], topScore: 0 });
    expect(context.mainFace).toBeNull();
  });

  it('rejects two comparable faces', async () => {
    const { outcome } = await runWith([COMPARABLE_FACE, MAIN_FACE]);
    expect(outcome).toEqual({ passed: false, reason: RejectionReason.MULTIPLE_FACES });
  });

  it('ignores a much smaller bystander and picks the largest face as the subject', async () => {
    const { context, outcome } = await runWith([BYSTANDER, MAIN_FACE]);
    expect(outcome).toEqual({ passed: true });
    expect(context.mainFace).toBe(MAIN_FACE);
  });

  it('rejects a face that is small relative to the frame', async () => {
    expect(SMALL_FACE.box.height / IMAGE.workingHeight).toBeLessThan(FACE_RULES.MIN_FACE_HEIGHT_RATIO);
    const { outcome } = await runWith([SMALL_FACE]);
    expect(outcome).toEqual({ passed: false, reason: RejectionReason.FACE_TOO_SMALL });
  });

  it('rejects a face with too few pixels in the original even if it fills the frame proportionally', async () => {
    // 600×600 original: a 95 px face is 16% of the height (ratio ok) but under MIN_FACE_HEIGHT_PX.
    const tinyImage = decodedImage({ originalWidth: 600, originalHeight: 600, workingWidth: 600, workingHeight: 600 });
    const { outcome } = await runWith([face({ x: 250, y: 250, width: 90, height: 95 })], tinyImage);
    expect(outcome).toEqual({ passed: false, reason: RejectionReason.FACE_TOO_SMALL });
  });

  it('accepts a single, well-sized face', async () => {
    const { context, outcome } = await runWith([MAIN_FACE]);
    expect(outcome).toEqual({ passed: true });
    expect(context.mainFace).toBe(MAIN_FACE);
  });
});
