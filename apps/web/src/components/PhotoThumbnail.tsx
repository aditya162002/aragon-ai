import { useState } from 'react';
import { useStableUrl } from '../hooks/useStableUrl';
import { cx } from '../lib/cx';
import type { PhotoCardModel } from '../lib/to-card-model';
import { PhotoIcon } from './icons';

const IMAGE_CLASS = 'absolute inset-0 size-full object-cover';

/**
 * Square image layered as: placeholder or local preview underneath, server thumbnail on top
 * (faded in once loaded), so switching from preview to thumbnail never flashes an empty box.
 * Images are decorative (`alt=""`): the card's file name and status text carry the meaning.
 */
export function PhotoThumbnail({ card }: { card: PhotoCardModel }) {
  const thumbnail = useStableUrl(card.thumbnailUrl);
  const [isThumbnailLoaded, setThumbnailLoaded] = useState(false);

  return (
    <div className="relative aspect-square overflow-hidden bg-slate-100">
      {card.previewUrl ? (
        <img src={card.previewUrl} alt="" className={IMAGE_CLASS} />
      ) : (
        <ThumbnailPlaceholder isHeic={card.format === 'HEIC'} />
      )}
      {thumbnail.url && (
        <img
          src={thumbnail.url}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setThumbnailLoaded(true)}
          onError={thumbnail.onError}
          className={cx(IMAGE_CLASS, 'transition-opacity duration-300', isThumbnailLoaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </div>
  );
}

function ThumbnailPlaceholder({ isHeic }: { isHeic: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-br from-slate-50 to-slate-100 p-4 text-center text-slate-400">
      <PhotoIcon className="size-8" weight="thin" />
      <span className="text-xs font-medium">{isHeic ? 'HEIC preview after processing' : 'No preview'}</span>
    </div>
  );
}
