import type { PhotoSections, SectionId } from '../lib/photo-sections';
import { EmptyGallery, GallerySkeleton, LoadErrorBanner } from './GalleryStates';
import type { PhotoCardProps } from './PhotoCard';
import { PhotoSection } from './PhotoSection';

const SECTIONS: ReadonlyArray<{ id: SectionId; title: string; description: string }> = [
  { id: 'accepted', title: 'Accepted', description: 'These photos passed every check and are ready to use.' },
  { id: 'rejected', title: 'Rejected', description: "These photos won't be used. Remove them and try different ones." },
];

interface PhotoGalleryProps extends Pick<PhotoCardProps, 'onRemove' | 'onRetry'> {
  sections: PhotoSections;
  isLoading: boolean;
  loadFailed: boolean;
  onReload: () => void;
}

/** "Accepted" and "Rejected" sections, plus loading, error and empty states (in-progress photos live in the dropzone). */
export function PhotoGallery({ sections, isLoading, loadFailed, onReload, onRemove, onRetry }: PhotoGalleryProps) {
  const isEmpty = Object.values(sections).every((cards) => cards.length === 0);

  return (
    <div className="space-y-10">
      {loadFailed && <LoadErrorBanner onRetry={onReload} />}
      {isEmpty && isLoading && <GallerySkeleton />}
      {isEmpty && !isLoading && !loadFailed && <EmptyGallery />}
      {SECTIONS.map(({ id, title, description }) => (
        <PhotoSection
          key={id}
          title={title}
          description={description}
          cards={sections[id]}
          onRemove={onRemove}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
