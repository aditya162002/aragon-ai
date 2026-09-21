/**
 * Every tunable number and fixed string the web app uses lives here, grouped by concern.
 * Upload rules shared with the API (limits, formats, rejection reasons) come from `@aragon/shared`.
 *
 * Only type imports from `@aragon/shared` here: this file is also loaded by `vite.config.ts`.
 */
import type { ImageFormat, RejectionReason } from '@aragon/shared';

/** API upload errors that mean "this file will never be accepted" (shown as a rejection, not a retryable failure). */
const UPLOAD_REJECTION_ERROR_CODES: readonly RejectionReason[] = ['UNSUPPORTED_FORMAT', 'FILE_TOO_LARGE'];
/** Formats every browser can render, so we can show an instant local preview. HEIC waits for the server thumbnail. */
const PREVIEWABLE_FORMATS: readonly ImageFormat[] = ['JPEG', 'PNG'];

export const API = {
  /** Same-origin path; the Vite dev server proxies it to the API. */
  BASE_PATH: '/api',
  IMAGES_PATH: '/images',
  /** Multipart field that carries the file (one file per request). */
  UPLOAD_FIELD_NAME: 'file',
  LIMIT_QUERY_PARAM: 'limit',
  /** Per-user galleries are small, so a single page of the maximum size is enough. */
  LIST_PAGE_LIMIT: 100,
} as const;

export const DEV_SERVER = {
  API_PROXY_TARGET_ENV: 'VITE_API_PROXY_TARGET',
  DEFAULT_API_PROXY_TARGET: 'http://localhost:4000',
} as const;

export const HTTP = {
  METHODS: {
    GET: 'GET',
    POST: 'POST',
    DELETE: 'DELETE',
  },
  SUCCESS_STATUS_MIN: 200,
  SUCCESS_STATUS_MAX_EXCLUSIVE: 300,
  /** XHR reports status 0 when the request never got a response (offline, DNS, CORS). */
  NO_RESPONSE_STATUS: 0,
} as const;

/** Error codes raised by the browser itself (the API's own codes arrive in `ApiErrorBody`). */
export const CLIENT_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  ABORTED: 'ABORTED',
  UNKNOWN: 'UNKNOWN',
} as const;

export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Check your connection and try again.',
  ABORTED: 'Upload cancelled.',
  UNKNOWN: 'Something went wrong. Please try again.',
  LOAD_IMAGES: "We couldn't load your photos.",
} as const;

export const QUERY = {
  IMAGES_KEY: ['images'],
  /** Poll the gallery this often while any photo is still being checked. */
  POLL_INTERVAL_MS: 1500,
} as const;

export const UPLOADS = {
  /** Parallel uploads per browser tab; the rest wait in the queue. */
  CONCURRENCY: 3,
  /**
   * The API creates the anonymous-session cookie on a visitor's first upload. Parallel first uploads
   * would each create a separate user, so until a session exists files go up one at a time.
   */
  CONCURRENCY_BEFORE_SESSION: 1,
  LOCAL_ID_PREFIX: 'local-',
  REJECTION_ERROR_CODES: UPLOAD_REJECTION_ERROR_CODES,
  PREVIEWABLE_FORMATS,
} as const;

export const PERCENT = {
  MIN: 0,
  MAX: 100,
} as const;

export const PHOTO_RULES = {
  /** Mirrors the API's `IMAGE_RULES.MIN_SHORT_SIDE_PX`; only used for guideline copy. */
  MIN_SHORT_SIDE_PX: 512,
} as const;

export const UI = {
  ROOT_ELEMENT_ID: 'root',
  LOCALE: 'en-US',
  /** Brand mark served from `public/` (also the favicon). */
  LOGO_SRC: '/favicon.svg',
  /** Placeholder cards shown while the gallery loads for the first time. */
  SKELETON_CARD_COUNT: 4,
  /** Separator between several verdicts announced at once. */
  ANNOUNCEMENT_SEPARATOR: '. ',
} as const;
