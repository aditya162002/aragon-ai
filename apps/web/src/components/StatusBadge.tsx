import { badgeLabel } from '../lib/card-copy';
import { cx } from '../lib/cx';
import type { CardStatus, PhotoCardModel } from '../lib/to-card-model';
import { AlertIcon, CheckIcon, SpinnerIcon, XMarkIcon } from './icons';
import { BADGE_TONE_CLASSES, STATUS_TONE } from './status-tone';

const ICON_CLASS = 'size-3.5 shrink-0';

function StatusIcon({ status }: { status: CardStatus }) {
  switch (status) {
    case 'accepted':
      return <CheckIcon className={ICON_CLASS} weight="bold" />;
    case 'uploading':
    case 'checking':
      return <SpinnerIcon className={cx(ICON_CLASS, 'animate-spin')} weight="bold" />;
    case 'rejected':
    case 'notUploaded':
      return <XMarkIcon className={ICON_CLASS} weight="bold" />;
    case 'failed':
    case 'uploadFailed':
      return <AlertIcon className={ICON_CLASS} weight="bold" />;
    case 'queued':
      return null;
  }
}

/** Pill on the thumbnail: green check when accepted, red with the reason when rejected, spinner while busy. */
export function StatusBadge({ card }: { card: PhotoCardModel }) {
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm ring-1 backdrop-blur-sm',
        BADGE_TONE_CLASSES[STATUS_TONE[card.status]],
      )}
    >
      <StatusIcon status={card.status} />
      <span className="truncate">{badgeLabel(card)}</span>
    </span>
  );
}
