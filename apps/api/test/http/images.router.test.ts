import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ROUTES, ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS, PAGINATION } from '../../src/constants';
import { NotFoundError } from '../../src/http/errors';
import { buildImageDto, createTestApp, IMAGE_ID, USER_ID } from './test-doubles';

const IMAGES_URL = `${API_ROUTES.PREFIX}${API_ROUTES.IMAGES}`;
const IMAGE_URL = `${IMAGES_URL}/${IMAGE_ID}`;

describe('image routes', () => {
  let context: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    context = createTestApp();
  });

  describe(`GET ${IMAGES_URL}`, () => {
    it('returns an empty list to a visitor without a session', async () => {
      const response = await request(context.app).get(IMAGES_URL);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toEqual({ items: [], nextCursor: null });
      expect(context.imageService.list).not.toHaveBeenCalled();
    });

    it("lists the caller's images with validated, defaulted query parameters", async () => {
      const page = { items: [buildImageDto()], nextCursor: IMAGE_ID };
      context.sessionManager.getUserId.mockReturnValue(USER_ID);
      context.imageService.list.mockResolvedValue(page);

      const response = await request(context.app).get(IMAGES_URL).query({ status: 'ACCEPTED' });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toEqual(page);
      expect(context.imageService.list).toHaveBeenCalledWith(USER_ID, {
        status: 'ACCEPTED',
        limit: PAGINATION.DEFAULT_LIMIT,
      });
    });

    it.each([
      ['an unknown status', { status: 'DONE' }],
      ['a limit above the maximum', { limit: PAGINATION.MAX_LIMIT + 1 }],
      ['a non-numeric limit', { limit: 'ten' }],
      ['a malformed cursor', { cursor: 'not-a-uuid' }],
    ])('returns 400 for %s', async (_case, query) => {
      const response = await request(context.app).get(IMAGES_URL).query(query);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.error.code).toBe(ERROR_CODES.BAD_REQUEST);
    });
  });

  describe(`GET ${IMAGES_URL}/:id`, () => {
    it('returns 400 for an id that is not a UUID', async () => {
      const response = await request(context.app).get(`${IMAGES_URL}/not-a-uuid`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.error.code).toBe(ERROR_CODES.BAD_REQUEST);
    });

    it('returns 404 to a visitor without a session', async () => {
      const response = await request(context.app).get(IMAGE_URL);

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(context.imageService.get).not.toHaveBeenCalled();
    });

    it('returns a 404 ApiErrorBody for an image the caller does not own', async () => {
      context.sessionManager.getUserId.mockReturnValue(USER_ID);
      context.imageService.get.mockRejectedValue(new NotFoundError(ERROR_MESSAGES.IMAGE_NOT_FOUND));

      const response = await request(context.app).get(IMAGE_URL);

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toEqual({
        error: { code: ERROR_CODES.NOT_FOUND, message: ERROR_MESSAGES.IMAGE_NOT_FOUND },
      });
    });

    it("returns the caller's image", async () => {
      const dto = buildImageDto();
      context.sessionManager.getUserId.mockReturnValue(USER_ID);
      context.imageService.get.mockResolvedValue(dto);

      const response = await request(context.app).get(IMAGE_URL);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toEqual(dto);
      expect(context.imageService.get).toHaveBeenCalledWith(USER_ID, IMAGE_ID);
    });
  });

  describe(`DELETE ${IMAGES_URL}/:id`, () => {
    it("deletes the caller's image with 204", async () => {
      context.sessionManager.getUserId.mockReturnValue(USER_ID);
      context.imageService.delete.mockResolvedValue();

      const response = await request(context.app).delete(IMAGE_URL);

      expect(response.status).toBe(HTTP_STATUS.NO_CONTENT);
      expect(context.imageService.delete).toHaveBeenCalledWith(USER_ID, IMAGE_ID);
    });

    it('returns 404 to a visitor without a session', async () => {
      const response = await request(context.app).delete(IMAGE_URL);

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(context.imageService.delete).not.toHaveBeenCalled();
    });
  });
});
