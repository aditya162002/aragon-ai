import { InferenceSession, Tensor } from 'onnxruntime-node';
import { FACE_DETECTION, IMAGE_PROCESSING, SCRFD_TENSOR } from '../constants';
import type { FaceDetectionResult, FaceDetector } from './face-detector';
import { decodeDetections } from './scrfd-decoder';
import { prepareScrfdInput } from './scrfd-input';
import { groupOutputsByStride } from './scrfd-outputs';

/**
 * InsightFace SCRFD-10G face detector running on onnxruntime (CPU). The model is loaded once and the
 * session reused; inference is synchronous native work, which is fine in the dedicated worker process.
 */
export class ScrfdFaceDetector implements FaceDetector {
  private constructor(
    private readonly session: InferenceSession,
    private readonly inputName: string,
  ) {}

  static async create(modelPath: string): Promise<ScrfdFaceDetector> {
    const session = await InferenceSession.create(modelPath);
    const [inputName] = session.inputNames;
    return new ScrfdFaceDetector(session, inputName);
  }

  async detect(workingJpeg: Buffer): Promise<FaceDetectionResult> {
    const input = await prepareScrfdInput(workingJpeg);
    const size = FACE_DETECTION.INPUT_SIZE_PX;
    const tensor = new Tensor('float32', input.data, [
      SCRFD_TENSOR.BATCH_SIZE,
      IMAGE_PROCESSING.RGB_CHANNELS,
      size,
      size,
    ]);

    const outputs = await this.session.run({ [this.inputName]: tensor });
    return decodeDetections(groupOutputsByStride(Object.values(outputs)), input);
  }
}
