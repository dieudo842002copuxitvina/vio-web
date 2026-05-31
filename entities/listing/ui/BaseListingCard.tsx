import Link                from 'next/link'
import { ListingBadgePill }   from './ListingBadge'
import { FavoriteButton } from './FavoriteButton'
import type { BadgeVariant } from '../model/types'

// ── Layout variants ────────────────────────────────────────────────────────────
// grid    → vertical card, image top (3:2), body below — homepage/category grids
// list    → horizontal, image left (square 1:1), body right — search results
// compact → no image, single-line body — autocomplete / dense dashboards
export type CardLayout = 'grid' | 'list' | 'compact'

export interface CardBadgeDef {
  label:    string
  variant?: BadgeVariant
  position: 'left' | 'right'
}

export interface BaseListingCardProps {
  href:          string
  imageUrl?:     string | null
  imageAlt?:     string
  placeholderEmoji?: string            // shown when no image; default "📍"
  badges?:       CardBadgeDef[]
  showFavorite?: boolean
  listingId?:    string
  layout?:       CardLayout
  className?:    string
  children:      React.ReactNode       // body content (price, meta, title, location)
}

// ── Shared chrome classes ──────────────────────────────────────────────────────
const CARD_BASE = [
  'group block rounded-[2rem] overflow-hidden',
  'bg-white dark:bg-[#1C1C1E]',
  'shadow-[0_2px_16px_rgb(0,0,0,0.08)] dark:shadow-[0_2px_16px_rgb(0,0,0,0.35)]',
  'no-underline transition-transform duration-300',
  'hover:scale-[1.02] active:scale-[0.98]',
].join(' ')

export function BaseListingCard({
  href,
  imageUrl,
  imageAlt = '',
  placeholderEmoji = '📍',
  badges = [],
  showFavorite = false,
  listingId,
  layout   = 'grid',
  className = '',
  children,
}: BaseListingCardProps) {
  if (layout === 'compact') {
    return (
      <Link
        href={href}
        className={[
          'group flex items-center gap-3 rounded-2xl px-4 py-3',
          'bg-white dark:bg-[#1C1C1E]',
          'border border-gray-100 dark:border-white/[0.08]',
          'no-underline transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]',
          className,
        ].join(' ')}
      >
        {/* Compact thumbnail */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={imageAlt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xl opacity-30" aria-hidden="true">
              {placeholderEmoji}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </Link>
    )
  }

  if (layout === 'list') {
    return (
      <Link
        href={href}
        className={[
          'group flex gap-4 rounded-2xl overflow-hidden',
          'bg-white dark:bg-[#1C1C1E]',
          'shadow-[0_2px_12px_rgb(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgb(0,0,0,0.25)]',
          'no-underline transition-transform duration-300',
          'hover:scale-[1.01] active:scale-[0.99]',
          className,
        ].join(' ')}
      >
        {/* Square image — left column */}
        <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 sm:w-36">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={imageAlt}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              loading="lazy"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-3xl opacity-20" aria-hidden="true">
              {placeholderEmoji}
            </span>
          )}
          {/* Left badges only in list layout */}
          {badges.filter(b => b.position === 'left').map((b, i) => (
            <ListingBadgePill
              key={i}
              label={b.label}
              variant={b.variant}
              className="absolute left-2 top-2"
            />
          ))}
        </div>

        {/* Body — right column */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 pr-4">
          {children}
        </div>
      </Link>
    )
  }

  // ── Grid (default) — image top, body below ─────────────────────────────────
  const leftBadges  = badges.filter(b => b.position === 'left')
  const rightBadges = badges.filter(b => b.position === 'right')

  return (
    <Link
      href={href}
      className={[CARD_BASE, className].join(' ')}
    >
      {/* Cover — 3:2 */}
      <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="select-none text-5xl opacity-20" aria-hidden="true">
              {placeholderEmoji}
            </span>
          </div>
        )}

        {/* Left badges — glassmorphism overlay */}
        {leftBadges.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {leftBadges.map((b, i) => (
              <ListingBadgePill key={i} label={b.label} variant={b.variant} />
            ))}
          </div>
        )}

        {/* Right badges + favorite button */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {rightBadges.map((b, i) => (
            <ListingBadgePill key={i} label={b.label} variant={b.variant} />
          ))}
          {showFavorite && listingId && (
            <FavoriteButton listingId={listingId} />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1 px-4 pb-4 pt-3.5">
        {children}
      </div>
    </Link>
  )
}
