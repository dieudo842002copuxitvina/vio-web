'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link                                           from 'next/link'
import Image                                          from 'next/image'
import { useRouter, usePathname, useSearchParams }    from 'next/navigation'
import type { LandListingHit }                        from '@/features/search/api/land-search.server'
import type { ProvinceOption }                        from '@/features/search/api/land-search.server'
import { MapCanvas }                                  from './MapCanvas'

// ── Filter types ──────────────────────────────────────────────────────────────

export interface MapFilters {
  province:  string   // province slug
  priceMin:  string
  priceMax:  string
  areaMin:   string
  areaMax:   string
  landType:  string
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
      <path d="M9 4v13M15 7v13" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

const PRICE_OPTIONS = [
  { label: 'Tất cả',     value: '' },
  { label: '< 500 tr',   value: '500000000' },
  { label: '< 1 tỷ',     value: '1000000000' },
  { label: '< 2 tỷ',     value: '2000000000' },
  { label: '< 5 tỷ',     value: '5000000000' },
]

const AREA_OPTIONS = [
  { label: 'Tất cả',    value: '' },
  { label: '< 500 m²',  value: '500' },
  { label: '< 1.000 m²', value: '1000' },
  { label: '< 5.000 m²', value: '5000' },
  { label: '< 1 ha',    value: '10000' },
]

const LAND_TYPE_OPTIONS = [
  { label: 'Tất cả loại',    value: '' },
  { label: 'Đất lúa',         value: 'dat_lua' },
  { label: 'Đất trồng cây',   value: 'dat_trong_cay' },
  { label: 'Đất trang trại',  value: 'dat_trang_trai' },
  { label: 'Đất rừng',        value: 'dat_rung' },
]

interface FilterBarProps {
  filters:   MapFilters
  provinces: ProvinceOption[]
  total:     number
  onChange:  (next: Partial<MapFilters>) => void
}

function FilterBar({ filters, provinces, total, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">

      {/* Province select */}
      <div className="relative shrink-0">
        <select
          value={filters.province}
          onChange={e => onChange({ province: e.target.value })}
          className="h-8 appearance-none rounded-xl border border-neutral-200 bg-white
                     pl-3 pr-7 text-[13px] font-medium text-[#1d1d1f] outline-none
                     cursor-pointer hover:border-vio-forest focus:border-vio-forest"
          aria-label="Tỉnh/thành"
        >
          <option value="">Tất cả tỉnh</option>
          {provinces.map(p => (
            <option key={p.id} value={p.slug}>{p.name}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-neutral-400">
          <ChevronDown/>
        </span>
      </div>

      {/* Price max */}
      <div className="relative shrink-0">
        <select
          value={filters.priceMax}
          onChange={e => onChange({ priceMax: e.target.value })}
          className="h-8 appearance-none rounded-xl border border-neutral-200 bg-white
                     pl-3 pr-7 text-[13px] font-medium text-[#1d1d1f] outline-none
                     cursor-pointer hover:border-vio-forest focus:border-vio-forest"
          aria-label="Giá"
        >
          {PRICE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-neutral-400">
          <ChevronDown/>
        </span>
      </div>

      {/* Area max */}
      <div className="relative shrink-0">
        <select
          value={filters.areaMax}
          onChange={e => onChange({ areaMax: e.target.value })}
          className="h-8 appearance-none rounded-xl border border-neutral-200 bg-white
                     pl-3 pr-7 text-[13px] font-medium text-[#1d1d1f] outline-none
                     cursor-pointer hover:border-vio-forest focus:border-vio-forest"
          aria-label="Diện tích"
        >
          {AREA_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-neutral-400">
          <ChevronDown/>
        </span>
      </div>

      {/* Land type */}
      <div className="relative shrink-0">
        <select
          value={filters.landType}
          onChange={e => onChange({ landType: e.target.value })}
          className="h-8 appearance-none rounded-xl border border-neutral-200 bg-white
                     pl-3 pr-7 text-[13px] font-medium text-[#1d1d1f] outline-none
                     cursor-pointer hover:border-vio-forest focus:border-vio-forest"
          aria-label="Loại đất"
        >
          {LAND_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-neutral-400">
          <ChevronDown/>
        </span>
      </div>

      {/* Result count */}
      <span className="ml-1 shrink-0 text-[12px] text-neutral-400">
        {total.toLocaleString('vi-VN')} kết quả
      </span>
    </div>
  )
}

// ── ListingCard (in list panel) ───────────────────────────────────────────────

interface ListingCardProps {
  listing:   LandListingHit
  isHovered: boolean
  onHover:   (id: string | null) => void
}

function ListingCard({ listing, isHovered, onHover }: ListingCardProps) {
  return (
    <Link
      href={`/dat/${listing.slug}`}
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      className={[
        'group flex gap-3 rounded-2xl p-2.5 no-underline transition-colors duration-100',
        isHovered ? 'bg-[#F0F7F1]' : 'hover:bg-neutral-50',
      ].join(' ')}
    >
      {/* Thumbnail */}
      <div className="relative h-[76px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {listing.cover_url ? (
          <Image
            src={listing.cover_url}
            alt={listing.title}
            fill
            sizes="100px"
            className="object-cover transition-transform duration-300 group-hover:-translate-y-px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 15l5-5 4 4 3-3 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {listing.is_featured && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-[#FF9500] px-1.5 py-0.5
                            text-[9px] font-bold uppercase tracking-wide text-white">Nổi bật</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="m-0 line-clamp-2 text-[13px] font-semibold leading-snug text-[#1d1d1f]">
          {listing.title}
        </p>
        {listing.location_text && (
          <p className="m-0 mt-0.5 truncate text-[11.5px] text-neutral-400">
            {listing.location_text}
          </p>
        )}
        {listing.price_text && (
          <p className="m-0 mt-1.5 text-[13.5px] font-bold text-vio-forest">
            {listing.price_text}
          </p>
        )}
      </div>
    </Link>
  )
}

// ── MapSearchPanel (main shell) ───────────────────────────────────────────────

export interface MapSearchPanelProps {
  initialListings: LandListingHit[]
  provinces:       ProvinceOption[]
  initialFilters:  MapFilters
  total:           number
}

export function MapSearchPanel({
  initialListings,
  provinces,
  initialFilters,
  total,
}: MapSearchPanelProps) {
  const router         = useRouter()
  const pathname       = usePathname()
  const searchParams   = useSearchParams()

  const [filters,   setFilters]   = useState<MapFilters>(initialFilters)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  // Mobile: 'map' | 'list'
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map')
  // Mobile bottom drawer expansion
  const [drawerOpen, setDrawerOpen] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)

  // ── Active province id for map ─────────────────────────────────────────────
  const activeProvince    = provinces.find(p => p.slug === filters.province)
  const activeProvinceId  = activeProvince?.id ?? null

  // ── Filter change → URL update (triggers RSC re-render) ───────────────────
  const applyFilters = useCallback((next: Partial<MapFilters>) => {
    const merged = { ...filters, ...next }
    setFilters(merged)
    const params = new URLSearchParams(searchParams.toString())
    if (merged.province)  params.set('province', merged.province)  ; else params.delete('province')
    if (merged.priceMax)  params.set('priceMax', merged.priceMax)  ; else params.delete('priceMax')
    if (merged.areaMax)   params.set('areaMax', merged.areaMax)    ; else params.delete('areaMax')
    if (merged.landType)  params.set('landType', merged.landType)  ; else params.delete('landType')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [filters, pathname, router, searchParams])

  // ── Province select from map cluster ──────────────────────────────────────
  const handleProvinceSelect = useCallback((id: number) => {
    const prov = provinces.find(p => p.id === id)
    if (prov) applyFilters({ province: prov.slug })
  }, [provinces, applyFilters])

  // ── Scroll to hovered card in list ────────────────────────────────────────
  useEffect(() => {
    if (!hoveredId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-listing-id="${hoveredId}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [hoveredId])

  const mapNode = (
    <MapCanvas
      listings={initialListings}
      hoveredId={hoveredId}
      onHover={setHoveredId}
      activeProvinceId={activeProvinceId}
      onProvinceSelect={handleProvinceSelect}
    />
  )

  return (
    <div className="flex h-full flex-col">

      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-neutral-100 bg-white px-4 py-2.5">
        <FilterBar
          filters={filters}
          provinces={provinces}
          total={total}
          onChange={applyFilters}
        />
      </div>

      {/* ── Desktop: side-by-side ─────────────────────────────────────────── */}
      <div className="hidden flex-1 overflow-hidden md:flex">

        {/* List panel */}
        <div
          ref={listRef}
          className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-r border-neutral-100"
        >
          {initialListings.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20 text-neutral-400">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="m-0 text-[14px]">Không tìm thấy kết quả</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 p-2">
              {initialListings.map(l => (
                <div key={l.id} data-listing-id={l.id}>
                  <ListingCard
                    listing={l}
                    isHovered={hoveredId === l.id}
                    onHover={setHoveredId}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 overflow-hidden">
          {mapNode}
        </div>
      </div>

      {/* ── Mobile: tabs + bottom drawer ──────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden md:hidden">

        {/* Fullscreen map */}
        <div className="absolute inset-0">
          {mapNode}
        </div>

        {/* Toggle tab pill (top-right of map) */}
        <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
          <div className="flex rounded-2xl border border-neutral-200 bg-white/95 p-1 shadow-lg backdrop-blur-xl">
            <button
              onClick={() => { setMobileTab('map'); setDrawerOpen(false) }}
              className={[
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors',
                mobileTab === 'map' ? 'bg-vio-forest text-white' : 'text-neutral-500',
              ].join(' ')}
            >
              <MapIcon/> Bản đồ
            </button>
            <button
              onClick={() => { setMobileTab('list'); setDrawerOpen(true) }}
              className={[
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors',
                mobileTab === 'list' ? 'bg-vio-forest text-white' : 'text-neutral-500',
              ].join(' ')}
            >
              <ListIcon/> Danh sách
            </button>
          </div>
        </div>

        {/* Bottom drawer */}
        <div
          className={[
            'absolute inset-x-0 bottom-0 z-30 flex flex-col',
            'rounded-t-3xl bg-white shadow-2xl',
            'transition-transform duration-300',
            drawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-56px)]',
          ].join(' ')}
          style={{ maxHeight: '70dvh' }}
        >
          {/* Handle */}
          <button
            onClick={() => setDrawerOpen(v => !v)}
            className="flex w-full shrink-0 flex-col items-center gap-1.5 py-3"
            aria-label={drawerOpen ? 'Thu gọn' : 'Mở rộng danh sách'}
          >
            <span className="h-1 w-10 rounded-full bg-neutral-200"/>
            <span className="text-[12px] font-semibold text-neutral-500">
              {total.toLocaleString('vi-VN')} kết quả
            </span>
          </button>

          {/* List content */}
          <div className="flex-1 overflow-y-auto">
            {initialListings.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-neutral-400">Không có kết quả</p>
            ) : (
              <div className="flex flex-col gap-0.5 px-2 pb-8">
                {initialListings.map(l => (
                  <div key={l.id} data-listing-id={l.id}>
                    <ListingCard
                      listing={l}
                      isHovered={hoveredId === l.id}
                      onHover={setHoveredId}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
