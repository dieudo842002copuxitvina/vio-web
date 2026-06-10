'use client'

import Link    from 'next/link'
import { MapPin, Leaf, Clock } from 'lucide-react'
import { LISTING_TYPE_ROUTES } from '@/entities/listing/model/types'
import type { ListingType }    from '@/entities/listing/model/types'

// ── Props ─────────────────────────────────────────────────────────────────────
// Matches the HomepageListing shape from features/search/api/get-listings.ts.
// cover_url is the correct DB column — there is no image_url column.

export interface ListingCardProps {
  id:            string
  slug:          string
  type:          ListingType | string
  title:         string
  cover_url:     string | null
  price_text:    string | null
  location_text: string | null
  is_featured:   boolean
  is_verified:   boolean
  created_at:    string
}

// ── timeAgo ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs   = Date.now() - new Date(iso).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 60)  return `${diffMins} phút trước`
  const diffHrs  = Math.floor(diffMins / 60)
  if (diffHrs  < 24)  return `${diffHrs} giờ trước`
  const diffDays = Math.floor(diffHrs  / 24)
  if (diffDays < 30)  return `${diffDays} ngày trước`
  return `${Math.floor(diffDays / 30)} tháng trước`
}

// ── ListingCard ───────────────────────────────────────────────────────────────

export function ListingCard({
  slug,
  type,
  title,
  cover_url,
  price_text,
  location_text,
  is_featured,
  created_at,
}: ListingCardProps) {
  const base = LISTING_TYPE_ROUTES[type as ListingType] ?? '/dat-nong-nghiep/chi-tiet'
  const href = `${base}/${slug}`

  return (
    <Link
      href={href}
      className="group flex flex-col bg-white rounded-xl border border-gray-200
                 no-underline shadow-sm
                 hover:shadow-md hover:-translate-y-0.5
                 transition-all duration-200 cursor-pointer"
    >
      {/* ── Image wrapper ──────────────────────────────────────────────────────
          Fallback is always in DOM (bg-gray-100 + Leaf icon).
          The <img> sits absolute on top and hides itself via onError.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="aspect-[4/3] w-full relative overflow-hidden bg-gray-100 rounded-t-xl">

        {/* Fallback: fills parent through normal flow */}
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2"
          aria-hidden="true"
        >
          <Leaf size={28} className="text-gray-300" strokeWidth={1.5} />
          <span className="text-[11px] font-medium tracking-wide text-gray-300">
            Chưa có ảnh
          </span>
        </div>

        {/* Image: absolute on top — onError reveals fallback below */}
        {cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover_url}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover
                       transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}

        {/* Featured badge */}
        {is_featured && (
          <span
            className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5
                       text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
          >
            Nổi bật
          </span>
        )}

      </div>

      {/* ── Info area ─────────────────────────────────────────────────────────── */}
      <div className="p-3 flex flex-col gap-1">

        {/* Price — 'Thỏa thuận' when null */}
        <p className="m-0 text-lg font-bold text-green-700 leading-none">
          {price_text ?? 'Thỏa thuận'}
        </p>

        {/* Title */}
        <h3 className="m-0 text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {title}
        </h3>

        {/* Meta: location · time */}
        <div className="flex items-center gap-1 text-xs text-gray-500 line-clamp-1">
          {location_text && (
            <>
              <MapPin size={10} strokeWidth={2} className="shrink-0 text-gray-400" aria-hidden="true" />
              <span className="truncate">{location_text}</span>
              <span className="shrink-0 text-gray-300 mx-0.5" aria-hidden="true">·</span>
            </>
          )}
          <Clock size={10} strokeWidth={2} className="shrink-0 text-gray-400" aria-hidden="true" />
          <span className="shrink-0 whitespace-nowrap">{timeAgo(created_at)}</span>
        </div>

      </div>
    </Link>
  )
}
