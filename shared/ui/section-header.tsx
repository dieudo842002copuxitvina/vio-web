import Link from 'next/link'
import { cn } from './utils'

// ── Component ─────────────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  kicker?:      string
  kickerColor?: string
  title:        string
  subtitle?:    string
  action?:      { label: string; href: string }
  className?:   string
}

export function SectionHeader({
  kicker,
  kickerColor = 'text-vio-primary',
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        {kicker && (
          <p className={cn('section-kicker mb-1', kickerColor)}>
            {kicker}
          </p>
        )}
        <h2 className="text-section-sm font-bold tracking-tight text-[var(--sea-ink)] sm:text-section-lg">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="shrink-0 text-sm font-semibold text-vio-blue hover:opacity-70 transition-opacity"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
