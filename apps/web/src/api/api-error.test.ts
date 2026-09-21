import { describe, expect, it } from 'vitest';
import { CLIENT_ERROR_CODES, ERROR_MESSAGES } from '../constants';
import { ApiError, isSuccessStatus, parseJsonSafely } from './api-error';

describe('ApiError.fromResponse', () => {
  it('uses the code and message of an ApiErrorBody', () => {
    const error = ApiError.fromResponse(415, { error: { code: 'UNSUPPORTED_FORMAT', message: 'Only JPG…' } });
    expect(error).toMatchObject({ status: 415, code: 'UNSUPPORTED_FORMAT', message: 'Only JPG…' });
    expect(error).toBeInstanceOf(Error);
  });

  it('falls back to a generic error for anything else (HTML error pages, empty bodies, wrong shapes)', () => {
    for (const body of [null, 'Bad Gateway', { error: 'oops' }, { error: { code: 1, message: 'x' } }]) {
      expect(ApiError.fromResponse(502, body)).toMatchObject({
        status: 502,
        code: CLIENT_ERROR_CODES.UNKNOWN,
        message: ERROR_MESSAGES.UNKNOWN,
      });
    }
  });
});

describe('response helpers', () => {
  it('never throws on malformed JSON', () => {
    expect(parseJsonSafely('')).toBeNull();
    expect(parseJsonSafely('<html>')).toBeNull();
    expect(parseJsonSafely('{"ok":true}')).toEqual({ ok: true });
  });

  it('treats only 2xx as success', () => {
    expect(isSuccessStatus(202)).toBe(true);
    expect(isSuccessStatus(204)).toBe(true);
    expect(isSuccessStatus(304)).toBe(false);
    expect(isSuccessStatus(0)).toBe(false);
  });
});
