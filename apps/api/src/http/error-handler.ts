import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants';
import { BadRequestError, HttpError, InternalServerError, NotFoundError } from './errors';

/** JSON 404 for any request no router handled. */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError(ERROR_MESSAGES.ROUTE_NOT_FOUND));
};

/**
 * Last middleware: turns every error into an `ApiErrorBody`. Server-side failures are logged
 * with their cause and answered generically, so internals (SQL, storage keys, stacks) never leak.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const httpError = toHttpError(error);
  if (httpError.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) console.error(error);
  res.status(httpError.status).json(httpError.toBody());
};

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (isMalformedRequestError(error)) return new BadRequestError(error.message);
  return new InternalServerError({ cause: error });
}

/** Express's router flags requests it cannot parse (e.g. an undecodable `%zz` URL param) with a 4xx `status`. */
function isMalformedRequestError(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= HTTP_STATUS.BAD_REQUEST &&
    error.status < HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}
