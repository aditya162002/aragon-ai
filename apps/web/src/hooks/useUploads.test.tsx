import type { ImageDto, ImageListResponse } from '@aragon/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/api-error';
import type { ImagesApi } from '../api/images-api';
import { ImagesApiProvider } from '../api/ImagesApiProvider';
import { QUERY, UPLOADS } from '../constants';
import { HEADERS, makeFile, makeImageDto } from '../test/fixtures';
import { useUploads } from './useUploads';

interface PendingUpload {
  file: File;
  resolve: (image: ImageDto) => void;
  reject: (error: unknown) => void;
}

/** Records every upload and lets the test settle each one explicitly. */
class FakeImagesApi implements ImagesApi {
  readonly uploads: PendingUpload[] = [];

  listImages(): Promise<ImageListResponse> {
    return Promise.resolve({ items: [], nextCursor: null });
  }

  deleteImage(): Promise<void> {
    return Promise.resolve();
  }

  uploadImage(file: File): Promise<ImageDto> {
    return new Promise((resolve, reject) => this.uploads.push({ file, resolve, reject }));
  }
}

function setup({ hasSession }: { hasSession: boolean } = { hasSession: true }) {
  const api = new FakeImagesApi();
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ImagesApiProvider api={api}>{children}</ImagesApiProvider>
    </QueryClientProvider>
  );
  const { result, rerender } = renderHook((options) => useUploads(options), { wrapper, initialProps: { hasSession } });
  return { api, queryClient, result, rerender };
}

const photos = (count: number) =>
  Array.from({ length: count }, (_, index) => makeFile(`photo-${index}.jpg`, HEADERS.JPEG, { type: 'image/jpeg' }));

describe('useUploads', () => {
  // jsdom does not implement object URLs (used for local previews).
  beforeEach(() => {
    let nextUrl = 0;
    URL.createObjectURL = () => `blob:${nextUrl++}`;
    URL.revokeObjectURL = vi.fn();
  });

  it('uploads at most UPLOADS.CONCURRENCY files at once and hands finished ones to the gallery cache', async () => {
    const { api, queryClient, result } = setup();

    act(() => result.current.addFiles(photos(UPLOADS.CONCURRENCY + 1)));
    await waitFor(() => expect(api.uploads).toHaveLength(UPLOADS.CONCURRENCY));
    expect(result.current.items.map((item) => item.phase)).toEqual([
      ...Array<string>(UPLOADS.CONCURRENCY).fill('uploading'),
      'queued',
    ]);

    await act(async () => api.uploads[0]?.resolve(makeImageDto({ id: 'img-0' })));
    await waitFor(() => expect(api.uploads).toHaveLength(UPLOADS.CONCURRENCY + 1));

    expect(result.current.items).toHaveLength(UPLOADS.CONCURRENCY);
    expect(result.current.previewsByImageId).toHaveProperty('img-0');
    expect(queryClient.getQueryData<ImageListResponse>(QUERY.IMAGES_KEY)?.items.map((item) => item.id)).toEqual([
      'img-0',
    ]);
  });

  it('uploads one file at a time until the browser has a session, so only one anonymous user is created', async () => {
    const { api, result, rerender } = setup({ hasSession: false });

    act(() => result.current.addFiles(photos(UPLOADS.CONCURRENCY)));
    await waitFor(() => expect(api.uploads).toHaveLength(UPLOADS.CONCURRENCY_BEFORE_SESSION));

    await act(async () => api.uploads[0]?.resolve(makeImageDto({ id: 'img-0' })));
    rerender({ hasSession: true });
    await waitFor(() => expect(api.uploads).toHaveLength(UPLOADS.CONCURRENCY));
  });

  it('never uploads files that fail client-side validation', async () => {
    const { api, result } = setup();

    act(() => result.current.addFiles([makeFile('notes.txt', HEADERS.TEXT, { type: 'text/plain' })]));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(result.current.items[0]).toMatchObject({ phase: 'rejected', reason: 'UNSUPPORTED_FORMAT' });
    expect(api.uploads).toHaveLength(0);
  });

  it('shows API format rejections as rejected and other errors as retryable failures', async () => {
    const { api, result } = setup();

    act(() => result.current.addFiles(photos(2)));
    await waitFor(() => expect(api.uploads).toHaveLength(2));
    await act(async () => {
      api.uploads[0]?.reject(new ApiError(415, 'UNSUPPORTED_FORMAT', 'Only JPG, PNG or HEIC photos are supported.'));
      api.uploads[1]?.reject(new ApiError(429, 'RATE_LIMITED', 'Too many uploads.'));
    });

    expect(result.current.items[0]).toMatchObject({ phase: 'rejected', reason: 'UNSUPPORTED_FORMAT' });
    expect(result.current.items[1]).toMatchObject({ phase: 'failed', errorMessage: 'Too many uploads.' });

    act(() => result.current.retry(result.current.items[1]?.localId ?? ''));
    await waitFor(() => expect(api.uploads).toHaveLength(3));
  });
});
