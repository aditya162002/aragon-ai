import { PERCENT } from '../constants';
import { cx } from '../lib/cx';
import { toPercent } from '../lib/percent';

interface ProgressBarProps {
  value: number;
  max: number;
  /** Accessible name, either as text or by pointing at a visible label. */
  label?: string;
  labelledBy?: string;
  valueText?: string;
  className?: string;
}

/** Accessible determinate progress bar (`role="progressbar"` with aria values). */
export function ProgressBar({ value, max, label, labelledBy, valueText, className }: ProgressBarProps) {
  const percent = toPercent(value, max);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-valuemin={PERCENT.MIN}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={valueText}
      className={cx('overflow-hidden rounded-full', className)}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-brand-600 to-brand-accent transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
