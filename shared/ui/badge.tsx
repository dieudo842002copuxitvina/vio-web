import { cn } from './utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'error' | 'neutral'
type BadgeSize    = 'sm' | 'default'

const VARIANT: Record<BadgeVariant, string> = {
  default: 'bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] border border-[var(--chip-line)]',
  success: 'bg-vio-primary/10 text-vio-forest border border-vio-primary/20',
  warning: 'bg-vio-amber/10 text-amber-700 border border-vio-amber/20 dark:text-amber-400',
  info:    'bg-vio-blue/10 text-vio-blue border border-vio-blue/20',
  error:   'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20',
  neutral: 'bg-[var(--foam)] text-[var(--muted)] border border-[var(--line)]',
}

const SIZE: Record<BadgeSize, string> = {
  sm:      'px-2 py-0.5 text-[0.6875rem] gap-1',
  default: 'px-2.5 py-1 text-[0.75rem] gap-1.5',
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?:    BadgeSize
  /** Renders a pulsing dot before the label — use for live/active indicators */
  dot?:     boolean
}

export function Badge({
  variant = 'default',
  size    = 'default',
  dot     = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className="relative flex h-1.5 w-1.5 shrink-0"
          aria-hidden="true"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}
