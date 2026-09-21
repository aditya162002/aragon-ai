import type { ImageListResponse } from '@aragon/shared';
import { Router, type Request } from 'express';
import { API_ROUTES, ERROR_MESSAGES, HTTP_STATUS } from '../constants';
import type { ImageService } from '../images/image.service';
import { NotFoundError } from './errors';
import { createUploadRateLimiter } from './rate-limit';
import { imageParamsSchema, listImagesQuerySchema, parseRequest } from './request-validation';
import type { SessionManager } from './session';
import { readUploadedImage, receiveImageUpload } from './upload';

const IMAGE_BY_ID_ROUTE = `${API_ROUTES.IMAGES}/:id`;

export interface ImagesRouterDependencies {
  imageService: ImageService;
  sessionManager: SessionManager;
}

/** Thin HTTP adapter: parse and validate, call the service, respond. */
export function createImagesRouter({ imageService, sessionManager }: ImagesRouterDependencies): Router {
  const router = Router();

  /** A visitor without a session owns no images, so every by-id lookup is a 404. */
  const requireOwnerId = (req: Request): string => {
    const userId = sessionManager.getUserId(req);
    if (userId === null) throw new NotFoundError(ERROR_MESSAGES.IMAGE_NOT_FOUND);
    return userId;
  };

  router.post(API_ROUTES.IMAGES, createUploadRateLimiter(), receiveImageUpload, async (req, res) => {
    const upload = readUploadedImage(req);
    // The user is created only now, after the upload passed the gate.
    const userId = await sessionManager.ensureUserId(req, res);
    const image = await imageService.create(userId, upload);
    res.status(HTTP_STATUS.ACCEPTED).json(image);
  });

  router.get(API_ROUTES.IMAGES, async (req, res) => {
    const query = parseRequest(listImagesQuerySchema, req.query);
    const userId = sessionManager.getUserId(req);
    const page: ImageListResponse =
      userId === null ? { items: [], nextCursor: null } : await imageService.list(userId, query);
    res.status(HTTP_STATUS.OK).json(page);
  });

  router.get(IMAGE_BY_ID_ROUTE, async (req, res) => {
    const { id } = parseRequest(imageParamsSchema, req.params);
    const image = await imageService.get(requireOwnerId(req), id);
    res.status(HTTP_STATUS.OK).json(image);
  });

  router.delete(IMAGE_BY_ID_ROUTE, async (req, res) => {
    const { id } = parseRequest(imageParamsSchema, req.params);
    await imageService.delete(requireOwnerId(req), id);
    res.status(HTTP_STATUS.NO_CONTENT).end();
  });

  return router;
}
