/** Visually hidden live region; screen readers announce each new message (e.g. "selfie.jpg accepted"). */
export function LiveAnnouncer({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
