import type { ImageFormat, RejectionReason } from '@aragon/shared';
import { PERCENT } from '../constants';

/**
 * Lifecycle of a file that has not (yet) become a server image:
 *   queued → uploading → (removed on success) | failed → queued (retry)
 *   uploading → rejected (API refused the file) ; client-rejected files start in `rejected`.
 */
export type LocalUploadPhase = 'queued' | 'uploading' | 'failed' | 'rejected';

export interface LocalUpload {
  localId: string;
  file: File;
  name: string;
  /** Format detected from the file's bytes; null when it is not a supported image. */
  format: ImageFormat | null;
  previewUrl: string | null;
  phase: LocalUploadPhase;
  /** Upload progress, 0–100. */
  progress: number;
  reason?: RejectionReason;
  errorMessage?: string;
}

export interface UploadsState {
  items: readonly LocalUpload[];
  /** Local previews of uploaded photos (server image id → object URL), shown until the server thumbnail exists. */
  previewsByImageId: Readonly<Record<string, string>>;
}

export type UploadsAction =
  | { type: 'added'; uploads: readonly LocalUpload[] }
  | { type: 'started'; localId: string }
  | { type: 'progressed'; localId: string; progress: number }
  | { type: 'succeeded'; localId: string; imageId: string }
  | { type: 'rejected'; localId: string; reason: RejectionReason }
  | { type: 'failed'; localId: string; errorMessage: string }
  | { type: 'retried'; localId: string }
  | { type: 'removed'; localId: string }
  | { type: 'previewReleased'; imageId: string };

export const INITIAL_UPLOADS_STATE: UploadsState = { items: [], previewsByImageId: {} };

/** Pure state machine; transitions that are invalid for the item's current phase are ignored. */
export function uploadsReducer(state: UploadsState, action: UploadsAction): UploadsState {
  switch (action.type) {
    case 'added':
      return { ...state, items: [...state.items, ...action.uploads] };
    case 'started':
      return transition(state, action.localId, 'queued', { phase: 'uploading', progress: PERCENT.MIN });
    case 'progressed':
      return transition(state, action.localId, 'uploading', { progress: action.progress });
    case 'succeeded':
      return succeed(state, action.localId, action.imageId);
    case 'rejected':
      return transition(state, action.localId, 'uploading', { phase: 'rejected', reason: action.reason });
    case 'failed':
      return transition(state, action.localId, 'uploading', { phase: 'failed', errorMessage: action.errorMessage });
    case 'retried':
      return transition(state, action.localId, 'failed', {
        phase: 'queued',
        progress: PERCENT.MIN,
        errorMessage: undefined,
      });
    case 'removed':
      return { ...state, items: state.items.filter((item) => item.localId !== action.localId) };
    case 'previewReleased':
      return releasePreview(state, action.imageId);
  }
}

/** Queued uploads that may start now without exceeding `concurrency` simultaneous uploads. */
export function selectUploadsToStart(items: readonly LocalUpload[], concurrency: number): LocalUpload[] {
  const activeCount = items.filter((item) => item.phase === 'uploading').length;
  const freeSlots = Math.max(concurrency - activeCount, 0);
  return items.filter((item) => item.phase === 'queued').slice(0, freeSlots);
}

/** Every object URL the state still references (the rest can be revoked). */
export function selectObjectUrls(state: UploadsState): string[] {
  const itemUrls = state.items.flatMap((item) => (item.previewUrl === null ? [] : [item.previewUrl]));
  return [...itemUrls, ...Object.values(state.previewsByImageId)];
}

function transition(
  state: UploadsState,
  localId: string,
  expectedPhase: LocalUploadPhase,
  changes: Partial<LocalUpload>,
): UploadsState {
  const item = state.items.find((candidate) => candidate.localId === localId);
  if (item?.phase !== expectedPhase) return state;
  // Returning the same state for no-op updates (e.g. repeated progress events) lets React skip the render.
  const isUnchanged = (Object.keys(changes) as Array<keyof LocalUpload>).every((key) => item[key] === changes[key]);
  if (isUnchanged) return state;
  return {
    ...state,
    items: state.items.map((candidate) => (candidate === item ? { ...item, ...changes } : candidate)),
  };
}

function succeed(state: UploadsState, localId: string, imageId: string): UploadsState {
  const item = state.items.find((candidate) => candidate.localId === localId);
  if (item?.phase !== 'uploading') return state;
  return {
    items: state.items.filter((candidate) => candidate !== item),
    previewsByImageId:
      item.previewUrl === null ? state.previewsByImageId : { ...state.previewsByImageId, [imageId]: item.previewUrl },
  };
}

function releasePreview(state: UploadsState, imageId: string): UploadsState {
  if (!(imageId in state.previewsByImageId)) return state;
  const { [imageId]: _released, ...previewsByImageId } = state.previewsByImageId;
  return { ...state, previewsByImageId };
}
