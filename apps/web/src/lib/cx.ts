/** Joins the truthy class names (a tiny `clsx`). */
export function cx(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}
