/**
 * Minimal className merger — zero dependencies.
 * Filters falsy values and joins with a space.
 * For complex merging (Tailwind conflict resolution) upgrade to tailwind-merge.
 */
export function cn(
  ...classes: (string | undefined | null | false | 0)[]
): string {
  return classes.filter(Boolean).join(' ')
}
