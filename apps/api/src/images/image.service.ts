import { randomUUID } from 'node:crypto';
import type { ImageDto, ImageFormat, ImageListResponse, ImageStatus } from '@aragon/shared';
import { ERROR_MESSAGES, FORMAT_CONTENT_TYPES } from '../constants';
import type { PrismaClient } from '../db';
import { NotFoundError } from '../http/errors';
import { imageObjectKeys } from '../storage/image-object-keys';
import type { StorageService } from '../storage/storage.service';
import { IMAGE_DTO_SELECT, toImageDto, type ImageDtoSource } from './image.mapper';
import { sanitizeOriginalName } from './original-name';

/** One row beyond the page reveals whether another page exists. */
const PAGE_LOOKAHEAD_ROWS = 1;
/** Prisma returns the cursor row itself first; the previous page already contained it. */
const CURSOR_ROWS_TO_SKIP = 1;

const STORED_OBJECT_KEYS_SELECT = { originalKey: true, normalizedKey: true, thumbnailKey: true } as const;

export interface NewImage {
  buffer: Buffer;
  originalName: string;
  format: ImageFormat;
}

export interface ListImagesOptions {
  status?: ImageStatus;
  limit: number;
  /** Id of the last image of the previous page. */
  cursor?: string;
}

/** A user's photo gallery. Every query is scoped by `userId`, so users only ever reach their own images. */
export class ImageService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
  ) {}

  /**
   * Stores the original, then inserts the row. The PENDING row *is* the worker's job, so it is
   * written only once the bytes it points at exist.
   */
  async create(userId: string, upload: NewImage): Promise<ImageDto> {
    const id = randomUUID();
    const { original } = imageObjectKeys(userId, id);
    await this.storage.putObject(original, upload.buffer, FORMAT_CONTENT_TYPES[upload.format]);
    try {
      const image = await this.prisma.image.create({
        data: {
          id,
          userId,
          originalName: sanitizeOriginalName(upload.originalName),
          format: upload.format,
          sizeBytes: upload.buffer.byteLength,
          originalKey: original,
        },
        select: IMAGE_DTO_SELECT,
      });
      return toImageDto(image, null);
    } catch (error) {
      await this.deleteObjectsQuietly([original]);
      throw error;
    }
  }

  /** Newest first, keyset-paginated on (createdAt, id). */
  async list(userId: string, { status, limit, cursor }: ListImagesOptions): Promise<ImageListResponse> {
    const rows = await this.prisma.image.findMany({
      where: { userId, status },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + PAGE_LOOKAHEAD_ROWS,
      ...(cursor ? { cursor: { id: cursor }, skip: CURSOR_ROWS_TO_SKIP } : {}),
      select: IMAGE_DTO_SELECT,
    });
    const page = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? (page.at(-1)?.id ?? null) : null;
    const items = await Promise.all(page.map((image) => this.toDto(image)));
    return { items, nextCursor };
  }

  async get(userId: string, id: string): Promise<ImageDto> {
    const image = await this.prisma.image.findFirst({ where: { id, userId }, select: IMAGE_DTO_SELECT });
    if (!image) throw new NotFoundError(ERROR_MESSAGES.IMAGE_NOT_FOUND);
    return this.toDto(image);
  }

  /**
   * Deletes the row first, then its objects: an orphaned object is harmless,
   * a row pointing at a missing object is not.
   */
  async delete(userId: string, id: string): Promise<void> {
    const image = await this.prisma.image.findFirst({ where: { id, userId }, select: STORED_OBJECT_KEYS_SELECT });
    if (!image) throw new NotFoundError(ERROR_MESSAGES.IMAGE_NOT_FOUND);

    // deleteMany (not delete) keeps a concurrent second DELETE from failing on the missing row.
    await this.prisma.image.deleteMany({ where: { id, userId } });
    const keys = [image.originalKey, image.normalizedKey, image.thumbnailKey].filter((key) => key !== null);
    await this.deleteObjectsQuietly(keys);
  }

  private async toDto(image: ImageDtoSource): Promise<ImageDto> {
    const thumbnailUrl = image.thumbnailKey ? await this.storage.getSignedReadUrl(image.thumbnailKey) : null;
    return toImageDto(image, thumbnailUrl);
  }

  /** Object cleanup is best effort: a leftover object costs storage, never correctness. */
  private async deleteObjectsQuietly(keys: readonly string[]): Promise<void> {
    try {
      await this.storage.deleteObjects(keys);
    } catch (error) {
      console.error('Failed to delete stored objects; they are now orphaned', { keys, error });
    }
  }
}
