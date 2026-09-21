import { AppHeader } from './components/AppHeader';
import { LiveAnnouncer } from './components/LiveAnnouncer';
import { PhotoDropzone } from './components/PhotoDropzone';
import { PhotoGallery } from './components/PhotoGallery';
import { PhotoGuidelines } from './components/PhotoGuidelines';
import { PhotoSection } from './components/PhotoSection';
import { ProgressSummary } from './components/ProgressSummary';
import { usePhotoBoard } from './hooks/usePhotoBoard';
import { useVerdictAnnouncement } from './hooks/useVerdictAnnouncement';

/** Page layout: wires the photo board state into the presentational components. */
export function App() {
  const board = usePhotoBoard();
  const announcement = useVerdictAnnouncement(board.cards, board.isReady);

  return (
    <div className="min-h-screen bg-linear-to-b from-brand-50/60 via-white to-white">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Upload your photos</h1>
            <p className="mt-3 text-base text-slate-600">
              Add selfies and portraits of yourself. We check each one instantly for lighting, focus and framing, so
              only your best photos are used.
            </p>
          </div>
          <ProgressSummary acceptedCount={board.sections.accepted.length} />
        </div>

        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="lg:col-start-1 lg:row-start-1">
            <PhotoDropzone onFiles={board.addFiles}>
              {board.sections.inProgress.length > 0 && (
                <PhotoSection
                  title="In progress"
                  description="Uploading and checking quality. This takes a few seconds."
                  cards={board.sections.inProgress}
                  onRemove={board.removeCard}
                  onRetry={board.retryCard}
                />
              )}
            </PhotoDropzone>
          </div>
          <aside className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <PhotoGuidelines />
          </aside>
          <div className="lg:col-start-1 lg:row-start-2">
            <PhotoGallery
              sections={board.sections}
              isLoading={board.isLoading}
              loadFailed={board.loadFailed}
              onReload={board.reload}
              onRemove={board.removeCard}
              onRetry={board.retryCard}
            />
          </div>
        </div>
      </main>
      <LiveAnnouncer message={announcement} />
    </div>
  );
}
