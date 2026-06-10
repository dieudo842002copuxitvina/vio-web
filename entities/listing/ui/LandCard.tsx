import Link from 'next/link'
import type { PriceType } from '../model/types'
import { FavoriteButton } from './FavoriteButton'

// ── Types ──────────────────────────────────────────────────────────────────────

export type LandCardVariant = 'standard' | 'featured' | 'list' | 'compact'

export interface LandCardProps {
  // Identity
  id:   string
  slug: string

  // Content
  title:    string
  imageUrl?: string | null

  // Location — compose from parts or use pre-formatted fallback
  province?:     string | null
  district?:     string | null
  locationText?: string | null   // e.g. "Di Linh, Lâm Đồng"

  // Land-specific attributes
  area?:        string | null    // e.g. "1.200 m²"
  landType?:    string | null    // e.g. "Đất cây lâu năm"
  legalStatus?: string | null    // e.g. "Sổ đỏ"

  // Pricing
  price?:     string | null      // e.g. "1.5 Tỷ"
  priceType?: PriceType | null

  // Status flags
  isFeatured?: boolean   // "Nổi bật" amber badge
  isVerified?: boolean   // "Xác minh" shield badge
  proLocked?:  boolean   // "Pro" lock badge — contact gate hint

  // Display options
  variant?:      LandCardVariant
  showFavorite?: boolean
  className?:    string
}

// ── Display helpers ────────────────────────────────────────────────────────────

const PRICE_SUFFIX: Partial<Record<PriceType, string>> = {
  negotiable: '· Thương lượng',
  on_request: '· Liên hệ',
}

function getLocation(
  province?: string | null,
  district?:  string | null,
  locationText?: string | null,
): string | null {
  if (district && province) return `${district}, ${province}`
  if (province)             return province
  if (district)             return district
  return locationText ?? null
}

function getPriceSuffix(priceType?: PriceType | null): string | null {
  if (!priceType) return null
  return PRICE_SUFFIX[priceType] ?? null
}

// ── Shared visual atoms ────────────────────────────────────────────────────────

// Land SVG placeholder — shown when no cover image
function ImagePlaceholder() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center
                 bg-gradient-to-br from-[#E8F0EB] to-[#D5E8DC]"
      aria-hidden="true"
    >
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
           className="opacity-40 text-vio-forest">
        <path d="M12 22V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 13C11 11 8.5 9.5 6 10c.5-3.5 3-5 6-5s5.5 1.5 6 5c-2.5-.5-5 1-6 3z"
              stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15"/>
        <path d="M3 22h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

// Overlay badge — rendered on top of card image
function OverlayBadge({
  label, color, icon,
}: {
  label: string
  color: string     // tailwind bg + text classes
  icon?: React.ReactNode
}) {
  return (
    <span className={[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
      'text-[11px] font-bold leading-none backdrop-blur-md',
      color,
    ].join(' ')}>
      {icon}
      {label}
    </span>
  )
}

// Inline pill — rendered in card body / tags row
function InlinePill({ label, variant = 'neutral' }: { label: string; variant?: 'green' | 'neutral' }) {
  return (
    <span className={[
      'inline-flex items-center rounded-full px-2.5 py-0.5',
      'text-[11px] font-semibold leading-none whitespace-nowrap',
      variant === 'green'
        ? 'bg-vio-primary/10 text-vio-forest border border-vio-primary/20'
        : 'bg-[var(--foam)] text-[var(--sea-ink-soft)] border border-[var(--line)]',
    ].join(' ')}>
      {label}
    </span>
  )
}

// Location pin icon
function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            fill="currentColor" fillOpacity="0.6"/>
      <circle cx="12" cy="9" r="2.5" fill="white"/>
    </svg>
  )
}

// Verified shield icon
function ShieldIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            fill="currentColor" fillOpacity="0.9"/>
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// Lock icon
function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// Shared image section with all overlay badges
function CardImageSection({
  imageUrl, title, isFeatured, isVerified, proLocked,
  showFavorite, id, aspectClass, roundedClass,
}: {
  imageUrl?: string | null
  title: string
  isFeatured?: boolean
  isVerified?: boolean
  proLocked?: boolean
  showFavorite?: boolean
  id: string
  aspectClass:  string
  roundedClass: string
}) {
  return (
    <div className={[
      'relative overflow-hidden bg-[var(--sand)]',
      aspectClass, roundedClass,
    ].join(' ')}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover
                     transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      ) : (
        <ImagePlaceholder />
      )}

      {/* Top-right: featured + pro lock */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
        {isFeatured && (
          <OverlayBadge label="Nổi bật" color="bg-vio-amber/90 text-white" />
        )}
        {proLocked && (
          <OverlayBadge label="Pro" color="bg-vio-blue/85 text-white" icon={<LockIcon />} />
        )}
      </div>

      {/* Bottom-left: verified + bottom-right: favorite */}
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
        {isVerified ? (
          <OverlayBadge label="Xác minh" color="bg-vio-primary/85 text-white" icon={<ShieldIcon />} />
        ) : (
          <span aria-hidden="true" />
        )}
        {showFavorite && (
          <FavoriteButton listingId={id} />
        )}
      </div>
    </div>
  )
}

