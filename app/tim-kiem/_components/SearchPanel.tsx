'use client'

import { useState } from 'react'
import dynamic      from 'next/dynamic'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { LandSearchCard }                          from './LandSearchCard'
import { FilterPanel }                             from './FilterPanel'
import { SaveSearchButton }                        from './SaveSearchButton'
import type { LandBrowseResult, ProvinceOption } from '@/features/search/api/land-search.server'

// LeafletMap loaded only in the browser (Leaflet requires window)
const LeafletMap = dynamic(
  () => import('./LeafletMap').then(m => m.LeafletMap),
  {
    ssr:     false,
    loading: () => <div className="h-full w-full animate-pulse bg-neutral-100" />,
  },
)

// ── Sort bar ──────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Mới nhất'    },
  { value: 'price_asc',  label: 'Giá thấp'   },
  { value: 'price_desc', label: 'Giá cao'     },
] as const

function SortBar({
  total,
  currentSort,
  provinces,
}: {
  total:       number
  currentSort: string
  provinces:   ProvinceOption[]
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  function handleSort(val: string) {
    const next = new URLSearchParams(params.toString())
    next.set('sort', val)
    next.delete('page')
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <p className="m-0 text-[13px] text-neutral-500">
        <span className="font-semibold text-[#1d1d1f]">{total.toLocaleString('vi-VN')}</span> kết quả
      </p>
      <div className="flex items-center gap-1">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSort(opt.value)}
            className={[
              'rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-100',
              currentSort === opt.value
                ? 'bg-[#1d1d1f] text-white'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-[#1d1d1f]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-neutral-200" aria-hidden="true" />
        <SaveSearchButton provinces={provinces} />
      </div>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  if (totalPages <= 1) return null

  function goTo(p: number) {
    const next = new URLSearchParams(params.toString())
    next.set('page', String(p))
    router.push(`${pathname}?${next.toString()}`)
  }

  const pages: number[] = []
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      {page > 1 && (
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white
                     text-[0.8125rem] text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
        >
          ‹
        </button>
      )}
      {pages.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => goTo(p)}
          className={[
            'flex h-9 w-9 items-center justify-center rounded-xl text-[0.8125rem] font-medium',
            'transition-colors duration-100',
            p === page
              ? 'bg-[#1d1d1f] text-white'
              : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50',
          ].join(' ')}
        >
          {p}
        </button>
      ))}
      {page < totalPages && (
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white
                     text-[0.8125rem] text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
        >
          ›
        </button>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7.5" stroke="#86868b" strokeWidth="1.75"/>
          <path d="M17 17l4 4" stroke="#86868b" strokeWidth="1.75" strokeLinecap="round"/>
          <path d="M8 11h6M11 8v6" stroke="#86868b" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="m-0 text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
        Không tìm thấy kết quả
      </p>
      <p className="m-0 mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-neutral-400">
        Thử bỏ bớt bộ lọc hoặc tìm kiếm với từ khoá khác
      </p>
    </div>
  )
}

// ── SearchPanel ───────────────────────────────────────────────────────────────

interface SearchPanelProps {
  result:      LandBrowseResult
  provinces:   ProvinceOption[]
  currentSort: string
}

export function SearchPanel({ result, provinces, currentSort }: SearchPanelProps) {
  const [hoveredId,     setHoveredId]     = useState<string | null>(null)
  const [filterOpen,    setFilterOpen]    = useState(false)
  const [mapOpen,       setMapOpen]       = useState(false)

  const { listings, total, page, totalPages } = result

  const mapListings = listings.map(l => ({
    id:          l.id,
    province_id: l.province_id,
    title:       l.title,
    price_text:  l.price_text,
    slug:        l.slug,
  }))

  return (
    <>
      {/* ── Desktop 3-column layout ──────────────────────────── */}
      <div className="flex min-h-0 flex-1 items-start">

        {/* LEFT: Filter sidebar (desktop only) */}
        <aside
          className="hidden lg:block w-[280px] shrink-0 sticky top-[57px] max-h-[calc(100vh-57px)] overflow-y-auto
                     border-r border-neutral-100 bg-white"
          aria-label="Bộ lọc tìm kiếm"
        >
          <div className="px-5 py-6">
            <p className="mb-5 text-[15px] font-bold text-[#1d1d1f]">Bộ lọc</p>
            <FilterPanel provinces={provinces} />
          </div>
        </aside>

        {/* CENTER: Results */}
        <main
          className="flex-1 min-w-0 overflow-y-auto"
          role="region"
          aria-label="Kết quả tìm kiếm"
          aria-live="polite"
        >
          <div className="px-4 pb-24 sm:px-5 lg:pb-6">
            <SortBar total={total} currentSort={currentSort} provinces={provinces} />

            {listings.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="flex flex-col gap-2.5">
                  {listings.map(l => (
                    <LandSearchCard
                      key={l.id}
                      listing={l}
                      isHovered={hoveredId === l.id}
                      onHover={setHoveredId}
                    />
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} />
              </>
            )}
          </div>
        </main>

        {/* RIGHT: Map (desktop only) */}
        <div
          className="hidden xl:block w-[420px] shrink-0 sticky top-[57px] h-[calc(100vh-57px)]
                     border-l border-neutral-100"
          aria-label="Bản đồ"
        >
          <LeafletMap listings={mapListings} hoveredId={hoveredId} />
        </div>
      </div>

      {/* ── Mobile sticky bottom bar ─────────────────────────── */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex h-14 items-center
                   justify-center gap-3 border-t border-neutral-100 bg-white/95 backdrop-blur-md
                   pb-[env(safe-area-inset-bottom)]"
      >
        <button
          type="button"
          onClick={() => { setFilterOpen(true); setMapOpen(false) }}
          className="flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white
                     px-5 text-[0.875rem] font-semibold text-[#1d1d1f] shadow-sm
                     transition-colors hover:bg-neutral-50"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          Bộ lọc
        </button>
        <button
          type="button"
          onClick={() => { setMapOpen(true); setFilterOpen(false) }}
          className="flex h-10 items-center gap-2 rounded-full bg-[#1d1d1f] px-5
                     text-[0.875rem] font-semibold text-white shadow-sm
                     transition-opacity hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1 2.5l4 2 5-3 5 3v9l-5-2.5-5 3L1 11.5V2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          Bản đồ
        </button>
      </div>

      {/* ── Mobile filter bottom sheet ────────────────────────── */}
      {filterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setFilterOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl bg-white"
            role="dialog"
            aria-modal="true"
            aria-label="Bộ lọc tìm kiếm"
          >
            {/* Handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-neutral-200" />
            </div>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-3">
              <p className="text-[15px] font-bold text-[#1d1d1f]">Bộ lọc</p>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100
                           text-neutral-500 transition-colors hover:bg-neutral-200"
                aria-label="Đóng"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <FilterPanel provinces={provinces} onApply={() => setFilterOpen(false)} />
            </div>
            <div className="h-[env(safe-area-inset-bottom,16px)]" />
          </div>
        </div>
      )}

      {/* ── Mobile fullscreen map ─────────────────────────────── */}
      {mapOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0">
            <LeafletMap listings={mapListings} hoveredId={hoveredId} />
          </div>
          <button
            type="button"
            onClick={() => setMapOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center
                       rounded-full bg-white shadow-lg transition-opacity hover:opacity-90"
            aria-label="Đóng bản đồ"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
