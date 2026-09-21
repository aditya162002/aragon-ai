import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { ApiError } from '../api/api-error';
import { useImagesApi } from '../api/images-api-context';
import { ERROR_MESSAGES, UPLOADS } from '../constants';
import { createLocalUpload } from '../lib/local-upload';
import {
  INITIAL_UPLOADS_STATE,
  selectObjectUrls,
  selectUploadsToStart,
  uploadsReducer,
  type LocalUpload,
  type UploadsAction,
} from '../lib/uploads-reducer';
import { useInsertImage } from './useImages';
import { useObjectUrlCleanup } from './useObjectUrlCleanup';

export interface Uploads {
  items: readonly LocalUpload[];
  previewsByImageId: Readonly<Record<string, string>>;
  addFiles: (files: readonly File[]) => void;
  retry: (localId: string) => void;
  /** Removes a local item, cancelling its upload if it is in flight. */
  remove: (localId: string) => void;
  /** Forgets the local preview kept for a server image (e.g. once it is deleted). */
  releasePreview: (imageId: string) => void;
}

export interface UseUploadsOptions {
  /** True once this browser has an anonymous session (e.g. it already owns images). */
  hasSession: boolean;
}

/**
 * Local upload queue: validates files, uploads at most `UPLOADS.CONCURRENCY` at a time (one at a
 * time until a session exists), and hands each uploaded image over to the images query cache.
 */
export function useUploads({ hasSession }: UseUploadsOptions): Uploads {
  const api = useImagesApi();
  const insertImage = useInsertImage();
  const [state, dispatch] = useReducer(uploadsReducer, INITIAL_UPLOADS_STATE);
  const controllers = useRef(new Map<string, AbortController>());
  const nextLocalId = useRef(0);

  useObjectUrlCleanup(useMemo(() => selectObjectUrls(state), [state]));

  useEffect(() => {
    const concurrency = hasSession ? UPLOADS.CONCURRENCY : UPLOADS.CONCURRENCY_BEFORE_SESSION;
    for (const upload of selectUploadsToStart(state.items, concurrency)) {
      const { localId } = upload;
      if (controllers.current.has(localId)) continue;
      const controller = new AbortController();
      controllers.current.set(localId, controller);
      dispatch({ type: 'started', localId });

      api
        .uploadImage(upload.file, {
          signal: controller.signal,
          onProgress: (progress) => dispatch({ type: 'progressed', localId, progress }),
        })
        .then((image) => {
          dispatch({ type: 'succeeded', localId, imageId: image.id });
          insertImage(image);
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) dispatch(toFailureAction(localId, error));
        })
        .finally(() => controllers.current.delete(localId));
    }
  }, [api, hasSession, insertImage, state.items]);

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((controller) => controller.abort());
  }, []);

  const addFiles = useCallback((files: readonly File[]) => {
    const pending = files.map((file) => createLocalUpload(file, `${UPLOADS.LOCAL_ID_PREFIX}${nextLocalId.current++}`));
    void Promise.all(pending).then((uploads) => dispatch({ type: 'added', uploads }));
  }, []);

  const retry = useCallback((localId: string) => dispatch({ type: 'retried', localId }), []);

  const remove = useCallback((localId: string) => {
    controllers.current.get(localId)?.abort();
    dispatch({ type: 'removed', localId });
  }, []);

  const releasePreview = useCallback((imageId: string) => dispatch({ type: 'previewReleased', imageId }), []);

  return { items: state.items, previewsByImageId: state.previewsByImageId, addFiles, retry, remove, releasePreview };
}

/** The API refusing the file itself is a rejection (retrying won't help); anything else can be retried. */
function toFailureAction(localId: string, error: unknown): UploadsAction {
  if (!(error instanceof ApiError)) return { type: 'failed', localId, errorMessage: ERROR_MESSAGES.UNKNOWN };
  const reason = UPLOADS.REJECTION_ERROR_CODES.find((code) => code === error.code);
  return reason ? { type: 'rejected', localId, reason } : { type: 'failed', localId, errorMessage: error.message };
}
