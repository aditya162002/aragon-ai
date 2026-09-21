import { describe, expect, it } from 'vitest';
import { makeLocalUpload } from '../test/fixtures';
import {
  INITIAL_UPLOADS_STATE,
  selectObjectUrls,
  selectUploadsToStart,
  uploadsReducer,
  type LocalUpload,
  type UploadsState,
} from './uploads-reducer';

const LOCAL_ID = 'local-0';

function stateWith(...items: LocalUpload[]): UploadsState {
  return { ...INITIAL_UPLOADS_STATE, items };
}

describe('uploadsReducer', () => {
  it('walks the happy path: queued → uploading → progress → succeeded', () => {
    let state = uploadsReducer(INITIAL_UPLOADS_STATE, { type: 'added', uploads: [makeLocalUpload()] });
    state = uploadsReducer(state, { type: 'started', localId: LOCAL_ID });
    expect(state.items[0]).toMatchObject({ phase: 'uploading', progress: 0 });

    state = uploadsReducer(state, { type: 'progressed', localId: LOCAL_ID, progress: 40 });
    expect(state.items[0]?.progress).toBe(40);

    state = uploadsReducer(state, { type: 'succeeded', localId: LOCAL_ID, imageId: 'img-1' });
    expect(state.items).toEqual([]);
    expect(state.previewsByImageId).toEqual({ 'img-1': 'blob:preview-0' });
  });

  it('moves a failed upload back to the queue on retry', () => {
    let state = stateWith(makeLocalUpload({ phase: 'uploading', progress: 70 }));
    state = uploadsReducer(state, { type: 'failed', localId: LOCAL_ID, errorMessage: 'Network error' });
    expect(state.items[0]).toMatchObject({ phase: 'failed', errorMessage: 'Network error' });

    state = uploadsReducer(state, { type: 'retried', localId: LOCAL_ID });
    expect(state.items[0]).toMatchObject({ phase: 'queued', progress: 0, errorMessage: undefined });
  });

  it('records the reason when the API rejects the file', () => {
    const state = uploadsReducer(stateWith(makeLocalUpload({ phase: 'uploading' })), {
      type: 'rejected',
      localId: LOCAL_ID,
      reason: 'UNSUPPORTED_FORMAT',
    });
    expect(state.items[0]).toMatchObject({ phase: 'rejected', reason: 'UNSUPPORTED_FORMAT' });
  });

  it('ignores transitions that are invalid for the current phase', () => {
    const queued = stateWith(makeLocalUpload({ phase: 'queued' }));
    expect(uploadsReducer(queued, { type: 'progressed', localId: LOCAL_ID, progress: 10 })).toBe(queued);
    expect(uploadsReducer(queued, { type: 'retried', localId: LOCAL_ID })).toBe(queued);
    expect(uploadsReducer(queued, { type: 'succeeded', localId: LOCAL_ID, imageId: 'img-1' })).toBe(queued);
    expect(uploadsReducer(queued, { type: 'started', localId: 'unknown' })).toBe(queued);
  });

  it('returns the same state for a no-op progress update so React can skip rendering', () => {
    const uploading = stateWith(makeLocalUpload({ phase: 'uploading', progress: 50 }));
    expect(uploadsReducer(uploading, { type: 'progressed', localId: LOCAL_ID, progress: 50 })).toBe(uploading);
  });

  it('removes items and releases previews', () => {
    const state: UploadsState = { items: [makeLocalUpload()], previewsByImageId: { 'img-1': 'blob:kept' } };
    expect(uploadsReducer(state, { type: 'removed', localId: LOCAL_ID }).items).toEqual([]);
    expect(uploadsReducer(state, { type: 'previewReleased', imageId: 'img-1' }).previewsByImageId).toEqual({});
  });
});

describe('selectUploadsToStart', () => {
  const upload = (localId: string, phase: LocalUpload['phase']) => makeLocalUpload({ localId, phase });

  it('fills only the free slots, in queue order', () => {
    const items = [upload('a', 'uploading'), upload('b', 'queued'), upload('c', 'queued'), upload('d', 'queued')];
    expect(selectUploadsToStart(items, 3).map((item) => item.localId)).toEqual(['b', 'c']);
  });

  it('starts nothing when every slot is busy', () => {
    const items = [upload('a', 'uploading'), upload('b', 'uploading'), upload('c', 'queued')];
    expect(selectUploadsToStart(items, 2)).toEqual([]);
  });
});

describe('selectObjectUrls', () => {
  it('lists previews of local items and of uploaded images', () => {
    const state: UploadsState = {
      items: [makeLocalUpload({ previewUrl: 'blob:a' }), makeLocalUpload({ localId: 'x', previewUrl: null })],
      previewsByImageId: { 'img-1': 'blob:b' },
    };
    expect(selectObjectUrls(state)).toEqual(['blob:a', 'blob:b']);
  });
});
