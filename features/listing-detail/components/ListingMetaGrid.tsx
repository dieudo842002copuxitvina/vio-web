// Server Component — renders key-value attribute pairs as an iOS-style grid.
// Works for any vertical: land area/legal_status, restaurant hours, event date, etc.
// Consumers pass the UniversalListing.attributes record; this component is
// completely vertical-agnostic.

interface MetaItem {
  label: string
  value: string | number
  icon?: string   // emoji or SVG element (optional)
}

interface ListingMetaGridProps {
  items:      MetaItem[]
  columns?:   2 | 3
  className?: string
}

export function ListingMetaGrid({
  items,
  columns = 2,
  className = '',
}: ListingMetaGridProps) {
  if (items.length === 0) return null

  const gridClass = columns === 3
    ? 'grid-cols-2 sm:grid-cols-3'
    : 'grid-cols-2'

  return (
    <div className={[`grid gap-3 ${gridClass}`, className].join(' ')}>
      {items.map(item => (
        <div
          key={item.label}
          className={[
            'flex flex-col gap-0.5 rounded-2xl p-4',
            'bg-gray-50 dark:bg-[#1C1C1E]',
          ].join(' ')}
        >
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-500">
            {item.label}
          </span>
          <span className="text-[0.9375rem] font-semibold text-gray-900 dark:text-white leading-snug">
            {item.icon && <span className="mr-1.5 select-none" aria-hidden="true">{item.icon}</span>}
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Helper: convert UniversalListing.attributes → MetaItem[] ─────────────────
// Keeps the component free of mapping logic; callers do the mapping.

export function attributesToMetaItems(
  attributes: Record<string, string | number | boolean | null>,
  labelMap: Record<string, string>,
  iconMap?: Record<string, string>,
): MetaItem[] {
  return Object.entries(attributes)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([key, value]) => ({
      label: labelMap[key] ?? key,
      value: typeof value === 'boolean' ? (value ? 'Có' : 'Không') : String(value),
      icon:  iconMap?.[key],
    }))
}
