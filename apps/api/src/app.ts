import cookieParser from 'cookie-parser';
import express, { type Application } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config';
import { API_ROUTES, REQUEST } from './constants';
import { createCorsMiddleware } from './http/cors';
import { errorHandler, notFoundHandler } from './http/error-handler';
import { createHealthRouter, type HealthCheck } from './http/health.router';
import { createImagesRouter } from './http/images.router';
import type { SessionManager } from './http/session';
import type { ImageService } from './images/image.service';

export interface AppDependencies {
  config: Pick<AppConfig, 'webOrigin' | 'sessionSecret'>;
  imageService: ImageService;
  sessionManager: SessionManager;
  checkHealth: HealthCheck;
}

/**
 * Builds the Express app from injected dependencies (no I/O here), so tests can drive it with test doubles.
 * No endpoint accepts a JSON body, so no JSON body parser is mounted.
 */
export function createApp({ config, imageService, sessionManager, checkHealth }: AppDependencies): Application {
  const app = express();

  app.set('trust proxy', REQUEST.TRUSTED_PROXY_HOPS);
  app.use(helmet());
  app.use(createCorsMiddleware(config.webOrigin));
  app.use(cookieParser(config.sessionSecret));

  app.use(API_ROUTES.PREFIX, createHealthRouter(checkHealth), createImagesRouter({ imageService, sessionManager }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
