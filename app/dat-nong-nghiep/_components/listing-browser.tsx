'use client'

import { useState } from 'react'
import { LandListingCard, type LandListingCardProps } from '@/components/land-listing-card'

// ListingEntry extends the card props with server-side filter metadata
export type ListingEntry = LandListingCardProps & {
  _province_slug: string   // e.g. 'dong-nai' — for province filter
  _land_type:     string   // e.g. 'cay_lau_nam' — for type filter
  _price_ty:      number   // price in tỷ (0 = unknown) — for price range filter
}

// ── Filter pills ────────────────────────────────────────────────────────────

const PILLS = [
  { id: 'all',      label: 'Tất cả' },
  { id: 'under1b',  label: 'Dưới 1 Tỷ' },
  { id: '1b-3b',    label: '1 – 3 Tỷ' },
  { id: 'dong-nai', label: 'Đồng Nai' },
  { id: 'lam-dong', label: 'Lâm Đồng' },
  { id: 'dak-lak',  label: 'Đắk Lắk' },
  { id: 'gia-lai',  label: 'Gia Lai' },
] as const

type PillId = typeof PILLS[number]['id']

function applyFilter(items: ListingEntry[], active: PillId): ListingEntry[] {
  switch (active) {
    case 'under1b':  return items.filter(i => i._price_ty > 0 && i._price_ty < 1)
    case '1b-3b':    return items.filter(i => i._price_ty >= 1 && i._price_ty <= 3)
    case 'dong-nai': return items.filter(i => i._province_slug === 'dong-nai')
    case 'lam-dong': return items.filter(i => i._province_slug === 'lam-dong')
    case 'dak-lak':  return items.filter(i => i._province_slug === 'dak-lak')
    case 'gia-lai':  return items.filter(i => i._province_slug === 'gia-lai')
    default:         return items
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function ListingBrowser({ listings }: { listings: ListingEntry[] }) {
  const [active, setActive] = useState<PillId>('all')
  const filtered = applyFilter(listings, active)

  return (
    <>
      {/* Horizontal filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {PILLS.map(pill => (
          <button
            key={pill.id}
            type="button"
            onClick={() => setActive(pill.id)}
            className={`shrink-0 px-4 h-9 rounded-full text-sm font-medium border transition-colors duration-150 cursor-pointer ${
              active === pill.id
                ? 'bg-black dark:bg-white text-white dark:text-gray-900 border-transparent'
                : 'bg-white dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/[0.1] hover:border-gray-400 dark:hover:border-white/[0.25]'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(({ _province_slug, _land_type, _price_ty, ...card }) => (
            <LandListingCard key={card.slug} {...card} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl opacity-20 mb-5 select-none" aria-hidden="true">🌾</span>
          <p className="text-gray-500 dark:text-gray-400 text-[0.9375rem]">
            Không có tin đăng phù hợp.
          </p>
          <button
            type="button"
            onClick={() => setActive('all')}
            className="mt-4 px-4 py-2 rounded-full text-sm font-medium text-[#0071E3] dark:text-[#409CFF] hover:opacity-75 transition-opacity cursor-pointer"
          >
            Xem tất cả
          </button>
        </div>
      )}
    </>
  )
}
