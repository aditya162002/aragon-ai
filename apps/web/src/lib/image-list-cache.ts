/** Pure updaters for the cached image list (used with `queryClient.setQueryData`). */
import { isInFlight, type ImageDto, type ImageListResponse } from '@aragon/shared';
import { QUERY } from '../constants';

export function prependImage(list: ImageListResponse | undefined, image: ImageDto): ImageListResponse {
  const others = (list?.items ?? []).filter((item) => item.id !== image.id);
  return { items: [image, ...others], nextCursor: list?.nextCursor ?? null };
}

export function removeImage(list: ImageListResponse | undefined, imageId: string): ImageListResponse | undefined {
  return list && { ...list, items: list.items.filter((item) => item.id !== imageId) };
}

/** Poll only while some photo is still waiting for a verdict. */
export function pollIntervalFor(list: ImageListResponse | undefined): number | false {
  return list?.items.some((item) => isInFlight(item.status)) ? QUERY.POLL_INTERVAL_MS : false;
}
