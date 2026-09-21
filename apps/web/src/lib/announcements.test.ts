import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import { collectVerdicts, snapshotStatuses } from './announcements';

describe('collectVerdicts', () => {
  it('announces cards that just reached a verdict', () => {
    const before = snapshotStatuses([
      makeCard({ id: 'a', name: 'selfie.jpg', status: 'checking' }),
      makeCard({ id: 'b', name: 'group.jpg', status: 'checking' }),
    ]);
    const after = [
      makeCard({ id: 'a', name: 'selfie.jpg', status: 'accepted' }),
      makeCard({ id: 'b', name: 'group.jpg', status: 'rejected', reason: 'MULTIPLE_FACES' }),
    ];

    expect(collectVerdicts(before, after)).toEqual(['selfie.jpg accepted', 'group.jpg rejected: Multiple faces']);
  });

  it('announces new client-rejected files but not unchanged or still-busy cards', () => {
    const before = snapshotStatuses([makeCard({ id: 'a', status: 'accepted' })]);
    const after = [
      makeCard({ id: 'a', status: 'accepted' }),
      makeCard({ id: 'b', origin: 'local', status: 'uploading' }),
      makeCard({ id: 'c', origin: 'local', name: 'notes.txt', status: 'notUploaded', reason: 'UNSUPPORTED_FORMAT' }),
    ];

    expect(collectVerdicts(before, after)).toEqual(['notes.txt not uploaded: Unsupported format']);
  });
});
