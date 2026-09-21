/**
 * Every tunable number and fixed string the API/worker uses lives here, grouped by concern.
 * Environment-specific values (URLs, credentials, ports) live in `config.ts` instead.
 */
import { UPLOAD_LIMITS } from '@aragon/shared';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
const DAYS_PER_YEAR = 365;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

export const HTTP_STATUS = {
  OK: 200,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** Machine-readable error codes returned in `ApiErrorBody.error.code`. */
export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  FILE_REQUIRED: 'FILE_REQUIRED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const API_ROUTES = {
  PREFIX: '/api',
  IMAGES: '/images',
  HEALTH: '/health',
} as const;

export const UPLOAD = {
  /** Multipart field that carries the file. One file per request (per-file progress + isolation). */
  FIELD_NAME: 'file',
  MAX_FILES_PER_REQUEST: 1,
  MAX_FILE_BYTES: UPLOAD_LIMITS.MAX_FILE_BYTES,
  /** Non-file form fields we accept (none are needed). */
  MAX_FIELDS: 0,
  /** Multipart parts: the file itself plus headroom for a stray field. */
  MAX_PARTS: 2,
  MAX_FIELD_NAME_BYTES: 100,
  /** Matches `images.original_name VARCHAR(255)`. */
  MAX_ORIGINAL_NAME_LENGTH: 255,
} as const;

export const REQUEST = {
  /** Hops of reverse proxies to trust for client IPs (rate limiting). */
  TRUSTED_PROXY_HOPS: 1,
} as const;

export const RATE_LIMIT = {
  UPLOAD_WINDOW_MS: MS_PER_MINUTE,
  /** Generous enough for a user dropping a whole camera roll, tight enough to stop abuse. */
  UPLOAD_MAX_REQUESTS_PER_WINDOW: 60,
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

export const SESSION = {
  COOKIE_NAME: 'aragon_uid',
  MAX_AGE_MS: DAYS_PER_YEAR * MS_PER_DAY,
} as const;

export const STORAGE = {
  /** Signed GET URLs expire quickly; the UI refreshes them on every list/poll. */
  SIGNED_URL_TTL_SECONDS: 10 * SECONDS_PER_MINUTE,
  KEY_PREFIX: 'users',
  ORIGINAL_OBJECT_NAME: 'original',
  NORMALIZED_OBJECT_NAME: 'normalized.jpg',
  THUMBNAIL_OBJECT_NAME: 'thumbnail.jpg',
  JPEG_CONTENT_TYPE: 'image/jpeg',
} as const;

export const FORMAT_CONTENT_TYPES = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  HEIC: 'image/heic',
} as const;

export const IMAGE_PROCESSING = {
  /** Decompression-bomb guard: covers 48 MP phone output (≈ 8064×6048), rejects 100 MP+ inputs. */
  MAX_INPUT_PIXELS: 64_000_000,
  /** Working copy used for every check (keeps face detection/blur/hash cost bounded). */
  WORKING_MAX_DIMENSION_PX: 2048,
  WORKING_JPEG_QUALITY: 90,
  THUMBNAIL_WIDTH_PX: 480,
  THUMBNAIL_JPEG_QUALITY: 80,
  RGB_CHANNELS: 3,
  RGBA_CHANNELS: 4,
} as const;

export const IMAGE_RULES = {
  MIN_FILE_BYTES: UPLOAD_LIMITS.MIN_FILE_BYTES,
  /** Shortest side of the auto-oriented image. */
  MIN_SHORT_SIDE_PX: 512,
} as const;

/** SCRFD-10G settings, mirroring InsightFace `FaceAnalysis.prepare(det_thresh=0.5, det_size=(640, 640))`. */
export const FACE_DETECTION = {
  INPUT_SIZE_PX: 640,
  /** Feature-map strides of the three detection heads. */
  STRIDES: [8, 16, 32],
  ANCHORS_PER_LOCATION: 2,
  /** Input normalisation: (pixel − mean) / std, RGB order. */
  PIXEL_MEAN: 127.5,
  PIXEL_STD: 128,
  /** Detections below this confidence are discarded; zero survivors ⇒ "no face". */
  SCORE_THRESHOLD: 0.5,
  NMS_IOU_THRESHOLD: 0.4,
  /** Values per anchor in each output tensor kind (used to identify outputs by shape). */
  SCORE_VALUES_PER_ANCHOR: 1,
  BOX_VALUES_PER_ANCHOR: 4,
  KEYPOINT_VALUES_PER_ANCHOR: 10,
} as const;

export const FACE_MODEL = {
  FILE_NAME: 'det_10g.onnx',
  /** InsightFace buffalo_l detector (non-commercial research licence), Hugging Face mirror. */
  DOWNLOAD_URL: 'https://huggingface.co/public-data/insightface/resolve/main/models/buffalo_l/det_10g.onnx',
  SHA256: '5838f7fe053675b1c7a08b633df49e7af5495cee0493c7dcf6697200b85b5b91',
  SIZE_BYTES: 16_923_827,
} as const;

