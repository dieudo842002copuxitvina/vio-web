'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { LAND_TYPE_LABELS } from '@/entities/listing'
import type { ProvinceOption } from '@/features/search/api/land-search.server'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FilterValues {
  giao_dich:   'mua' | 'thue' | ''
  tinh:        string   // province slug
  loai:        string[] // land type keys
  gia_min:     string   // tỷ
  gia_max:     string   // tỷ
  dien_tich_min: string // m²
  dien_tich_max: string // m²
  phap_ly:     string   // 'so_do' | 'so_hong' | 'dang_lam' | ''
  xac_minh:    boolean
  duong_o_to:  boolean
  nguon_nuoc:  boolean
  dien:        boolean
}

const EMPTY: FilterValues = {
  giao_dich:     '',
  tinh:          '',
  loai:          [],
  gia_min:       '',
  gia_max:       '',
  dien_tich_min: '',
  dien_tich_max: '',
  phap_ly:       '',
  xac_minh:      false,
  duong_o_to:    false,
  nguon_nuoc:    false,
  dien:          false,
}

// ── Read filters from URL ──────────────────────────────────────────────────────

function fromSearchParams(sp: URLSearchParams): FilterValues {
  const loai = sp.get('loai')
  return {
    giao_dich:     (sp.get('giao_dich') ?? '') as FilterValues['giao_dich'],
    tinh:          sp.get('tinh')       ?? '',
    loai:          loai ? loai.split(',').filter(Boolean) : [],
    gia_min:       sp.get('gia_min')    ?? '',
    gia_max:       sp.get('gia_max')    ?? '',
    dien_tich_min: sp.get('dien_tich_min') ?? '',
    dien_tich_max: sp.get('dien_tich_max') ?? '',
    phap_ly:       sp.get('phap_ly')    ?? '',
    xac_minh:      sp.get('xac_minh')  === '1',
    duong_o_to:    sp.get('duong_o_to') === '1',
    nguon_nuoc:    sp.get('nguon_nuoc') === '1',
    dien:          sp.get('dien')       === '1',
  }
}

// ── Write filters to URLSearchParams ──────────────────────────────────────────

function toSearchParams(f: FilterValues): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.giao_dich)       sp.set('giao_dich',     f.giao_dich)
  if (f.tinh)            sp.set('tinh',           f.tinh)
  if (f.loai.length)     sp.set('loai',           f.loai.join(','))
  if (f.gia_min)         sp.set('gia_min',        f.gia_min)
  if (f.gia_max)         sp.set('gia_max',        f.gia_max)
  if (f.dien_tich_min)   sp.set('dien_tich_min',  f.dien_tich_min)
  if (f.dien_tich_max)   sp.set('dien_tich_max',  f.dien_tich_max)
  if (f.phap_ly)         sp.set('phap_ly',        f.phap_ly)
  if (f.xac_minh)        sp.set('xac_minh',       '1')
  if (f.duong_o_to)      sp.set('duong_o_to',     '1')
  if (f.nguon_nuoc)      sp.set('nguon_nuoc',     '1')
  if (f.dien)            sp.set('dien',           '1')
  return sp
}

function hasActiveFilters(f: FilterValues): boolean {
  return (
    !!f.giao_dich || !!f.tinh || f.loai.length > 0 ||
    !!f.gia_min || !!f.gia_max || !!f.dien_tich_min || !!f.dien_tich_max ||
    !!f.phap_ly || f.xac_minh || f.duong_o_to || f.nguon_nuoc || f.dien
  )
}

