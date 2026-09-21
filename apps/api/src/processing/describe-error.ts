/** One-line description of anything thrown, for logs and the internal `last_error` column. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
