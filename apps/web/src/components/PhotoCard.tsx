import { PERCENT } from '../constants';
import { NOT_UPLOADED_LABEL, detailText, removeLabel } from '../lib/card-copy';
import { cx } from '../lib/cx';
import type { CardStatus, PhotoCardModel } from '../lib/to-card-model';
import { RetryIcon, TrashIcon, XMarkIcon } from './icons';
import { PhotoThumbnail } from './PhotoThumbnail';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';
import { CARD_BORDER_TONE_CLASSES, DETAIL_TONE_CLASSES, STATUS_TONE } from './status-tone';

/** Statuses without a verdict yet: the thumbnail is dimmed so final results stand out. */
const BUSY_STATUSES: readonly CardStatus[] = ['queued', 'uploading', 'checking'];

export interface PhotoCardProps {
  card: PhotoCardModel;
  onRemove: (card: PhotoCardModel) => void;
  onRetry: (card: PhotoCardModel) => void;
}

/** One photo: thumbnail with status badge and delete/remove button, file name, and what happened to it. */
export function PhotoCard({ card, onRemove, onRetry }: PhotoCardProps) {
  const tone = STATUS_TONE[card.status];
  const RemoveIcon = card.origin === 'server' ? TrashIcon : XMarkIcon;

  return (
    <article
      className={cx(
        'flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md',
        CARD_BORDER_TONE_CLASSES[tone],
      )}
    >
      <div className="relative">
        <PhotoThumbnail card={card} />
        {BUSY_STATUSES.includes(card.status) && <div className="absolute inset-0 bg-white/40" />}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <StatusBadge card={card} />
          <button
            type="button"
            onClick={() => onRemove(card)}
            aria-label={removeLabel(card)}
            title={removeLabel(card)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-900/10 backdrop-blur-sm transition hover:bg-white hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <RemoveIcon className="size-4" />
          </button>
        </div>
        {card.status === 'uploading' && (
          <ProgressBar
            value={card.progress}
            max={PERCENT.MAX}
            label={`Uploading ${card.name}`}
            className="absolute inset-x-3 bottom-3 h-1.5 bg-white/80 shadow-sm"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium text-slate-900" title={card.name}>
          {card.name}
        </p>
        {card.status === 'notUploaded' && (
          <p className="text-xs font-semibold tracking-wide text-rose-600 uppercase">{NOT_UPLOADED_LABEL}</p>
        )}
        <p className={cx('text-xs leading-relaxed', DETAIL_TONE_CLASSES[tone])}>{detailText(card)}</p>
        {card.status === 'uploadFailed' && (
          <button
            type="button"
            onClick={() => onRetry(card)}
            aria-label={`Retry ${card.name}`}
            className="mt-auto inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <RetryIcon className="size-3.5" />
            Retry
          </button>
        )}
      </div>
    </article>
  );
}
