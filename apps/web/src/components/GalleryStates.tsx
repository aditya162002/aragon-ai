import { ERROR_MESSAGES, UI } from '../constants';
import { AlertIcon, PhotoIcon, RetryIcon } from './icons';

const SKELETON_KEYS = Array.from({ length: UI.SKELETON_CARD_COUNT }, (_, index) => index);

/** Placeholder cards while the gallery loads for the first time. */
export function GallerySkeleton() {
  return (
    <div role="status" className="photo-grid gap-3 sm:gap-4">
      <span className="sr-only">Loading your photos…</span>
      {SKELETON_KEYS.map((key) => (
        <div key={key} aria-hidden="true" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="aspect-square animate-pulse bg-slate-100" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyGallery() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <PhotoIcon className="size-5" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">No photos yet</p>
      <p className="mt-1 text-sm text-slate-500">Your uploads will appear here with instant quality feedback.</p>
    </div>
  );
}

export function LoadErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
      <AlertIcon className="size-5 shrink-0 text-rose-600" />
      <p className="flex-1 text-sm text-rose-800">{ERROR_MESSAGES.LOAD_IMAGES}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
      >
        <RetryIcon className="size-4" />
        Try again
      </button>
    </div>
  );
}
