import { cn } from './utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type ProgressSize        = 'sm' | 'default'
type ProgressColorScheme = 'primary' | 'success' | 'warning'

const TRACK_SIZE: Record<ProgressSize, string> = {
  sm:      'h-1',
  default: 'h-1.5',
}

const FILL_COLOR: Record<ProgressColorScheme, string> = {
  primary: 'bg-vio-primary',
  success: 'bg-vio-primary',
  warning: 'bg-vio-amber',
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  value:        number
  max?:         number
  label?:       string
  showValue?:   boolean
  size?:        ProgressSize
  colorScheme?: ProgressColorScheme
  className?:   string
}

export function ProgressBar({
  value,
  max         = 100,
  label,
  showValue   = false,
  size        = 'default',
  colorScheme = 'primary',
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between">
          {label    && <span className="text-[0.75rem] text-[var(--muted)]">{label}</span>}
          {showValue && <span className="text-[0.75rem] font-semibold text-[var(--sea-ink)]">{value}/{max}</span>}
        </div>
      )}
      <div
        className={cn('w-full rounded-full bg-[var(--line)]', TRACK_SIZE[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn(
            'rounded-full transition-[width] duration-500 ease-out',
            TRACK_SIZE[size],
            FILL_COLOR[colorScheme],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
