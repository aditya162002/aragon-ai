import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { HTTP_PROTOCOL, RATE_LIMIT } from '../constants';
import { TooManyRequestsError } from './errors';

/**
 * Caps uploads per client IP. Each call owns an in-memory counter, which is correct for a single
 * API instance; several instances would share a store (e.g. Redis) instead.
 */
export function createUploadRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT.UPLOAD_WINDOW_MS,
    limit: RATE_LIMIT.UPLOAD_MAX_REQUESTS_PER_WINDOW,
    standardHeaders: HTTP_PROTOCOL.RATE_LIMIT_HEADERS,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError()),
  });
}
