import { describe, expect, it } from 'vitest';
import { QUERY } from '../constants';
import { makeImageDto } from '../test/fixtures';
import { pollIntervalFor, prependImage, removeImage } from './image-list-cache';

describe('image list cache updaters', () => {
  it('prepends a new image without duplicating one a poll already returned', () => {
    const existing = makeImageDto({ id: 'old' });
    const uploaded = makeImageDto({ id: 'new' });

    expect(prependImage(undefined, uploaded)).toEqual({ items: [uploaded], nextCursor: null });
    const list = prependImage({ items: [uploaded, existing], nextCursor: null }, uploaded);
    expect(list.items.map((item) => item.id)).toEqual(['new', 'old']);
  });

  it('removes an image and leaves an empty cache untouched', () => {
    const list = { items: [makeImageDto({ id: 'a' }), makeImageDto({ id: 'b' })], nextCursor: null };
    expect(removeImage(list, 'a')?.items.map((item) => item.id)).toEqual(['b']);
    expect(removeImage(undefined, 'a')).toBeUndefined();
  });
});

describe('pollIntervalFor', () => {
  it('polls only while an image is pending or processing', () => {
    const settled = { items: [makeImageDto({ status: 'ACCEPTED' })], nextCursor: null };
    const busy = { items: [makeImageDto({ status: 'ACCEPTED' }), makeImageDto({ status: 'PROCESSING' })], nextCursor: null };

    expect(pollIntervalFor(undefined)).toBe(false);
    expect(pollIntervalFor(settled)).toBe(false);
    expect(pollIntervalFor(busy)).toBe(QUERY.POLL_INTERVAL_MS);
  });
});
