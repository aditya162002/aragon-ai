import { useEffect, useRef } from 'react';

/** Revokes object URLs as soon as they are no longer in `liveUrls`, and all remaining ones on unmount. */
export function useObjectUrlCleanup(liveUrls: readonly string[]): void {
  const trackedUrls = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const live = new Set(liveUrls);
    for (const url of trackedUrls.current) {
      if (!live.has(url)) URL.revokeObjectURL(url);
    }
    trackedUrls.current = live;
  }, [liveUrls]);

  useEffect(
    () => () => {
      for (const url of trackedUrls.current) URL.revokeObjectURL(url);
      trackedUrls.current = new Set();
    },
    [],
  );
}
