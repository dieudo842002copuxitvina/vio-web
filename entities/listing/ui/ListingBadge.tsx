import type { BadgeVariant } from '../model/types'

// Atomic badge pill — glassmorphism overlay used on card images.
// Also usable as an inline tag in list views (add `inline` variant if needed).

const STYLES: Record<BadgeVariant, string> = {
  default: 'bg-black/30 text-white',
  primary: 'bg-[#0071E3]/80 text-white',
  success: 'bg-[#34C759]/80 text-white',
  warning: 'bg-[#FF9500]/80 text-white',
  danger:  'bg-[#FF3B30]/80 text-white',
}

interface ListingBadgeProps {
  label:    string
  variant?: BadgeVariant
  // 'overlay' = backdrop-blur for card image; 'tag' = opaque for body/list use
  mode?:    'overlay' | 'tag'
  className?: string
}

export function ListingBadgePill({
  label,
  variant = 'default',
  mode    = 'overlay',
  className = '',
}: ListingBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1',
        'text-xs font-semibold leading-none',
        mode === 'overlay' ? 'backdrop-blur-md' : '',
        STYLES[variant],
        className,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
