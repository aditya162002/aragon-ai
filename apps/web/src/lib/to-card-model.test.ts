import { describe, expect, it } from 'vitest';
import { makeImageDto, makeLocalUpload } from '../test/fixtures';
import { buildPhotoSections } from './photo-sections';
import { imageToCard, localUploadToCard } from './to-card-model';

describe('localUploadToCard', () => {
  it('maps each local phase to its card status', () => {
    expect(localUploadToCard(makeLocalUpload({ phase: 'queued' })).status).toBe('queued');
    expect(localUploadToCard(makeLocalUpload({ phase: 'uploading' })).status).toBe('uploading');
    expect(localUploadToCard(makeLocalUpload({ phase: 'failed' })).status).toBe('uploadFailed');
    expect(localUploadToCard(makeLocalUpload({ phase: 'rejected' })).status).toBe('notUploaded');
  });

  it('carries the preview, progress, reason and error of the local item', () => {
    const card = localUploadToCard(
      makeLocalUpload({ phase: 'rejected', progress: 0, reason: 'FILE_TOO_SMALL', previewUrl: 'blob:a' }),
    );
    expect(card).toMatchObject({
      id: 'local-0',
      origin: 'local',
      name: 'selfie.jpg',
      previewUrl: 'blob:a',
      thumbnailUrl: null,
      reason: 'FILE_TOO_SMALL',
      errorMessage: null,
    });
  });
});

describe('imageToCard', () => {
  it('shows pending and processing images as "checking"', () => {
    expect(imageToCard(makeImageDto({ status: 'PENDING' }), null).status).toBe('checking');
    expect(imageToCard(makeImageDto({ status: 'PROCESSING' }), null).status).toBe('checking');
  });

  it('maps verdicts, the rejection reason and the thumbnail', () => {
    const image = makeImageDto({
      status: 'REJECTED',
      rejectionReason: 'MULTIPLE_FACES',
      thumbnailUrl: 'https://storage/thumb.jpg',
    });
    expect(imageToCard(image, 'blob:kept')).toMatchObject({
      id: 'img-1',
      origin: 'server',
      status: 'rejected',
      reason: 'MULTIPLE_FACES',
      thumbnailUrl: 'https://storage/thumb.jpg',
      previewUrl: 'blob:kept',
    });
    expect(imageToCard(makeImageDto({ status: 'ACCEPTED' }), null).status).toBe('accepted');
    expect(imageToCard(makeImageDto({ status: 'FAILED' }), null).status).toBe('failed');
  });
});

describe('buildPhotoSections', () => {
  it('groups local and server cards into in progress / accepted / rejected', () => {
    const sections = buildPhotoSections(
      [makeLocalUpload({ localId: 'uploading', phase: 'uploading' }), makeLocalUpload({ localId: 'bad', phase: 'rejected' })],
      [
        makeImageDto({ id: 'checking', status: 'PROCESSING' }),
        makeImageDto({ id: 'good', status: 'ACCEPTED' }),
        makeImageDto({ id: 'blurry', status: 'REJECTED', rejectionReason: 'BLURRY' }),
        makeImageDto({ id: 'broken', status: 'FAILED' }),
      ],
      { good: 'blob:good' },
    );
    const ids = (cards: readonly { id: string }[]) => cards.map((card) => card.id);

    expect(ids(sections.inProgress)).toEqual(['uploading', 'checking']);
    expect(ids(sections.accepted)).toEqual(['good']);
    expect(ids(sections.rejected)).toEqual(['bad', 'blurry', 'broken']);
    expect(sections.accepted[0]?.previewUrl).toBe('blob:good');
  });
});
