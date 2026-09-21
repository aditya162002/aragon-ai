import { TARGET_ACCEPTED_PHOTOS } from '@aragon/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressSummary } from './ProgressSummary';

describe('ProgressSummary', () => {
  it('shows "X of N photos accepted" with matching progressbar values', () => {
    render(<ProgressSummary acceptedCount={4} />);

    const bar = screen.getByRole('progressbar', { name: `4 of ${TARGET_ACCEPTED_PHOTOS} photos accepted` });
    expect(bar).toHaveAttribute('aria-valuenow', '4');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', String(TARGET_ACCEPTED_PHOTOS));
    expect(screen.getByText(`${TARGET_ACCEPTED_PHOTOS - 4} more to go`, { exact: false })).toBeInTheDocument();
  });

  it('keeps aria-valuenow within range once the target is exceeded', () => {
    render(<ProgressSummary acceptedCount={TARGET_ACCEPTED_PHOTOS + 2} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(TARGET_ACCEPTED_PHOTOS));
    expect(screen.getByText(/you're all set/i)).toBeInTheDocument();
  });
});
