import { MAGIC_BYTES } from '@aragon/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FORMAT_CONTENT_TYPES } from '../../src/constants';
import type { PrismaClient } from '../../src/db';
import { NotFoundError } from '../../src/http/errors';
import type { ImageDtoSource } from '../../src/images/image.mapper';
import { ImageService } from '../../src/images/image.service';
import type { StorageService } from '../../src/storage/storage.service';

const USER_ID = '6f1c2a4e-8a57-4c1b-9d3e-2b7f0c9a1d55';
const IMAGE_ID = '0b8e5f3a-1c2d-4e6f-8a9b-0c1d2e3f4a5b';
const UUID_PATTERN = '[0-9a-f-]{36}';
const JPEG_BYTES = Buffer.from([...MAGIC_BYTES.JPEG, 0xe0]);

function buildRow(overrides: Partial<ImageDtoSource> = {}): ImageDtoSource {
  return {
    id: IMAGE_ID,
    originalName: 'selfie.jpg',
    format: 'JPEG',
    sizeBytes: JPEG_BYTES.byteLength,
    status: 'PENDING',
    rejectionReason: null,
    width: null,
    height: null,
    thumbnailKey: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    processedAt: null,
    ...overrides,
  };
}

function createService() {
  const images = { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), deleteMany: vi.fn() };
  const storage = {
    putObject: vi.fn<StorageService['putObject']>().mockResolvedValue(),
    getObject: vi.fn<StorageService['getObject']>(),
    deleteObjects: vi.fn<StorageService['deleteObjects']>().mockResolvedValue(),
    getSignedReadUrl: vi.fn<StorageService['getSignedReadUrl']>(async (key) => `https://storage.test/${key}?signed`),
    ensureBucket: vi.fn<StorageService['ensureBucket']>(),
  } satisfies StorageService;
  // Only the `image` delegate is used; the cast narrows a full PrismaClient down to that test double.
  const service = new ImageService({ image: images } as unknown as PrismaClient, storage);
  return { service, images, storage };
}

