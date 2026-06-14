'use client'

import Link                               from 'next/link'
import { MapPin, Mountain, BadgeCheck }   from 'lucide-react'
import type { LandListing, LegalStatus }  from '@/types/land'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEGAL_LABELS: Record<LegalStatus, { label: string; className: string }> = {
  so_do:    { label: 'Sổ đỏ',    className: 'bg-green-50 text-green-700' },
  so_hong:  { label: 'Sổ hồng',  className: 'bg-rose-50 text-rose-600'  },
  giay_tay: { label: 'Giấy tay', className: 'bg-gray-100 text-gray-500' },
}

function formatArea(sqm: number | null): string | null {
  if (!sqm) return null
  if (sqm >= 10_000) {
    const ha = sqm / 10_000
    return `${Number.isInteger(ha) ? ha : ha.toFixed(1)} ha`
  }
  return `${sqm.toLocaleString('vi-VN')} m²`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LandListingCardProps extends LandListing {
  href?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LandListingCard({
  id,
  title,
  price,
  area_sqm,
  location_text,
  legal_status,
  image_url,
  is_featured,
  seller_verified,
  href,
}: LandListingCardProps) {
  const dest  = href ?? `/dat-nong-nghiep/chi-tiet/${id}`
  const area  = formatArea(area_sqm)
  const legal = legal_status ? LEGAL_LABELS[legal_status] : null

  return (
    <Link
      href={dest}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/70
                 bg-white no-underline shadow-sm
                 transition-all duration-200
                 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-900/8"
    >
      {/* ── 1. Image — always first in DOM ────────────────────────────────── */}
      <div className="relative w-full shrink-0 aspect-[4/3] overflow-hidden bg-gray-100 rounded-t-xl">

        {/* Fallback — absolutely fills container, shown when no photo */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
          aria-hidden="true"
        >
          <Mountain size={28} className="text-gray-300" strokeWidth={1.5} />
          <span className="text-[11px] font-medium tracking-wide text-gray-300">
            Chưa có ảnh
          </span>
        </div>

        {/* Photo — overlays fallback; hides on broken src */}
        {image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_url}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover
                       transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}

        {/* TOP badge */}
        {is_featured && (
          <span
            className="absolute left-2 top-2 rounded-full
                       bg-gradient-to-r from-amber-400 to-orange-500
                       px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide
                       text-white shadow-md"
          >
            Top
          </span>
        )}
      </div>

      {/* ── 2. Content — always second ────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 p-3">

        {/* Price · Area */}
        <div className="flex items-baseline justify-between gap-1">
          <p className="m-0 text-lg font-bold leading-none text-green-700">
            {price ?? 'Thỏa thuận'}
          </p>
          {area && (
            <span className="shrink-0 text-sm font-semibold text-gray-700">
              {area}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="m-0 line-clamp-2 text-sm font-medium leading-snug text-gray-900">
          {title}
        </h3>

        {/* Location */}
        {location_text && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={10} strokeWidth={2} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{location_text}</span>
          </div>
        )}

        {/* Legal pill · Verified checkmark */}
        <div className="flex items-center justify-between gap-1">
          {legal ? (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${legal.className}`}>
              {legal.label}
            </span>
          ) : (
            <span />
          )}
          {seller_verified && (
            <BadgeCheck
              size={14}
              className="shrink-0 text-blue-500"
              aria-label="Người bán đã xác thực"
            />
          )}
        </div>

      </div>
    </Link>
  )
}
