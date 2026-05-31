export interface MetaItem {
  text:   string
  icon?:  string   // emoji or short SVG string
  label?: string   // optional "Loại đất:" prefix
}

interface ListingMetaProps {
  items:      MetaItem[]
  separator?: 'dot' | 'pipe' | 'slash'
  className?: string
}

const SEPARATOR = {
  dot:   '·',
  pipe:  '|',
  slash: '/',
}

export function ListingMeta({
  items,
  separator = 'dot',
  className = '',
}: ListingMetaProps) {
  const visible = items.filter(i => i.text)
  if (visible.length === 0) return null

  const sep = SEPARATOR[separator]

  return (
    <div
      className={[
        'flex flex-wrap items-center gap-x-1.5 gap-y-0.5',
        'text-sm text-gray-500 dark:text-gray-400 m-0',
        className,
      ].join(' ')}
    >
      {visible.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1">
          {idx > 0 && (
            <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
              {sep}
            </span>
          )}
          {item.icon && <span aria-hidden="true">{item.icon}</span>}
          {item.label && (
            <span className="text-gray-400 dark:text-gray-500">{item.label}</span>
          )}
          <span>{item.text}</span>
        </span>
      ))}
    </div>
  )
}
