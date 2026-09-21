import type { ImageDto } from '@aragon/shared';
import { imageToCard, localUploadToCard, type CardStatus, type PhotoCardModel } from './to-card-model';
import type { LocalUpload } from './uploads-reducer';

export type SectionId = 'inProgress' | 'accepted' | 'rejected';

export type PhotoSections = Readonly<Record<SectionId, readonly PhotoCardModel[]>>;

/** Which gallery section each card status belongs to. */
const STATUS_SECTION: Readonly<Record<CardStatus, SectionId>> = {
  queued: 'inProgress',
  uploading: 'inProgress',
  uploadFailed: 'inProgress',
  checking: 'inProgress',
  accepted: 'accepted',
  rejected: 'rejected',
  failed: 'rejected',
  notUploaded: 'rejected',
};

/** Maps local uploads (first) and server images (newest first) to cards, grouped by section. */
export function buildPhotoSections(
  uploads: readonly LocalUpload[],
  images: readonly ImageDto[],
  previewsByImageId: Readonly<Record<string, string>>,
): PhotoSections {
  const cards = [
    ...uploads.map(localUploadToCard),
    ...images.map((image) => imageToCard(image, previewsByImageId[image.id] ?? null)),
  ];
  const sections: Record<SectionId, PhotoCardModel[]> = { inProgress: [], accepted: [], rejected: [] };
  for (const card of cards) sections[STATUS_SECTION[card.status]].push(card);
  return sections;
}
