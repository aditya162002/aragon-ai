import { useId } from 'react';
import { getAcceptedProgress } from '../lib/progress';
import { CheckIcon } from './icons';
import { ProgressBar } from './ProgressBar';

/** "X of N photos accepted" with a progress bar towards the target. */
export function ProgressSummary({ acceptedCount }: { acceptedCount: number }) {
  const labelId = useId();
  const progress = getAcceptedProgress(acceptedCount);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:w-80">
      <div className="flex items-center justify-between gap-4">
        <p id={labelId} className="text-sm text-slate-600">
          <span className="text-2xl font-semibold text-slate-900 tabular-nums">{progress.accepted}</span> of{' '}
          {progress.target} photos accepted
        </p>
        {progress.isComplete && (
          <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckIcon className="size-4" weight="bold" />
          </span>
        )}
      </div>
      <ProgressBar
        value={progress.accepted}
        max={progress.target}
        labelledBy={labelId}
        valueText={`${progress.valueNow} of ${progress.target}`}
        className="mt-3 h-2 bg-slate-100"
      />
      <p className="mt-2 text-xs text-slate-500">
        {progress.isComplete
          ? "You're all set. Adding a few more can improve variety."
          : `${progress.remaining} more to go. Mix close-ups, angles and outfits.`}
      </p>
    </div>
  );
}