// ── Standard variant ───────────────────────────────────────────────────────────

function StandardCard({
  id, slug, title, imageUrl,
  province, district, locationText,
  area, landType, legalStatus,
  price, priceType,
  isFeatured, isVerified, proLocked,
  showFavorite, className,
}: LandCardProps) {
  const location = getLocation(province, district, locationText)
  const suffix   = getPriceSuffix(priceType)

  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${slug}`}
      className={[
        'group block overflow-hidden rounded-[2rem]',
        'bg-[var(--surface)]',
        'shadow-apple-soft border border-[var(--line)]',
        'no-underline',
        'transition-all duration-300',
        'hover:shadow-apple-hover hover:-translate-y-1',
        className ?? '',
      ].join(' ')}
    >
      <CardImageSection
        imageUrl={imageUrl} title={title}
        isFeatured={isFeatured} isVerified={isVerified} proLocked={proLocked}
        showFavorite={showFavorite} id={id}
        aspectClass="aspect-[3/2]"
        roundedClass=""
      />

      {/* Body */}
      <div className="flex flex-col gap-1.5 px-4 pb-5 pt-4">
        {/* Land type tag */}
        {(landType ?? legalStatus) && (
          <div className="flex flex-wrap gap-1.5">
            {landType    && <InlinePill label={landType}    variant="green"   />}
            {legalStatus && <InlinePill label={legalStatus} variant="neutral" />}
          </div>
        )}

        {/* Title */}
        <p className="m-0 line-clamp-2 text-[15px] font-semibold leading-snug
                      text-[var(--sea-ink)]">
          {title}
        </p>

        {/* Price */}
        {price && (
          <p className="m-0 text-[20px] font-bold leading-tight tracking-tight text-vio-forest">
            {price}
            {suffix && (
              <span className="ml-1.5 text-[13px] font-normal text-[var(--muted)]">
                {suffix}
              </span>
            )}
          </p>
        )}

        {/* Meta: area + location */}
        {(area ?? location) && (
          <div className="flex items-center gap-1.5 text-[13px] text-[var(--muted)]">
            {area && <span>{area}</span>}
            {area && location && <span aria-hidden="true">·</span>}
            {location && (
              <span className="flex items-center gap-0.5">
                <PinIcon />
                {location}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Featured variant ───────────────────────────────────────────────────────────

function FeaturedCard({
  id, slug, title, imageUrl,
  province, district, locationText,
  area, landType, legalStatus,
  price, priceType,
  isFeatured, isVerified, proLocked,
  showFavorite, className,
}: LandCardProps) {
  const location = getLocation(province, district, locationText)
  const suffix   = getPriceSuffix(priceType)

  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${slug}`}
      className={[
        'group block overflow-hidden rounded-3xl',
        'bg-[var(--surface)]',
        'shadow-apple-card border border-[var(--line)]',
        'no-underline',
        'transition-all duration-300',
        'hover:shadow-apple-hover hover:-translate-y-1',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex flex-col sm:flex-row sm:min-h-[280px]">

        {/* Image — full width mobile, 55% desktop */}
        <div className="relative overflow-hidden bg-[var(--sand)]
                        aspect-[3/2] sm:aspect-auto sm:w-[55%] sm:self-stretch">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover
                         transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <ImagePlaceholder />
          )}
          {/* Image overlay badges */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            {isFeatured && (
              <OverlayBadge label="Nổi bật" color="bg-vio-amber/90 text-white" />
            )}
            {proLocked && (
              <OverlayBadge label="Pro" color="bg-vio-blue/85 text-white" icon={<LockIcon />} />
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            {isVerified ? (
              <OverlayBadge label="Xác minh" color="bg-vio-primary/85 text-white" icon={<ShieldIcon />} />
            ) : <span aria-hidden="true" />}
            {showFavorite && <FavoriteButton listingId={id} />}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-center gap-3 p-5 sm:p-8">

          {/* Tags */}
          {(landType ?? legalStatus) && (
            <div className="flex flex-wrap gap-1.5">
              {landType    && <InlinePill label={landType}    variant="green"   />}
              {legalStatus && <InlinePill label={legalStatus} variant="neutral" />}
            </div>
          )}

          {/* Title */}
          <h3 className="m-0 line-clamp-2 text-[20px] font-bold leading-tight
                          tracking-[-0.01em] text-[var(--sea-ink)] sm:text-[24px]">
            {title}
          </h3>

          {/* Price */}
          {price && (
            <div>
              <p className="m-0 text-[28px] font-black leading-none tracking-tight
                             text-vio-forest sm:text-[34px]">
                {price}
              </p>
              {suffix && (
                <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">{suffix}</p>
              )}
            </div>
          )}

          {/* Area + Location */}
          {(area ?? location) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1
                             text-[14px] text-[var(--sea-ink-soft)]">
              {area && (
                <span className="flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {area}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1">
                  <PinIcon />
                  {location}
                </span>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="mt-1">
            <span className="inline-flex items-center gap-1.5 text-[14px]
                              font-semibold text-vio-forest
                              transition-opacity group-hover:opacity-70">
              Xem chi tiết
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
        </div>

      </div>
    </Link>
  )
}

// ── List variant ───────────────────────────────────────────────────────────────

function ListCard({
  id, slug, title, imageUrl,
  province, district, locationText,
  area, landType, legalStatus,
  price, priceType,
  isFeatured, isVerified, proLocked,
  showFavorite, className,
}: LandCardProps) {
  const location = getLocation(province, district, locationText)
  const suffix   = getPriceSuffix(priceType)

  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${slug}`}
      className={[
        'group flex overflow-hidden rounded-3xl',
        'bg-[var(--surface)]',
        'shadow-apple-soft border border-[var(--line)]',
        'no-underline',
        'transition-all duration-300',
        'hover:shadow-apple-hover hover:-translate-y-0.5',
        className ?? '',
      ].join(' ')}
    >
      {/* Image */}
      <div className="relative w-28 shrink-0 overflow-hidden bg-[var(--sand)] sm:w-36">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover
                       transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}
        {/* Overlay badges */}
        {isFeatured && (
          <div className="absolute left-2 top-2">
            <OverlayBadge label="Nổi bật" color="bg-vio-amber/90 text-white" />
          </div>
        )}
        {isVerified && (
          <div className="absolute bottom-2 left-2">
            <OverlayBadge label="Xác minh" color="bg-vio-primary/85 text-white" icon={<ShieldIcon />} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-3 pl-4 pr-4">

        {/* Tag row */}
        {(landType ?? legalStatus ?? proLocked) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {landType    && <InlinePill label={landType}    variant="green"   />}
            {legalStatus && <InlinePill label={legalStatus} variant="neutral" />}
            {proLocked   && (
              <InlinePill label="Pro" variant="neutral" />
            )}
          </div>
        )}

        {/* Title */}
        <p className="m-0 line-clamp-2 text-[14px] font-semibold leading-snug
                      text-[var(--sea-ink)] sm:text-[15px]">
          {title}
        </p>

        {/* Price */}
        {price && (
          <p className="m-0 text-[17px] font-bold leading-tight text-vio-forest sm:text-[18px]">
            {price}
            {suffix && (
              <span className="ml-1.5 text-[12px] font-normal text-[var(--muted)]">
                {suffix}
              </span>
            )}
          </p>
        )}

        {/* Area + Location */}
        {(area ?? location) && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] sm:text-[13px]">
            {area && <span>{area}</span>}
            {area && location && <span aria-hidden="true">·</span>}
            {location && (
              <span className="flex items-center gap-0.5 min-w-0 truncate">
                <PinIcon />
                <span className="truncate">{location}</span>
              </span>
            )}
          </div>
        )}

      </div>

      {/* Favorite — right edge */}
      {showFavorite && (
        <div className="flex shrink-0 items-center pr-4">
          <FavoriteButton listingId={id} />
        </div>
      )}
    </Link>
  )
}

// ── Compact variant ────────────────────────────────────────────────────────────

function CompactCard({
  id, slug, title, imageUrl,
  province, district, locationText,
  price, showFavorite, className,
}: LandCardProps) {
  const location = getLocation(province, district, locationText)

  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${slug}`}
      className={[
        'group flex min-h-[56px] items-center gap-3 rounded-2xl px-3 py-3',
        'bg-[var(--surface)] border border-[var(--line)]',
        'no-underline',
        'transition-colors hover:bg-[var(--sand)]',
        className ?? '',
      ].join(' ')}
    >
      {/* Thumbnail */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--sand)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[13px] font-semibold text-[var(--sea-ink)]">
          {title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
          {price && <span className="font-semibold text-vio-forest">{price}</span>}
          {price && location && <span aria-hidden="true">·</span>}
          {location && <span className="truncate">{location}</span>}
        </div>
      </div>

      {/* Favorite */}
      {showFavorite && (
        <div className="shrink-0">
          <FavoriteButton listingId={id} />
        </div>
      )}
    </Link>
  )
}

// ── LandCard — public dispatcher ───────────────────────────────────────────────

export function LandCard({ variant = 'standard', ...props }: LandCardProps) {
  switch (variant) {
    case 'featured': return <FeaturedCard  {...props} />
    case 'list':     return <ListCard      {...props} />
    case 'compact':  return <CompactCard   {...props} />
    default:         return <StandardCard  {...props} />
  }
}
