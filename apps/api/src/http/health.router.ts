import { Router } from 'express';
import { API_ROUTES, HTTP_PROTOCOL, HTTP_STATUS } from '../constants';
import { ServiceUnavailableError } from './errors';

/** Resolves when the API's dependencies are reachable; rejects otherwise. */
export type HealthCheck = () => Promise<void>;

/** Liveness + readiness probe: 200 when `checkHealth` passes, 503 (cause logged) when it fails. */
export function createHealthRouter(checkHealth: HealthCheck): Router {
  const router = Router();

  router.get(API_ROUTES.HEALTH, async (_req, res) => {
    try {
      await checkHealth();
    } catch (error) {
      throw new ServiceUnavailableError({ cause: error });
    }
    res.status(HTTP_STATUS.OK).json({ status: HTTP_PROTOCOL.HEALTHY_STATUS });
  });

  return router;
}
