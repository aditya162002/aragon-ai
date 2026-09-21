import { MAGIC_BYTES, type ImageDto } from '@aragon/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ROUTES, ERROR_CODES, HTTP_STATUS, RATE_LIMIT, UPLOAD } from '../../src/constants';
import { buildImageDto, createTestApp, USER_ID } from './test-doubles';

const UPLOAD_URL = `${API_ROUTES.PREFIX}${API_ROUTES.IMAGES}`;
const JPEG_BYTES = Buffer.from([...MAGIC_BYTES.JPEG, 0xe0, 0x00, 0x10]);
const TEXT_BYTES = Buffer.from('hello, I am a text file');

describe(`POST ${UPLOAD_URL}`, () => {
  let context: ReturnType<typeof createTestApp>;
  let dto: ImageDto;

  beforeEach(() => {
    context = createTestApp();
    dto = buildImageDto();
    context.imageService.create.mockResolvedValue(dto);
  });

  it('returns 400 FILE_REQUIRED when no file is attached', async () => {
    const response = await request(context.app).post(UPLOAD_URL);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(response.body).toEqual({ error: { code: ERROR_CODES.FILE_REQUIRED, message: expect.any(String) } });
    expect(context.sessionManager.ensureUserId).not.toHaveBeenCalled();
  });

  it('returns 415 for a text file named photo.jpg, without creating a user or storing anything', async () => {
    const response = await request(context.app)
      .post(UPLOAD_URL)
      .attach(UPLOAD.FIELD_NAME, TEXT_BYTES, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE);
    expect(response.body.error.code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT);
    expect(context.sessionManager.ensureUserId).not.toHaveBeenCalled();
    expect(context.imageService.create).not.toHaveBeenCalled();
  });

  it('accepts a JPEG by its bytes, ignoring the client name and MIME type, and returns 202 with the DTO', async () => {
    const response = await request(context.app)
      .post(UPLOAD_URL)
      .attach(UPLOAD.FIELD_NAME, JPEG_BYTES, { filename: 'selfie.png', contentType: 'text/plain' });

    expect(response.status).toBe(HTTP_STATUS.ACCEPTED);
    expect(response.body).toEqual(dto);
    expect(context.imageService.create).toHaveBeenCalledWith(USER_ID, {
      buffer: JPEG_BYTES,
      originalName: 'selfie.png',
      format: 'JPEG',
    });
  });

  it('decodes UTF-8 file names correctly', async () => {
    const fileName = 'café 🙂.jpg';

    await request(context.app).post(UPLOAD_URL).attach(UPLOAD.FIELD_NAME, JPEG_BYTES, { filename: fileName });

    expect(context.imageService.create).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ originalName: fileName }),
    );
  });

  it('returns 413 FILE_TOO_LARGE above the size cap', async () => {
    const oversized = Buffer.alloc(UPLOAD.MAX_FILE_BYTES + 1);
    oversized.set(MAGIC_BYTES.JPEG);

    const response = await request(context.app)
      .post(UPLOAD_URL)
      .attach(UPLOAD.FIELD_NAME, oversized, { filename: 'huge.jpg' });

    expect(response.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE);
    expect(response.body.error.code).toBe(ERROR_CODES.FILE_TOO_LARGE);
    expect(context.imageService.create).not.toHaveBeenCalled();
  });

  it('returns 400 when the file arrives under an unexpected field name', async () => {
    const response = await request(context.app)
      .post(UPLOAD_URL)
      .attach('photo', JPEG_BYTES, { filename: 'selfie.jpg' });

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(response.body.error.code).toBe(ERROR_CODES.BAD_REQUEST);
  });

  it('rate limits uploads with a 429 ApiErrorBody and standard RateLimit headers', async () => {
    for (let attempt = 0; attempt < RATE_LIMIT.UPLOAD_MAX_REQUESTS_PER_WINDOW; attempt += 1) {
      await request(context.app).post(UPLOAD_URL);
    }

    const response = await request(context.app).post(UPLOAD_URL);

    expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
    expect(response.body.error.code).toBe(ERROR_CODES.RATE_LIMITED);
    expect(response.headers['ratelimit-policy']).toBeDefined();
  });
});
