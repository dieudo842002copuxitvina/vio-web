/**
 * Recursive className value — mirrors clsx's ClassValue so callers may use:
 *   cn(condition && ['class-a', 'class-b'])
 */
export type ClassValue = string | number | boolean | null | undefined | ClassValue[]

/**
 * Resolve a single ClassValue to a string (empty string for falsy leaves).
 * Recursively flattens arrays so nesting depth is unlimited.
 */
function resolve(val: ClassValue): string {
  if (!val) return ''
  if (Array.isArray(val)) return val.map(resolve).filter(Boolean).join(' ')
  return String(val)
}

/**
 * Minimal className merger — zero dependencies.
 * Accepts nested arrays and filters falsy values; joins with a single space.
 * For Tailwind conflict resolution, upgrade to tailwind-merge.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.map(resolve).filter(Boolean).join(' ')
}
