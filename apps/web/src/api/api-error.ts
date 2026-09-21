import type { ApiErrorBody } from '@aragon/shared';
import { CLIENT_ERROR_CODES, ERROR_MESSAGES, HTTP } from '../constants';

/** A failed API call. `status` is the HTTP status (0 when no response arrived); `code` is machine-readable. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  /** Builds an error from any response body; anything that isn't an `ApiErrorBody` gets a generic message. */
  static fromResponse(status: number, body: unknown): ApiError {
    if (isApiErrorBody(body)) return new ApiError(status, body.error.code, body.error.message);
    return new ApiError(status, CLIENT_ERROR_CODES.UNKNOWN, ERROR_MESSAGES.UNKNOWN);
  }

  static network(): ApiError {
    return new ApiError(HTTP.NO_RESPONSE_STATUS, CLIENT_ERROR_CODES.NETWORK_ERROR, ERROR_MESSAGES.NETWORK);
  }

  static aborted(): ApiError {
    return new ApiError(HTTP.NO_RESPONSE_STATUS, CLIENT_ERROR_CODES.ABORTED, ERROR_MESSAGES.ABORTED);
  }
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!isObject(value) || !isObject(value.error)) return false;
  return typeof value.error.code === 'string' && typeof value.error.message === 'string';
}

export function isSuccessStatus(status: number): boolean {
  return status >= HTTP.SUCCESS_STATUS_MIN && status < HTTP.SUCCESS_STATUS_MAX_EXCLUSIVE;
}

/** `JSON.parse` that never throws: empty or malformed bodies become null. */
export function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
