import { useState } from 'react';

/**
 * Signed thumbnail URLs are re-issued on every poll but point at the same bytes. Keeping the first
 * URL stops the browser re-downloading every thumbnail each poll; we only switch to the latest URL
 * if the kept one fails to load (e.g. it expired).
 */
export function useStableUrl(latestUrl: string | null): { url: string | null; onError: () => void } {
  const [url, setUrl] = useState(latestUrl);
  // Adopt the first URL that arrives (adjusting state during render is React's pattern for derived state).
  if (url === null && latestUrl !== null) setUrl(latestUrl);
  return { url, onError: () => setUrl(latestUrl) };
}
