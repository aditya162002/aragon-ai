import { REJECTION_LABELS, REJECTION_MESSAGES } from '@aragon/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeCard } from '../test/fixtures';
import { PhotoCard } from './PhotoCard';

function renderCard(overrides: Parameters<typeof makeCard>[0]) {
  const card = makeCard(overrides);
  const onRemove = vi.fn();
  const onRetry = vi.fn();
  render(<PhotoCard card={card} onRemove={onRemove} onRetry={onRetry} />);
  return { card, onRemove, onRetry };
}

describe('PhotoCard', () => {
  it('shows the rejection label and message, and deletes on click', async () => {
    const { card, onRemove } = renderCard({ name: 'group.jpg', status: 'rejected', reason: 'MULTIPLE_FACES' });

    expect(screen.getByText(REJECTION_LABELS.MULTIPLE_FACES)).toBeInTheDocument();
    expect(screen.getByText(REJECTION_MESSAGES.MULTIPLE_FACES)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete group.jpg' }));
    expect(onRemove).toHaveBeenCalledWith(card);
  });

  it('marks client-rejected files as not uploaded with a dismiss button', () => {
    renderCard({ id: 'local-1', origin: 'local', name: 'huge.jpg', status: 'notUploaded', reason: 'FILE_TOO_LARGE' });

    expect(screen.getByText('Not uploaded')).toBeInTheDocument();
    expect(screen.getByText(REJECTION_MESSAGES.FILE_TOO_LARGE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss huge.jpg' })).toBeInTheDocument();
  });

  it('offers a retry when the upload failed', async () => {
    const { card, onRetry } = renderCard({
      id: 'local-2',
      origin: 'local',
      status: 'uploadFailed',
      errorMessage: 'Network error. Check your connection and try again.',
    });

    expect(screen.getByText(/network error/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry selfie.jpg' }));
    expect(onRetry).toHaveBeenCalledWith(card);
  });

  it('shows upload progress while uploading', () => {
    renderCard({ id: 'local-3', origin: 'local', status: 'uploading', progress: 45 });

    expect(screen.getByRole('progressbar', { name: 'Uploading selfie.jpg' })).toHaveAttribute('aria-valuenow', '45');
    expect(screen.getByRole('button', { name: 'Remove selfie.jpg' })).toBeInTheDocument();
  });

  it('explains a processing failure', () => {
    renderCard({ status: 'failed' });
    expect(screen.getByText(/couldn't process this photo/i)).toBeInTheDocument();
  });

  it('shows a HEIC placeholder until the server thumbnail exists', () => {
    renderCard({ status: 'checking', format: 'HEIC' });
    expect(screen.getByText('HEIC preview after processing')).toBeInTheDocument();
    expect(screen.getByText('Checking quality…')).toBeInTheDocument();
  });
});
