import Link from 'next/link'

// ── Base listing card ──────────────────────────────────────────────────────────
// Shared foundation for all entity types: land, product, service, restaurant,
// tourism, rental, event. Variant-specific metadata is passed via the `meta`
// slot so the base card never needs to know about business-domain details.
//
// Usage:
//   <ListingCard
//     href="/dat-nong-nghiep/chi-tiet/my-slug"
//     title="Đất nông nghiệp Cẩm Mỹ"
//     image_url={coverUrl}
//     location="Cẩm Mỹ, Đồng Nai"
//     badges={[{ label: 'Nổi bật', variant: 'primary' }]}
//     meta={<><span>1.200 m²</span><span>2.5 Tỷ</span></>}
//   />

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning'

export interface ListingBadge {
  label:    string
  variant?: BadgeVariant
}

export interface ListingCardProps {
  href:       string
  title:      string
  image_url?: string | null
  location?:  string | null
  badges?:    ListingBadge[]
  meta?:      React.ReactNode
  featured?:  boolean
  className?: string
}

const BADGE_STYLES: Record<BadgeVariant, string> = {
  default:  'bg-black/30 text-white',
  primary:  'bg-[#0071E3]/80 text-white',
  success:  'bg-[#34C759]/80 text-white',
  warning:  'bg-[#FF9500]/80 text-white',
}

export function ListingCard({
  href,
  title,
  image_url,
  location,
  badges = [],
  meta,
  featured,
  className = '',
}: ListingCardProps) {
  const topBadge = badges[0]
  const featuredBadge: ListingBadge | undefined = featured
    ? { label: 'Nổi bật', variant: 'primary' }
    : undefined

  return (
    <Link
      href={href}
      className={[
        'group block rounded-[2rem] overflow-hidden',
        'bg-white dark:bg-[#1C1C1E]',
        'shadow-[0_2px_16px_rgb(0,0,0,0.08)] dark:shadow-[0_2px_16px_rgb(0,0,0,0.35)]',
        'no-underline transition-transform duration-300',
        'hover:scale-[1.02] active:scale-[0.98]',
        className,
      ].join(' ')}
    >
      {/* Cover — 3:2 */}
      <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {image_url ? (
          <img
            src={image_url}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="select-none text-5xl opacity-20" aria-hidden="true">📍</span>
          </div>
        )}

        {/* Top-left badge */}
        {topBadge && (
          <span className={[
            'absolute left-3 top-3 rounded-full px-3 py-1',
            'text-xs font-semibold leading-none backdrop-blur-md',
            BADGE_STYLES[topBadge.variant ?? 'default'],
          ].join(' ')}>
            {topBadge.label}
          </span>
        )}

        {/* Featured badge top-right */}
        {featuredBadge && (
          <span className={[
            'absolute right-3 top-3 rounded-full px-3 py-1',
            'text-xs font-semibold leading-none backdrop-blur-md',
            BADGE_STYLES.primary,
          ].join(' ')}>
            {featuredBadge.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-3.5">
        {location && (
          <p className="m-0 mb-0.5 text-xs text-gray-400 dark:text-gray-500">
            {location}
          </p>
        )}
        <p className="m-0 line-clamp-2 text-base font-medium leading-snug text-gray-800 dark:text-gray-200">
          {title}
        </p>
        {meta && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            {meta}
          </div>
        )}
      </div>
    </Link>
  )
}
