import { useId } from 'react';
import type { PhotoCardModel } from '../lib/to-card-model';
import { PhotoCard, type PhotoCardProps } from './PhotoCard';

interface PhotoSectionProps extends Pick<PhotoCardProps, 'onRemove' | 'onRetry'> {
  title: string;
  description: string;
  cards: readonly PhotoCardModel[];
}

/** Titled, counted grid of photo cards; renders nothing when empty. */
export function PhotoSection({ title, description, cards, onRemove, onRetry }: PhotoSectionProps) {
  const headingId = useId();
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-base font-semibold text-slate-900">
        {title} <span className="font-normal text-slate-400">({cards.length})</span>
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      <ul className="photo-grid mt-4 gap-3 sm:gap-4">
        {cards.map((card) => (
          <li key={card.id}>
            <PhotoCard card={card} onRemove={onRemove} onRetry={onRetry} />
          </li>
        ))}
      </ul>
    </section>
  );
}
