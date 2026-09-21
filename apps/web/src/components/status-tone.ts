import type { CardStatus } from '../lib/to-card-model';

/** Colour family each card status is drawn in; the class maps below keep badge/border/text consistent. */
export type Tone = 'neutral' | 'brand' | 'success' | 'danger' | 'warning';

export const STATUS_TONE: Readonly<Record<CardStatus, Tone>> = {
  queued: 'neutral',
  uploading: 'brand',
  checking: 'brand',
  accepted: 'success',
  rejected: 'danger',
  notUploaded: 'danger',
  failed: 'warning',
  uploadFailed: 'warning',
};

export const BADGE_TONE_CLASSES: Readonly<Record<Tone, string>> = {
  neutral: 'bg-white/90 text-slate-700 ring-slate-900/10',
  brand: 'bg-white/90 text-brand-700 ring-brand-600/15',
  success: 'bg-emerald-500 text-white ring-emerald-600/20',
  danger: 'bg-rose-600 text-white ring-rose-700/20',
  warning: 'bg-amber-400 text-amber-950 ring-amber-500/30',
};

export const CARD_BORDER_TONE_CLASSES: Readonly<Record<Tone, string>> = {
  neutral: 'border-slate-200',
  brand: 'border-slate-200',
  success: 'border-emerald-200',
  danger: 'border-rose-200',
  warning: 'border-amber-200',
};

export const DETAIL_TONE_CLASSES: Readonly<Record<Tone, string>> = {
  neutral: 'text-slate-500',
  brand: 'text-slate-500',
  success: 'text-emerald-700',
  danger: 'text-rose-700',
  warning: 'text-amber-800',
};