describe('ImageService', () => {
  let doubles: ReturnType<typeof createService>;

  beforeEach(() => {
    doubles = createService();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    const upload = { buffer: JPEG_BYTES, originalName: '../../etc/selfie.jpg', format: 'JPEG' as const };

    it('stores the original under a server-generated key, then inserts the PENDING row', async () => {
      const { service, images, storage } = doubles;
      images.create.mockResolvedValue(buildRow());

      const dto = await service.create(USER_ID, upload);

      const [key, body, contentType] = storage.putObject.mock.calls[0];
      expect(key).toMatch(new RegExp(`^users/${USER_ID}/${UUID_PATTERN}/original$`));
      expect(body).toBe(JPEG_BYTES);
      expect(contentType).toBe(FORMAT_CONTENT_TYPES.JPEG);
      expect(images.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: USER_ID,
            originalName: 'selfie.jpg',
            format: 'JPEG',
            sizeBytes: JPEG_BYTES.byteLength,
            originalKey: key,
          }),
        }),
      );
      expect(storage.putObject.mock.invocationCallOrder[0]).toBeLessThan(images.create.mock.invocationCallOrder[0]);
      expect(dto).toMatchObject({ id: IMAGE_ID, status: 'PENDING', thumbnailUrl: null });
    });

    it('deletes the stored object and rethrows when the insert fails', async () => {
      const { service, images, storage } = doubles;
      const failure = new Error('insert failed');
      images.create.mockRejectedValue(failure);

      await expect(service.create(USER_ID, upload)).rejects.toBe(failure);

      const [storedKey] = storage.putObject.mock.calls[0];
      expect(storage.deleteObjects).toHaveBeenCalledWith([storedKey]);
    });

    it('never inserts a row when storing the object fails', async () => {
      const { service, images, storage } = doubles;
      storage.putObject.mockRejectedValue(new Error('storage down'));

      await expect(service.create(USER_ID, upload)).rejects.toThrow('storage down');
      expect(images.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const rows = ['c', 'b', 'a'].map((suffix) => buildRow({ id: `${IMAGE_ID.slice(0, -1)}${suffix}` }));

    it('returns one page and the last item id as nextCursor when more rows exist', async () => {
      const { service, images } = doubles;
      images.findMany.mockResolvedValue(rows);

      const page = await service.list(USER_ID, { limit: 2, status: 'ACCEPTED', cursor: IMAGE_ID });

      expect(page.items.map((item) => item.id)).toEqual([rows[0].id, rows[1].id]);
      expect(page.nextCursor).toBe(rows[1].id);
      expect(images.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, status: 'ACCEPTED' },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 3,
          cursor: { id: IMAGE_ID },
          skip: 1,
        }),
      );
    });

    it('returns a null nextCursor on the last page and no cursor clause on the first', async () => {
      const { service, images } = doubles;
      images.findMany.mockResolvedValue(rows);

      const page = await service.list(USER_ID, { limit: rows.length });

      expect(page.items).toHaveLength(rows.length);
      expect(page.nextCursor).toBeNull();
      expect(images.findMany.mock.calls[0][0]).not.toHaveProperty('cursor');
    });

    it('signs thumbnail URLs and never exposes storage keys', async () => {
      const { service, images } = doubles;
      images.findMany.mockResolvedValue([buildRow({ thumbnailKey: 'users/u/i/thumbnail.jpg' })]);

      const { items } = await service.list(USER_ID, { limit: 1 });

      expect(items[0].thumbnailUrl).toBe('https://storage.test/users/u/i/thumbnail.jpg?signed');
      expect(items[0]).not.toHaveProperty('thumbnailKey');
    });
  });

  describe('get', () => {
    it("throws NotFoundError for another user's image (queries are scoped by owner)", async () => {
      const { service, images } = doubles;
      images.findFirst.mockResolvedValue(null);

      await expect(service.get(USER_ID, IMAGE_ID)).rejects.toBeInstanceOf(NotFoundError);
      expect(images.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: IMAGE_ID, userId: USER_ID } }),
      );
    });
  });

  describe('delete', () => {
    const keys = { originalKey: 'k/original', normalizedKey: 'k/normalized.jpg', thumbnailKey: null };

    it('deletes the row before the stored objects, skipping keys that were never written', async () => {
      const { service, images, storage } = doubles;
      images.findFirst.mockResolvedValue(keys);
      images.deleteMany.mockResolvedValue({ count: 1 });

      await service.delete(USER_ID, IMAGE_ID);

      expect(images.deleteMany).toHaveBeenCalledWith({ where: { id: IMAGE_ID, userId: USER_ID } });
      expect(storage.deleteObjects).toHaveBeenCalledWith(['k/original', 'k/normalized.jpg']);
      const [rowDeletedAt] = images.deleteMany.mock.invocationCallOrder;
      const [objectsDeletedAt] = storage.deleteObjects.mock.invocationCallOrder;
      expect(rowDeletedAt).toBeLessThan(objectsDeletedAt);
    });

    it('still succeeds when object cleanup fails (orphans are harmless)', async () => {
      const { service, images, storage } = doubles;
      images.findFirst.mockResolvedValue(keys);
      images.deleteMany.mockResolvedValue({ count: 1 });
      storage.deleteObjects.mockRejectedValue(new Error('storage down'));

      await expect(service.delete(USER_ID, IMAGE_ID)).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalled();
    });

    it('throws NotFoundError and deletes nothing when the caller does not own the image', async () => {
      const { service, images, storage } = doubles;
      images.findFirst.mockResolvedValue(null);

      await expect(service.delete(USER_ID, IMAGE_ID)).rejects.toBeInstanceOf(NotFoundError);
      expect(images.deleteMany).not.toHaveBeenCalled();
      expect(storage.deleteObjects).not.toHaveBeenCalled();
    });
  });
});
