import Link from 'next/link'
import { cn } from './utils'

// ── Component ─────────────────────────────────────────────────────────────────

export interface FilterPillProps {
  label:     string
  active?:   boolean
  count?:    number
  onClick?:  () => void
  href?:     string
  className?: string
}

const ACTIVE_CLS   = 'bg-vio-primary text-white shadow-[0_2px_8px_rgba(52,199,89,0.3)] border-transparent'
const INACTIVE_CLS = 'bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] border border-[var(--chip-line)] hover:border-[var(--lagoon)] hover:text-[var(--sea-ink)]'
const BASE_CLS     = 'inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-sm font-medium transition-all duration-150 shrink-0 select-none'

export function FilterPill({
  label,
  active   = false,
  count,
  onClick,
  href,
  className,
}: FilterPillProps) {
  const classes = cn(BASE_CLS, active ? ACTIVE_CLS : INACTIVE_CLS, className)

  const inner = (
    <>
      {label}
      {count != null && (
        <span className={cn(
          'rounded-full px-1.5 py-0 text-[0.625rem] font-bold leading-4',
          active ? 'bg-white/25 text-white' : 'bg-[var(--line)] text-[var(--muted)]',
        )}>
          {count}
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  )
}
