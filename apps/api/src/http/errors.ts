import { REJECTION_MESSAGES, type ApiErrorBody } from '@aragon/shared';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../constants';

type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * An error whose message is safe to show to clients. Anything that is not an HttpError
 * is treated as internal and answered with a generic 500 (see `error-handler.ts`).
 */
export class HttpError extends Error {
  constructor(
    readonly status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message } };
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.BAD_REQUEST) {
    super(HTTP_STATUS.BAD_REQUEST, code, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, message);
  }
}

export class PayloadTooLargeError extends HttpError {
  constructor() {
    super(HTTP_STATUS.PAYLOAD_TOO_LARGE, ERROR_CODES.FILE_TOO_LARGE, REJECTION_MESSAGES.FILE_TOO_LARGE);
  }
}

export class UnsupportedMediaTypeError extends HttpError {
  constructor() {
    super(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE, ERROR_CODES.UNSUPPORTED_FORMAT, REJECTION_MESSAGES.UNSUPPORTED_FORMAT);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor() {
    super(HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMITED, ERROR_MESSAGES.RATE_LIMITED);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(options?: ErrorOptions) {
    super(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      ERROR_MESSAGES.SERVICE_UNAVAILABLE,
      options,
    );
  }
}

/** Stand-in for unexpected failures: the client gets a generic message, the cause is only logged. */
export class InternalServerError extends HttpError {
  constructor(options?: ErrorOptions) {
    super(HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, ERROR_MESSAGES.INTERNAL_ERROR, options);
  }
}
