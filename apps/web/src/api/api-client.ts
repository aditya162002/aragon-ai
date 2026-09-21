import type { ImageDto, ImageListResponse } from '@aragon/shared';
import { API, HTTP } from '../constants';
import { toPercent } from '../lib/percent';
import { ApiError, isSuccessStatus, parseJsonSafely } from './api-error';
import type { ImagesApi, UploadOptions } from './images-api';

/**
 * HTTP client for the images API. Requests are same-origin, so the anonymous-session cookie is sent
 * automatically. Every failure is surfaced as an `ApiError`.
 */
export class ApiClient implements ImagesApi {
  private readonly imagesUrl: string;

  constructor(basePath: string) {
    this.imagesUrl = `${basePath}${API.IMAGES_PATH}`;
  }

  async listImages(): Promise<ImageListResponse> {
    const query = new URLSearchParams({ [API.LIMIT_QUERY_PARAM]: String(API.LIST_PAGE_LIMIT) });
    return (await this.request(HTTP.METHODS.GET, `${this.imagesUrl}?${query}`)) as ImageListResponse;
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.request(HTTP.METHODS.DELETE, `${this.imagesUrl}/${encodeURIComponent(imageId)}`);
  }

  /** Uses XMLHttpRequest because `fetch` cannot report upload progress. */
  uploadImage(file: File, { onProgress, signal }: UploadOptions = {}): Promise<ImageDto> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(ApiError.aborted());
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(toPercent(event.loaded, event.total));
      };
      xhr.onload = () => {
        const body = parseJsonSafely(xhr.responseText);
        if (isSuccessStatus(xhr.status) && body !== null) resolve(body as ImageDto);
        else reject(ApiError.fromResponse(xhr.status, body));
      };
      xhr.onerror = () => reject(ApiError.network());
      xhr.onabort = () => reject(ApiError.aborted());
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });

      const form = new FormData();
      form.append(API.UPLOAD_FIELD_NAME, file);
      xhr.open(HTTP.METHODS.POST, this.imagesUrl);
      xhr.send(form);
    });
  }

  private async request(method: string, url: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, { method });
    } catch {
      throw ApiError.network();
    }
    const body = parseJsonSafely(await response.text());
    if (!response.ok) throw ApiError.fromResponse(response.status, body);
    return body;
  }
}