export const FACE_RULES = {
  /** A second face only counts if its box is at least this share of the main face (ignores bystanders/posters). */
  MIN_SECONDARY_FACE_AREA_RATIO: 0.1,
  /** Main face height relative to image height. */
  MIN_FACE_HEIGHT_RATIO: 0.15,
  MIN_FACE_HEIGHT_PX: 100,
} as const;

export const BLUR = {
  /** Face box is grown by this fraction on each side before measuring sharpness. */
  FACE_CROP_PADDING_RATIO: 0.15,
  /** Crops are resized to a fixed width so the score is comparable across resolutions. */
  ANALYSIS_WIDTH_PX: 256,
  /** Variance of the Laplacian below this ⇒ blurry (calibrated on sharp vs. blurred copies). */
  MIN_LAPLACIAN_VARIANCE: 100,
} as const;

export const DUPLICATE = {
  /** dHash compares horizontally adjacent pixels: (width − 1) × height = 64 bits. */
  HASH_WIDTH_PX: 9,
  HASH_HEIGHT_PX: 8,
  HASH_BITS: 64,
  /** Hamming distance at or below this ⇒ "too similar" to an accepted photo. */
  MAX_HAMMING_DISTANCE: 6,
} as const;

export const QUEUE = {
  POLL_INTERVAL_MS: MS_PER_SECOND,
  /** Images claimed (and processed concurrently) per worker iteration. */
  BATCH_SIZE: 4,
  /** A PROCESSING row untouched for this long is assumed orphaned by a crashed worker and re-claimed. */
  STALE_LOCK_MS: 5 * MS_PER_MINUTE,
  MAX_ATTEMPTS: 3,
  /** Truncate stored error messages. */
  MAX_ERROR_MESSAGE_LENGTH: 500,
} as const;

/** Client-facing error messages; machine-readable codes live in ERROR_CODES. Upload rejections reuse REJECTION_MESSAGES. */
export const ERROR_MESSAGES = {
  ROUTE_NOT_FOUND: 'Route not found.',
  IMAGE_NOT_FOUND: 'Image not found.',
  FILE_REQUIRED: `Attach a photo in the "${UPLOAD.FIELD_NAME}" form field.`,
  MALFORMED_UPLOAD: 'The upload could not be read. Please try again.',
  RATE_LIMITED: 'Too many uploads. Please wait a moment and try again.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
} as const;

/** Anonymous-session cookie attributes (name and lifetime live in SESSION). */
export const SESSION_COOKIE = {
  SAME_SITE: 'lax',
  PATH: '/',
} as const;

/** Cross-origin policy for the single trusted web origin (`config.webOrigin`). */
export const CORS = {
  ALLOWED_METHODS: 'GET, POST, DELETE',
  ALLOWED_HEADERS: 'Content-Type',
  PREFLIGHT_MAX_AGE_SECONDS: 10 * SECONDS_PER_MINUTE,
} as const;

/** Fixed wire-level strings of the HTTP layer. */
export const HTTP_PROTOCOL = {
  /** IETF `RateLimit` + `RateLimit-Policy` headers (draft 8); legacy `X-RateLimit-*` headers stay off. */
  RATE_LIMIT_HEADERS: 'draft-8',
  /** Browsers send multipart file names as raw UTF-8; busboy would otherwise decode them as latin1. */
  MULTIPART_PARAM_CHARSET: 'utf8',
  HEALTHY_STATUS: 'ok',
} as const;

/** Display-name rules for client file names (the length cap is UPLOAD.MAX_ORIGINAL_NAME_LENGTH). */
export const ORIGINAL_NAME = {
  /** Stored when nothing printable is left after sanitising. */
  FALLBACK: 'photo',
} as const;

/** libvips loader allow-list: sharp may only parse JPEG/PNG buffers (HEIC is decoded by libheif first). */
export const SHARP_HARDENING = {
  BLOCKED_OPERATIONS: ['VipsForeignLoad'],
  ALLOWED_OPERATIONS: ['VipsForeignLoadJpegBuffer', 'VipsForeignLoadPngBuffer'],
} as const;

/** SCRFD tensor layout details not covered by FACE_DETECTION. */
export const SCRFD_TENSOR = {
  /** One image per inference call. */
  BATCH_SIZE: 1,
  /** Letterbox padding is black (before normalisation), as in InsightFace. */
  PADDING_PIXEL_VALUE: 0,
  /** Landmarks are flattened (x, y) pairs. */
  VALUES_PER_LANDMARK: 2,
} as const;

/** 4-neighbour Laplacian kernel [0 1 0; 1 −4 1; 0 1 0] used by the blur check. */
export const LAPLACIAN = {
  CENTER_WEIGHT: 4,
} as const;

export const WORKER = {
  /** Stored on rows abandoned after QUEUE.MAX_ATTEMPTS claims without a verdict (e.g. repeated crashes). */
  EXHAUSTED_ERROR_MESSAGE: 'Gave up after the maximum number of processing attempts',
  FAILURE_EXIT_CODE: 1,
} as const;
