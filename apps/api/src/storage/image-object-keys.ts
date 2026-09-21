import { STORAGE } from '../constants';

export interface ImageObjectKeys {
  original: string;
  normalized: string;
  thumbnail: string;
}

/**
 * Storage keys are built only from server-generated UUIDs, never from client input,
 * which rules out path traversal and key collisions: users/{userId}/{imageId}/{object}.
 */
export function imageObjectKeys(userId: string, imageId: string): ImageObjectKeys {
  const prefix = `${STORAGE.KEY_PREFIX}/${userId}/${imageId}`;
  return {
    original: `${prefix}/${STORAGE.ORIGINAL_OBJECT_NAME}`,
    normalized: `${prefix}/${STORAGE.NORMALIZED_OBJECT_NAME}`,
    thumbnail: `${prefix}/${STORAGE.THUMBNAIL_OBJECT_NAME}`,
  };
}
