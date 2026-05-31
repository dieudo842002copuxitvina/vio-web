import Link              from 'next/link'
import { ShareButton }  from './ShareButton'
import { ListingBadgePill } from '@/entities/listing/ui/ListingBadge'
import type { BadgeVariant } from '@/entities/listing'
import type { PriceType }   from '@/entities/listing'

// Server Component — ShareButton is a client island rendered inside.

interface Crumb {
  name: string
  href?: string
}

interface ListingHeaderProps {
  title:         string
  breadcrumbs?:  Crumb[]
  badges?:       Array<{ label: string; variant?: BadgeVariant }>
  price_text?:   string | null
  price_type?:   PriceType | null
  location_text?: string | null
  listingUrl:    string             // absolute canonical URL for sharing
  verified?:     boolean
}

const PRICE_TYPE_SUFFIX: Partial<Record<PriceType, string>> = {
  per_night:  '/ đêm',
  per_person: '/ người',
  per_unit:   '/ cái',
  negotiable: '· Thương lượng',
  on_request: '· Liên hệ',
}

export function ListingHeader({
  title,
  breadcrumbs,
  badges = [],
  price_text,
  price_type,
  location_text,
  listingUrl,
  verified,
}: ListingHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1 text-[0.8125rem] text-gray-400 dark:text-gray-500">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && (
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                  <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors no-underline"
                >
                  {crumb.name}
                </Link>
              ) : (
                <span className="text-gray-600 dark:text-gray-300">{crumb.name}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row + share */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="m-0 text-[1.5rem] font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-[1.75rem]">
          {title}
        </h1>
        <ShareButton title={title} url={listingUrl} />
      </div>

      {/* Badges */}
      {(badges.length > 0 || verified) && (
        <div className="flex flex-wrap items-center gap-2">
          {verified && (
            <ListingBadgePill label="Đã xác minh" variant="success" mode="tag" />
          )}
          {badges.map((b, i) => (
            <ListingBadgePill key={i} label={b.label} variant={b.variant} mode="tag" />
          ))}
        </div>
      )}

      {/* Price */}
      {price_text && (
        <p className="m-0 text-[1.75rem] font-bold tracking-tight text-gray-900 dark:text-white leading-none">
          {price_text}
          {price_type && PRICE_TYPE_SUFFIX[price_type] && (
            <span className="ml-2 text-base font-normal text-gray-400">
              {PRICE_TYPE_SUFFIX[price_type]}
            </span>
          )}
        </p>
      )}

      {/* Location */}
      {location_text && (
        <p className="m-0 flex items-center gap-1.5 text-[0.875rem] text-gray-500 dark:text-gray-400">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M6 0a4 4 0 0 1 4 4c0 3-4 8-4 8S2 7 2 4a4 4 0 0 1 4-4zm0 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
          </svg>
          {location_text}
        </p>
      )}
    </header>
  )
}
