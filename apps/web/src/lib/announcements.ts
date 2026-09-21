import { verdictAnnouncement } from './card-copy';
import type { CardStatus, PhotoCardModel } from './to-card-model';

export type StatusSnapshot = ReadonlyMap<string, CardStatus>;

export function snapshotStatuses(cards: readonly PhotoCardModel[]): StatusSnapshot {
  return new Map(cards.map((card) => [card.id, card.status]));
}

/** Announcements for cards whose status changed since `previous` (new cards count as changed). */
export function collectVerdicts(previous: StatusSnapshot, cards: readonly PhotoCardModel[]): string[] {
  return cards
    .filter((card) => previous.get(card.id) !== card.status)
    .map(verdictAnnouncement)
    .filter((message) => message !== null);
}
