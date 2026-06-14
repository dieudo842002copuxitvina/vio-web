import Link from 'next/link'
import type { LandListingHit } from '@/features/search/api/land-search.server'

interface LandSearchCardProps {
  listing:   LandListingHit
  isHovered: boolean
  onHover:   (id: string | null) => void
}

export function LandSearchCard({ listing, isHovered, onHover }: LandSearchCardProps) {
  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${listing.slug}`}
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      className={[
        'group flex gap-3 rounded-2xl border bg-white p-3 no-underline',
        'transition-all duration-150',
        isHovered
          ? 'border-vio-forest/30 shadow-[0_4px_20px_rgba(0,0,0,0.09)]'
          : 'border-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-neutral-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]',
        'hover:-translate-y-px',
      ].join(' ')}
    >
      {/* ── Thumbnail ───────────────────────────────────────────── */}
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:h-[100px] sm:w-[130px]">
        {listing.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_url}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-neutral-300">
              <path d="M4 28V14L16 5l12 9v14H20v-8h-8v8H4Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {listing.is_featured && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-vio-amber/90 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
            Nổi bật
          </span>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          {/* Price */}
          {listing.price_text && (
            <p className="m-0 text-[15px] font-bold leading-tight text-vio-forest">
              {listing.price_text}
            </p>
          )}

          {/* Title */}
          <p className="m-0 mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug text-[#1d1d1f]">
            {listing.title}
          </p>
        </div>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {listing.location_text && (
            <span className="flex items-center gap-1 text-[11px] text-neutral-400">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              {listing.location_text}
            </span>
          )}
          {listing.is_verified && (
            <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
              </svg>
              Xác thực
            </span>
          )}
        </div>

        {/* Contact */}
        {listing.contact_phone && (
          <div className="mt-2 flex items-center gap-2">
            <span
              onClick={e => { e.preventDefault(); window.location.href = `tel:${listing.contact_phone}` }}
              className="inline-flex h-7 cursor-pointer items-center rounded-full border border-vio-forest/20
                         bg-vio-forest/5 px-3 text-[11px] font-semibold text-vio-forest
                         transition-colors hover:bg-vio-forest/10"
            >
              Liên hệ
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
