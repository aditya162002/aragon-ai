/** All text a photo card shows or announces, derived from its view-model in one place. */
import { REJECTION_LABELS, REJECTION_MESSAGES, type RejectionReason } from '@aragon/shared';
import { ERROR_MESSAGES } from '../constants';
import type { PhotoCardModel } from './to-card-model';

const FALLBACK_REJECTION_LABEL = 'Rejected';
const FALLBACK_REJECTION_MESSAGE = "This photo didn't pass our quality checks.";
export const NOT_UPLOADED_LABEL = 'Not uploaded';

export function reasonLabel(reason: RejectionReason | null): string {
  return reason === null ? FALLBACK_REJECTION_LABEL : REJECTION_LABELS[reason];
}

function reasonMessage(reason: RejectionReason | null): string {
  return reason === null ? FALLBACK_REJECTION_MESSAGE : REJECTION_MESSAGES[reason];
}

/** Short badge text shown on the thumbnail. */
export function badgeLabel(card: PhotoCardModel): string {
  switch (card.status) {
    case 'queued':
      return 'Queued';
    case 'uploading':
      return `Uploading ${card.progress}%`;
    case 'uploadFailed':
      return 'Upload failed';
    case 'checking':
      return 'Checking';
    case 'accepted':
      return 'Accepted';
    case 'failed':
      return "Couldn't process";
    case 'rejected':
    case 'notUploaded':
      return reasonLabel(card.reason);
  }
}

/** Sentence shown under the file name. */
export function detailText(card: PhotoCardModel): string {
  switch (card.status) {
    case 'queued':
      return 'Waiting to upload…';
    case 'uploading':
      return 'Uploading…';
    case 'uploadFailed':
      return card.errorMessage ?? ERROR_MESSAGES.UNKNOWN;
    case 'checking':
      return 'Checking quality…';
    case 'accepted':
      return 'Looks great — ready to use.';
    case 'failed':
      return "Couldn't process this photo. Please try another one.";
    case 'rejected':
    case 'notUploaded':
      return reasonMessage(card.reason);
  }
}

/** Accessible name of the card's delete/remove button. */
export function removeLabel(card: PhotoCardModel): string {
  if (card.origin === 'server') return `Delete ${card.name}`;
  return card.status === 'notUploaded' ? `Dismiss ${card.name}` : `Remove ${card.name}`;
}

/** Screen-reader announcement for a card that reached a verdict; null while it has none. */
export function verdictAnnouncement(card: PhotoCardModel): string | null {
  switch (card.status) {
    case 'accepted':
      return `${card.name} accepted`;
    case 'rejected':
      return `${card.name} rejected: ${reasonLabel(card.reason)}`;
    case 'notUploaded':
      return `${card.name} not uploaded: ${reasonLabel(card.reason)}`;
    case 'failed':
      return `${card.name} couldn't be processed`;
    case 'uploadFailed':
      return `${card.name} upload failed`;
    default:
      return null;
  }
}