// ── Small UI primitives ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#86868b]">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="my-5 h-px bg-[rgba(60,60,67,0.1)]" />
}

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-[14px] text-[#1d1d1f]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-[28px] w-[50px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4D2E] ${
          checked ? 'bg-[#1A4D2E]' : 'bg-[rgba(120,120,128,0.32)]'
        }`}
      >
        <span
          className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </label>
  )
}

function Checkbox({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <div
        onClick={() => onChange(!checked)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 cursor-pointer ${
          checked
            ? 'border-[#1A4D2E] bg-[#1A4D2E]'
            : 'border-[rgba(60,60,67,0.25)] bg-white'
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className="text-[14px] text-[#1d1d1f]">{label}</span>
    </label>
  )
}

// ── FilterSidebar ──────────────────────────────────────────────────────────────

interface FilterSidebarProps {
  provinces:  ProvinceOption[]
  className?: string
}

export function FilterSidebar({ provinces, className = '' }: FilterSidebarProps) {
  const router     = useRouter()
  const pathname   = usePathname()
  const searchParams = useSearchParams()
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [filters, setFilters] = useState<FilterValues>(() =>
    fromSearchParams(searchParams),
  )

  // Sync to URL with 300ms debounce
  const push = useCallback((next: FilterValues) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const sp = toSearchParams(next).toString()
      router.push(`${pathname}${sp ? `?${sp}` : ''}`, { scroll: false })
    }, 300)
  }, [router, pathname])

  // Re-sync local state when browser back/forward changes URL.
  // Calling setState in an effect is the correct pattern here — we are
  // synchronising from an external system (the URL) into React state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(fromSearchParams(searchParams))
  }, [searchParams])

  function update<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    const next = { ...filters, [key]: value }
    setFilters(next)
    push(next)
  }

  function toggleLandType(key: string) {
    const next = filters.loai.includes(key)
      ? filters.loai.filter(k => k !== key)
      : [...filters.loai, key]
    update('loai', next)
  }

  function reset() {
    setFilters(EMPTY)
    if (timerRef.current) clearTimeout(timerRef.current)
    router.push(pathname, { scroll: false })
  }

  const active = hasActiveFilters(filters)

  return (
    <aside className={`${className}`}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <span className="text-[17px] font-bold text-[#1d1d1f]">Bộ lọc</span>
        {active && (
          <button
            type="button"
            onClick={reset}
            className="text-[13px] font-semibold text-[#1A4D2E] hover:underline"
          >
            Xoá tất cả
          </button>
        )}
      </div>

      {/* ── Transaction Type ─────────────────────────────── */}
      <SectionLabel>Loại giao dịch</SectionLabel>
      <div className="flex gap-2">
        {[
          { id: '',     label: 'Tất cả' },
          { id: 'mua',  label: 'Mua'    },
          { id: 'thue', label: 'Cho thuê' },
        ].map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => update('giao_dich', opt.id as FilterValues['giao_dich'])}
            className={`h-8 rounded-full px-4 text-[13px] font-medium border transition-colors duration-150 ${
              filters.giao_dich === opt.id
                ? 'bg-[#1A4D2E] text-white border-transparent'
                : 'bg-white text-[#1d1d1f] border-[rgba(60,60,67,0.2)] hover:border-[#1A4D2E]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Divider />

      {/* ── Province ─────────────────────────────────────── */}
      <SectionLabel>Tỉnh thành</SectionLabel>
      <select
        value={filters.tinh}
        onChange={e => update('tinh', e.target.value)}
        className="w-full rounded-[10px] border border-[rgba(60,60,67,0.2)] bg-white px-3 py-2 text-[14px] text-[#1d1d1f] focus:border-[#1A4D2E] focus:outline-none"
      >
        <option value="">Tất cả tỉnh thành</option>
        {provinces.map(p => (
          <option key={p.id} value={p.slug}>{p.name}</option>
        ))}
      </select>

      <Divider />

      {/* ── Land Type ────────────────────────────────────── */}
      <SectionLabel>Loại đất</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(LAND_TYPE_LABELS) as [string, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleLandType(key)}
            className={`h-8 rounded-full px-3 text-[13px] font-medium border transition-colors duration-150 ${
              filters.loai.includes(key)
                ? 'bg-[#1A4D2E] text-white border-transparent'
                : 'bg-white text-[#1d1d1f] border-[rgba(60,60,67,0.2)] hover:border-[#1A4D2E]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Divider />

      {/* ── Price Range ──────────────────────────────────── */}
      <SectionLabel>Giá (tỷ VND)</SectionLabel>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Từ"
          min={0}
          max={50}
          step={0.5}
          value={filters.gia_min}
          onChange={e => update('gia_min', e.target.value)}
          className="w-full rounded-[10px] border border-[rgba(60,60,67,0.2)] bg-white px-3 py-2 text-[14px] text-[#1d1d1f] focus:border-[#1A4D2E] focus:outline-none"
        />
        <span className="shrink-0 text-[13px] text-[#86868b]">–</span>
        <input
          type="number"
          placeholder="Đến"
          min={0}
          max={50}
          step={0.5}
          value={filters.gia_max}
          onChange={e => update('gia_max', e.target.value)}
          className="w-full rounded-[10px] border border-[rgba(60,60,67,0.2)] bg-white px-3 py-2 text-[14px] text-[#1d1d1f] focus:border-[#1A4D2E] focus:outline-none"
        />
      </div>

      <Divider />

      {/* ── Area Range ───────────────────────────────────── */}
      <SectionLabel>Diện tích (m²)</SectionLabel>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Từ"
          min={0}
          step={100}
          value={filters.dien_tich_min}
          onChange={e => update('dien_tich_min', e.target.value)}
          className="w-full rounded-[10px] border border-[rgba(60,60,67,0.2)] bg-white px-3 py-2 text-[14px] text-[#1d1d1f] focus:border-[#1A4D2E] focus:outline-none"
        />
        <span className="shrink-0 text-[13px] text-[#86868b]">–</span>
        <input
          type="number"
          placeholder="Đến"
          min={0}
          step={100}
          value={filters.dien_tich_max}
          onChange={e => update('dien_tich_max', e.target.value)}
          className="w-full rounded-[10px] border border-[rgba(60,60,67,0.2)] bg-white px-3 py-2 text-[14px] text-[#1d1d1f] focus:border-[#1A4D2E] focus:outline-none"
        />
      </div>

      <Divider />

      {/* ── Legal Status ─────────────────────────────────── */}
      <SectionLabel>Tình trạng pháp lý</SectionLabel>
      <div className="flex flex-col gap-2">
        {[
          { id: '',         label: 'Tất cả'        },
          { id: 'so_do',    label: 'Sổ đỏ'         },
          { id: 'so_hong',  label: 'Sổ hồng'       },
          { id: 'dang_lam', label: 'Đang làm sổ'   },
        ].map(opt => (
          <label key={opt.id} className="flex cursor-pointer items-center gap-2.5">
            <div
              onClick={() => update('phap_ly', opt.id)}
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150 cursor-pointer ${
                filters.phap_ly === opt.id
                  ? 'border-[#1A4D2E] bg-[#1A4D2E]'
                  : 'border-[rgba(60,60,67,0.25)] bg-white'
              }`}
            >
              {filters.phap_ly === opt.id && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
            <span className="text-[14px] text-[#1d1d1f]">{opt.label}</span>
          </label>
        ))}
      </div>

      <Divider />

      {/* ── Toggles ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3.5">
        <Toggle
          label="Chỉ xem đã xác minh"
          checked={filters.xac_minh}
          onChange={v => update('xac_minh', v)}
        />
        <Checkbox
          label="Có đường ô tô"
          checked={filters.duong_o_to}
          onChange={v => update('duong_o_to', v)}
        />
        <Checkbox
          label="Có nguồn nước"
          checked={filters.nguon_nuoc}
          onChange={v => update('nguon_nuoc', v)}
        />
        <Checkbox
          label="Có điện lưới"
          checked={filters.dien}
          onChange={v => update('dien', v)}
        />
      </div>
    </aside>
  )
}
