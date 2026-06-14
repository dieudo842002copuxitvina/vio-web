'use client'

import Link from 'next/link'
import { MapPin, ImageIcon } from 'lucide-react'

// ── Data shape returned from page.tsx ─────────────────────────────────────────

export interface CategoryListing {
  id:            string
  slug:          string
  title:         string
  price_text:    string | null
  cover_url:     string | null
  location_text: string | null
  is_featured:   boolean
  is_verified:   boolean
  type:          string
}

// ── URL mapping ───────────────────────────────────────────────────────────────

const TYPE_BASE: Record<string, string> = {
  land:       '/dat-nong-nghiep/chi-tiet',
  product:    '/san-pham',
  service:    '/dich-vu',
  restaurant: '/nha-hang',
  tourism:    '/du-lich',
  rental:     '/cho-thue',
  event:      '/su-kien',
}

// ── CategoryListingCard ───────────────────────────────────────────────────────

export function CategoryListingCard({ listing }: { listing: CategoryListing }) {
  const base = TYPE_BASE[listing.type] ?? '/tim-kiem'
  const href = `${base}/${listing.slug}`

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-gray-200/60 bg-white
                 no-underline shadow-sm transition-all duration-300
                 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* ── Image / Fallback ─────────────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl border-b border-gray-100">

        {/* Gradient fallback — always in DOM, visible when image is absent or breaks */}
        <div
          className="flex h-full w-full items-center justify-center
                     bg-gradient-to-br from-gray-50 to-gray-100"
          aria-hidden="true"
        >
          <ImageIcon size={36} className="text-gray-300" strokeWidth={1} />
        </div>

        {/* Image — absolute on top; onError hides it, revealing the gradient fallback */}
        {listing.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_url}
            alt={listing.title}
            className="absolute inset-0 h-full w-full object-cover
                       transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}

        {/* Featured badge */}
        {listing.is_featured && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-amber-400 px-2.5 py-1
                           text-[0.5625rem] font-bold uppercase tracking-wide text-white shadow-sm">
            Nổi bật
          </span>
        )}

        {/* Verified badge */}
        {listing.is_verified && (
          <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center
                           rounded-full bg-green-500 text-[0.625rem] font-bold text-white shadow-sm">
            ✓
          </span>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="p-4">

        {/* Price */}
        {listing.price_text ? (
          <p className="m-0 text-xl font-bold tracking-tight text-green-700">
            {listing.price_text}
          </p>
        ) : (
          <p className="m-0 text-sm font-semibold text-gray-400">Liên hệ</p>
        )}

        {/* Title */}
        <h3 className="m-0 mt-1 line-clamp-2 text-base font-semibold leading-snug text-gray-900">
          {listing.title}
        </h3>

        {/* Location */}
        {listing.location_text && (
          <div className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-3 text-sm text-gray-500">
            <MapPin size={12} strokeWidth={2} className="shrink-0 text-gray-400" aria-hidden="true" />
            <span className="truncate">{listing.location_text}</span>
          </div>
        )}

      </div>
    </Link>
  )
}
