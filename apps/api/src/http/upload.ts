import { detectImageFormat, SNIFF_BYTE_LENGTH, type ImageFormat } from '@aragon/shared';
import type { Request, RequestHandler } from 'express';
import multer from 'multer';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_PROTOCOL, UPLOAD } from '../constants';
import { BadRequestError, PayloadTooLargeError, UnsupportedMediaTypeError, type HttpError } from './errors';

/** A file that passed the upload gate: present, within limits, and a supported image by its bytes. */
export interface UploadedImage {
  buffer: Buffer;
  /** Client-supplied and untrusted; sanitised before it is stored. */
  originalName: string;
  format: ImageFormat;
}

/**
 * Buffers one bounded file in memory. There is deliberately no `fileFilter`: the client's MIME type
 * and extension are ignored, and the format decision is made on the bytes once the file is in.
 */
const parseSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD.MAX_FILE_BYTES,
    files: UPLOAD.MAX_FILES_PER_REQUEST,
    fields: UPLOAD.MAX_FIELDS,
    parts: UPLOAD.MAX_PARTS,
    fieldNameSize: UPLOAD.MAX_FIELD_NAME_BYTES,
  },
  defParamCharset: HTTP_PROTOCOL.MULTIPART_PARAM_CHARSET,
}).single(UPLOAD.FIELD_NAME);

/** Multipart parsing. Every parser failure (limits, malformed or aborted bodies) is the client's and maps to a 4xx. */
export const receiveImageUpload: RequestHandler = (req, res, next) => {
  parseSingleFile(req, res, (error?: unknown) => {
    if (error) {
      next(toUploadError(error));
      return;
    }
    next();
  });
};

/** Checks what the parser received: a file must be present and be JPEG, PNG or HEIC by its magic bytes. */
export function readUploadedImage(req: Request): UploadedImage {
  const { file } = req;
  if (!file) throw new BadRequestError(ERROR_MESSAGES.FILE_REQUIRED, ERROR_CODES.FILE_REQUIRED);

  const format = detectImageFormat(file.buffer.subarray(0, SNIFF_BYTE_LENGTH));
  if (format === null) throw new UnsupportedMediaTypeError();

  return { buffer: file.buffer, originalName: file.originalname, format };
}

function toUploadError(error: unknown): HttpError {
  if (!(error instanceof multer.MulterError)) return new BadRequestError(ERROR_MESSAGES.MALFORMED_UPLOAD);
  if (error.code === 'LIMIT_FILE_SIZE') return new PayloadTooLargeError();
  return new BadRequestError(error.message);
}
