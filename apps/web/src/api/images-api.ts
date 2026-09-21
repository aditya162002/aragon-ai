import type { ImageDto, ImageListResponse } from '@aragon/shared';

export interface UploadOptions {
  /** Called with upload progress, 0–100. */
  onProgress?: (percent: number) => void;
  /** Aborts the upload (the promise then rejects with an `ApiError` coded `ABORTED`). */
  signal?: AbortSignal;
}

/** Port the hooks depend on; `ApiClient` is the HTTP implementation, tests can pass a fake. */
export interface ImagesApi {
  listImages(): Promise<ImageListResponse>;
  deleteImage(imageId: string): Promise<void>;
  uploadImage(file: File, options?: UploadOptions): Promise<ImageDto>;
}
