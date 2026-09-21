import { useId, type ComponentType } from 'react';
import { cx } from '../lib/cx';
import { PHOTO_DONTS, PHOTO_DOS, type Guideline } from '../lib/photo-guidelines';
import { CheckIcon, XMarkIcon } from './icons';

/** Do's and don'ts for good results, shown next to the upload area. */
export function PhotoGuidelines() {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id={headingId} className="text-base font-semibold text-slate-900">
        Photo guidelines
      </h2>
      <p className="mt-1 text-sm text-slate-500">Better photos mean better results. Every upload is checked for these.</p>
      <GuidelineList title="Do" items={PHOTO_DOS} Icon={CheckIcon} iconClassName="bg-emerald-50 text-emerald-600" />
      <GuidelineList title="Don't" items={PHOTO_DONTS} Icon={XMarkIcon} iconClassName="bg-rose-50 text-rose-600" />
    </section>
  );
}

interface GuidelineListProps {
  title: string;
  items: readonly Guideline[];
  Icon: ComponentType<{ className?: string }>;
  iconClassName: string;
}

function GuidelineList({ title, items, Icon, iconClassName }: GuidelineListProps) {
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.title} className="flex gap-3">
            <span className={cx('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full', iconClassName)}>
              <Icon className="size-3" />
            </span>
            <p className="text-sm leading-snug">
              <span className="font-medium text-slate-900">{item.title}.</span>{' '}
              <span className="text-slate-500">{item.detail}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
