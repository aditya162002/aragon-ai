import type { ImageDto } from '@aragon/shared';
import { vi } from 'vitest';
import { createApp } from '../../src/app';
import type { HealthCheck } from '../../src/http/health.router';
import type { SessionManager } from '../../src/http/session';
import type { ImageService } from '../../src/images/image.service';

export const TEST_CONFIG = {
  webOrigin: 'http://localhost:5173',
  sessionSecret: 'test-session-secret-at-least-32-characters',
};

export const USER_ID = '6f1c2a4e-8a57-4c1b-9d3e-2b7f0c9a1d55';
export const IMAGE_ID = '0b8e5f3a-1c2d-4e6f-8a9b-0c1d2e3f4a5b';

export function buildImageDto(overrides: Partial<ImageDto> = {}): ImageDto {
  return {
    id: IMAGE_ID,
    originalName: 'selfie.jpg',
    format: 'JPEG',
    sizeBytes: 2048,
    status: 'PENDING',
    rejectionReason: null,
    width: null,
    height: null,
    thumbnailUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    processedAt: null,
    ...overrides,
  };
}

/** Express app wired with mocks only (London school): no database, storage or network. */
export function createTestApp() {
  const imageService = {
    create: vi.fn<ImageService['create']>(),
    list: vi.fn<ImageService['list']>(),
    get: vi.fn<ImageService['get']>(),
    delete: vi.fn<ImageService['delete']>(),
  } satisfies Pick<ImageService, keyof ImageService>;

  const sessionManager = {
    getUserId: vi.fn<SessionManager['getUserId']>().mockReturnValue(null),
    ensureUserId: vi.fn<SessionManager['ensureUserId']>().mockResolvedValue(USER_ID),
  } satisfies Pick<SessionManager, keyof SessionManager>;

  const checkHealth = vi.fn<HealthCheck>().mockResolvedValue(undefined);

  const app = createApp({
    config: TEST_CONFIG,
    // The doubles implement the full public surface; the casts only drop the classes' private fields.
    imageService: imageService as unknown as ImageService,
    sessionManager: sessionManager as unknown as SessionManager,
    checkHealth,
  });

  return { app, imageService, sessionManager, checkHealth };
}
