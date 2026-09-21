import type { RequestHandler } from 'express';
import { CORS, HTTP_STATUS } from '../constants';

const PREFLIGHT_METHOD = 'OPTIONS';

/**
 * Lets exactly one trusted origin (the web app) call the API with cookies. Only needed when the web app
 * is not served through the dev proxy. Requests from any other origin get no CORS headers, so browsers block them.
 */
export function createCorsMiddleware(allowedOrigin: string): RequestHandler {
  const origin = new URL(allowedOrigin).origin;

  return (req, res, next) => {
    res.vary('Origin');
    if (req.headers.origin !== origin) {
      next();
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method !== PREFLIGHT_METHOD) {
      next();
      return;
    }
    res.setHeader('Access-Control-Allow-Methods', CORS.ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', CORS.ALLOWED_HEADERS);
    res.setHeader('Access-Control-Max-Age', String(CORS.PREFLIGHT_MAX_AGE_SECONDS));
    res.status(HTTP_STATUS.NO_CONTENT).end();
  };
}
