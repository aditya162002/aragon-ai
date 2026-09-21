import { useEffect, useRef, useState } from 'react';
import { UI } from '../constants';
import { collectVerdicts, snapshotStatuses, type StatusSnapshot } from '../lib/announcements';
import type { PhotoCardModel } from '../lib/to-card-model';

/**
 * Text for an `aria-live` region announcing verdicts as they arrive ("selfie.jpg accepted").
 * The gallery that is already there when the page loads is not announced.
 */
export function useVerdictAnnouncement(cards: readonly PhotoCardModel[], isReady: boolean): string {
  const [announcement, setAnnouncement] = useState('');
  const previous = useRef<StatusSnapshot | null>(null);

  useEffect(() => {
    if (!isReady) return;
    const verdicts = previous.current === null ? [] : collectVerdicts(previous.current, cards);
    previous.current = snapshotStatuses(cards);
    if (verdicts.length > 0) setAnnouncement(verdicts.join(UI.ANNOUNCEMENT_SEPARATOR));
  }, [cards, isReady]);

  return announcement;
}
