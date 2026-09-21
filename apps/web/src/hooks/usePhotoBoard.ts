import type { ImageDto } from '@aragon/shared';
import { useCallback, useMemo } from 'react';
import { buildPhotoSections, type PhotoSections } from '../lib/photo-sections';
import type { PhotoCardModel } from '../lib/to-card-model';
import { useDeleteImage, useImages } from './useImages';
import { useUploads } from './useUploads';

const NO_IMAGES: readonly ImageDto[] = [];

export interface PhotoBoard {
  sections: PhotoSections;
  /** Every card, in display order (for announcements). */
  cards: readonly PhotoCardModel[];
  isLoading: boolean;
  loadFailed: boolean;
  isReady: boolean;
  reload: () => void;
  addFiles: (files: readonly File[]) => void;
  removeCard: (card: PhotoCardModel) => void;
  retryCard: (card: PhotoCardModel) => void;
}

/** Page-level state: merges local uploads and server images into one gallery and routes card actions. */
export function usePhotoBoard(): PhotoBoard {
  const imagesQuery = useImages();
  const images = imagesQuery.data ?? NO_IMAGES;
  // Owning images proves the session cookie exists; the first successful upload adds one to the cache.
  const uploads = useUploads({ hasSession: images.length > 0 });
  const { mutate: deleteImage } = useDeleteImage();
  const { refetch } = imagesQuery;
  const { remove, retry, releasePreview } = uploads;

  const sections = useMemo(
    () => buildPhotoSections(uploads.items, images, uploads.previewsByImageId),
    [uploads.items, images, uploads.previewsByImageId],
  );
  const cards = useMemo(() => [...sections.inProgress, ...sections.accepted, ...sections.rejected], [sections]);

  const removeCard = useCallback(
    (card: PhotoCardModel) => {
      if (card.origin === 'local') {
        remove(card.id);
        return;
      }
      deleteImage(card.id);
      releasePreview(card.id);
    },
    [deleteImage, releasePreview, remove],
  );

  const retryCard = useCallback((card: PhotoCardModel) => retry(card.id), [retry]);
  const reload = useCallback(() => void refetch(), [refetch]);

  return {
    sections,
    cards,
    isLoading: imagesQuery.isPending,
    loadFailed: imagesQuery.isLoadingError,
    isReady: imagesQuery.isSuccess,
    reload,
    addFiles: uploads.addFiles,
    removeCard,
    retryCard,
  };
}
