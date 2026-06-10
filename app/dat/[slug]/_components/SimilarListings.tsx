import Link from 'next/link'
import type { Listing } from '@/entities/listing/model/types'

// ── Card ──────────────────────────────────────────────────────────────────────

function SimilarCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/dat/${listing.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white
                 shadow-[0_1px_3px_rgba(0,0,0,0.05)] no-underline
                 transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]
                 hover:-translate-y-px"
    >
      {/* Thumbnail */}
      <div className="relative h-[130px] overflow-hidden bg-neutral-100">
        {listing.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_url}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none" className="text-neutral-300">
              <rect x="4" y="8" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 30l10-10 8 8 7-7 15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {listing.is_featured && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-vio-amber px-2 py-0.5
                           text-[10px] font-bold uppercase tracking-wide text-white">
            Nổi bật
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {listing.price_text ? (
          <p className="m-0 text-[15px] font-black leading-none tracking-tight text-[#1d1d1f]">
            {listing.price_text}
          </p>
        ) : (
          <p className="m-0 text-[13px] font-semibold text-neutral-400">Thương lượng</p>
        )}

        <p className="m-0 line-clamp-2 text-[13px] font-semibold leading-snug text-[#1d1d1f]">
          {listing.title}
        </p>

        {listing.location_text && (
          <div className="mt-auto flex items-center gap-1.5 pt-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-neutral-300">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            <p className="m-0 truncate text-[11px] text-neutral-400">{listing.location_text}</p>
          </div>
        )}
      </div>
    </Link>
  )
}

// ── SimilarListings ───────────────────────────────────────────────────────────

interface SimilarListingsProps {
  listings: Listing[]
}

export function SimilarListings({ listings }: SimilarListingsProps) {
  if (listings.length === 0) return null

  return (
    <section aria-labelledby="similar-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="similar-heading"
          className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
        >
          Tin tương tự
        </h2>
        <Link
          href="/tim-kiem"
          className="text-[13px] font-semibold text-vio-forest no-underline
                     transition-colors hover:text-vio-forest/70"
        >
          Xem tất cả
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {listings.slice(0, 6).map(l => (
          <SimilarCard key={l.id} listing={l}/>
        ))}
      </div>
    </section>
  )
}
