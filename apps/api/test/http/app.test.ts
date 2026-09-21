import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ROUTES, ERROR_CODES, ERROR_MESSAGES, HTTP_PROTOCOL, HTTP_STATUS } from '../../src/constants';
import { createTestApp, TEST_CONFIG, USER_ID } from './test-doubles';

const HEALTH_URL = `${API_ROUTES.PREFIX}${API_ROUTES.HEALTH}`;
const IMAGES_URL = `${API_ROUTES.PREFIX}${API_ROUTES.IMAGES}`;

describe('app', () => {
  let context: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    context = createTestApp();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers unknown routes with a JSON 404', async () => {
    const response = await request(context.app).get('/api/nope');

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(response.body).toEqual({ error: { code: ERROR_CODES.NOT_FOUND, message: ERROR_MESSAGES.ROUTE_NOT_FOUND } });
  });

  it('hides internal error details behind a generic 500 and logs the cause', async () => {
    const internal = new Error('connect ECONNREFUSED 10.0.0.7:5432 users/secret-key');
    context.sessionManager.getUserId.mockReturnValue(USER_ID);
    context.imageService.list.mockRejectedValue(internal);

    const response = await request(context.app).get(IMAGES_URL);

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(response.body).toEqual({
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: ERROR_MESSAGES.INTERNAL_ERROR },
    });
    expect(response.text).not.toContain('ECONNREFUSED');
    expect(console.error).toHaveBeenCalledWith(internal);
  });

  it('answers an undecodable URL parameter with 400, not 500', async () => {
    const response = await request(context.app).get(`${IMAGES_URL}/%E0%A4%A`);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(response.body.error.code).toBe(ERROR_CODES.BAD_REQUEST);
  });

  it('sets security headers and hides the framework', async () => {
    const response = await request(context.app).get(HEALTH_URL);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  describe('health', () => {
    it('returns 200 when dependencies are reachable', async () => {
      const response = await request(context.app).get(HEALTH_URL);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toEqual({ status: HTTP_PROTOCOL.HEALTHY_STATUS });
    });

    it('returns 503 when a dependency is down', async () => {
      context.checkHealth.mockRejectedValue(new Error('database unreachable'));

      const response = await request(context.app).get(HEALTH_URL);

      expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      expect(response.body.error.code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
      expect(response.text).not.toContain('database unreachable');
    });
  });

  describe('CORS', () => {
    it('answers preflights from the web origin with credentialed CORS headers', async () => {
      const response = await request(context.app)
        .options(`${IMAGES_URL}/some-id`)
        .set('Origin', TEST_CONFIG.webOrigin)
        .set('Access-Control-Request-Method', 'DELETE');

      expect(response.status).toBe(HTTP_STATUS.NO_CONTENT);
      expect(response.headers['access-control-allow-origin']).toBe(TEST_CONFIG.webOrigin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toContain('DELETE');
    });

    it('sends no CORS headers to other origins', async () => {
      const response = await request(context.app).get(HEALTH_URL).set('Origin', 'https://evil.example');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
