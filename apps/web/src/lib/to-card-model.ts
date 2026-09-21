import type { ImageDto, ImageFormat, ImageStatus, RejectionReason } from '@aragon/shared';
import { PERCENT } from '../constants';
import type { LocalUpload, LocalUploadPhase } from './uploads-reducer';

/** What a card shows, whether it is a local file or a server image. */
export type CardStatus =
  | 'queued'
  | 'uploading'
  | 'uploadFailed'
  | 'notUploaded'
  | 'checking'
  | 'accepted'
  | 'rejected'
  | 'failed';

/** Local cards are removed from the upload queue; server cards are deleted through the API. */
export type CardOrigin = 'local' | 'server';

/** Single view-model rendered by `PhotoCard` for both local uploads and server images. */
export interface PhotoCardModel {
  /** Local upload id or server image id; also the React key. */
  id: string;
  origin: CardOrigin;
  name: string;
  status: CardStatus;
  format: ImageFormat | null;
  /** Instant local preview (object URL), when the browser can render the file. */
  previewUrl: string | null;
  /** Server-generated JPEG thumbnail (signed URL), once processed. */
  thumbnailUrl: string | null;
  /** Upload progress, 0–100. */
  progress: number;
  reason: RejectionReason | null;
  errorMessage: string | null;
}

const LOCAL_PHASE_STATUS: Readonly<Record<LocalUploadPhase, CardStatus>> = {
  queued: 'queued',
  uploading: 'uploading',
  failed: 'uploadFailed',
  rejected: 'notUploaded',
};

const IMAGE_STATUS_CARD_STATUS: Readonly<Record<ImageStatus, CardStatus>> = {
  PENDING: 'checking',
  PROCESSING: 'checking',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  FAILED: 'failed',
};

export function localUploadToCard(upload: LocalUpload): PhotoCardModel {
  return {
    id: upload.localId,
    origin: 'local',
    name: upload.name,
    status: LOCAL_PHASE_STATUS[upload.phase],
    format: upload.format,
    previewUrl: upload.previewUrl,
    thumbnailUrl: null,
    progress: upload.progress,
    reason: upload.reason ?? null,
    errorMessage: upload.errorMessage ?? null,
  };
}

/** `previewUrl` is the local preview kept from this tab's upload of the image, if any. */
export function imageToCard(image: ImageDto, previewUrl: string | null): PhotoCardModel {
  return {
    id: image.id,
    origin: 'server',
    name: image.originalName,
    status: IMAGE_STATUS_CARD_STATUS[image.status],
    format: image.format,
    previewUrl,
    thumbnailUrl: image.thumbnailUrl,
    progress: PERCENT.MAX,
    reason: image.rejectionReason,
    errorMessage: null,
  };
}
