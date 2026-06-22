'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { CategoryAttribute, AttributeInputType } from '@/entities/category'

// ── URL helpers ───────────────────────────────────────────────────────────────

function buildUrl(
  pathname: string,
  current: URLSearchParams,
  updates: Record<string, string | null>,
): string {
  const next = new URLSearchParams(current.toString())
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
  }
  const qs = next.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

function toggleMultiValue(current: string | null, value: string): string | null {
  const values = (current ?? '').split(',').filter(Boolean)
  const idx = values.indexOf(value)
  if (idx >= 0) values.splice(idx, 1)
  else values.push(value)
  return values.length ? values.join(',') : null
}

// ── SelectFilter — radio chips ────────────────────────────────────────────────

function SelectFilter({
  attr, pathname, searchParams,
}: {
  attr:        CategoryAttribute
  pathname:    string
  searchParams: URLSearchParams
}) {
  if (!attr.options?.length) return null
  const current = searchParams.get(attr.key) ?? ''

  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
        {attr.label}
      </p>
      <div className="flex flex-wrap gap-2">
        {/* Clear option */}
        <Link
          href={buildUrl(pathname, searchParams, { [attr.key]: null })}
          className={[
            'rounded-xl border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150',
            !current
              ? 'border-vio-primary bg-vio-primary/10 font-bold text-vio-forest'
              : 'border-neutral-200 bg-white text-[#0A0A0A] hover:border-neutral-300 hover:bg-neutral-50',
          ].join(' ')}
        >
          Tất cả
        </Link>
        {attr.options.map(opt => (
          <Link
            key={opt.value}
            href={buildUrl(pathname, searchParams, {
              [attr.key]: current === opt.value ? null : opt.value,
            })}
            className={[
              'rounded-xl border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150',
              current === opt.value
                ? 'border-vio-primary bg-vio-primary/10 font-bold text-vio-forest'
                : 'border-neutral-200 bg-white text-[#0A0A0A] hover:border-neutral-300 hover:bg-neutral-50',
            ].join(' ')}
          >
            {opt.label}
            {opt.count != null && (
              <span className="ml-1.5 text-[10px] text-neutral-400">({opt.count})</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── MultiSelectFilter — toggle chips ─────────────────────────────────────────

function MultiSelectFilter({
  attr, pathname, searchParams,
}: {
  attr:         CategoryAttribute
  pathname:     string
  searchParams: URLSearchParams
}) {
  if (!attr.options?.length) return null
  const currentRaw = searchParams.get(attr.key) ?? ''
  const selected   = new Set(currentRaw.split(',').filter(Boolean))

  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
        {attr.label}
      </p>
      <div className="flex flex-wrap gap-2">
        {attr.options.map(opt => {
          const isActive = selected.has(opt.value)
          const nextVal  = toggleMultiValue(currentRaw || null, opt.value)
          return (
            <Link
              key={opt.value}
              href={buildUrl(pathname, searchParams, { [attr.key]: nextVal })}
              className={[
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5',
                'text-[0.8125rem] font-medium transition-colors duration-150',
                isActive
                  ? 'border-vio-primary bg-vio-primary/10 font-bold text-vio-forest'
                  : 'border-neutral-200 bg-white text-[#0A0A0A] hover:border-neutral-300',
              ].join(' ')}
            >
              {/* Checkbox indicator */}
              <span
                className={[
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                  isActive
                    ? 'border-vio-primary bg-vio-primary text-white'
                    : 'border-neutral-300',
                ].join(' ')}
                aria-hidden="true"
              >
                {isActive && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l2 2L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {opt.label}
              {opt.count != null && (
                <span className="text-[10px] text-neutral-400">({opt.count})</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── BooleanFilter — single toggle ─────────────────────────────────────────────

function BooleanFilter({
  attr, pathname, searchParams,
}: {
  attr:         CategoryAttribute
  pathname:     string
  searchParams: URLSearchParams
}) {
  const isActive = searchParams.get(attr.key) === 'true'
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
        {attr.label}
      </p>
      <Link
        href={buildUrl(pathname, searchParams, { [attr.key]: isActive ? null : 'true' })}
        className={[
          'inline-flex items-center gap-2 rounded-xl border px-4 py-2',
          'text-[0.875rem] font-medium transition-colors duration-150',
          isActive
            ? 'border-vio-primary bg-vio-primary/10 font-bold text-vio-forest'
            : 'border-neutral-200 bg-white text-[#0A0A0A] hover:border-neutral-300',
        ].join(' ')}
      >
        {/* Toggle indicator */}
        <span
          className={[
            'flex h-5 w-9 shrink-0 items-center rounded-full border-2 px-0.5',
            'transition-colors duration-200',
            isActive
              ? 'border-vio-primary bg-vio-primary'
              : 'border-neutral-300 bg-neutral-100',
          ].join(' ')}
          aria-hidden="true"
        >
          <span
            className={[
              'h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200',
              isActive ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')}
          />
        </span>
        {attr.label}
      </Link>
    </div>
  )
}

// ── RangeFilter — number inputs (needs client state) ─────────────────────────

function RangeFilter({
  attr, pathname, searchParams,
}: {
  attr:         CategoryAttribute
  pathname:     string
  searchParams: URLSearchParams
}) {
  const router    = useRouter()
  const minKey    = `${attr.key}_min`
  const maxKey    = `${attr.key}_max`
  const initMin   = searchParams.get(minKey) ?? ''
  const initMax   = searchParams.get(maxKey) ?? ''
  const [minVal, setMinVal] = useState(initMin)
  const [maxVal, setMaxVal] = useState(initMax)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ✅ BUG FIX (FILTER-01): Sync local state when URL changes externally.
  // This handles "Xóa tất cả" clearing the URL params — without this fix,
  // the input still shows old values even though the URL is clean.
  useEffect(() => { setMinVal(initMin) }, [initMin])
  useEffect(() => { setMaxVal(initMax) }, [initMax])

  const pushRange = useCallback((min: string, max: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const url = buildUrl(pathname, searchParams, {
        [minKey]: min || null,
        [maxKey]: max || null,
      })
      router.push(url)
    }, 600)
  }, [router, pathname, searchParams, minKey, maxKey])

  // cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const hasValue = initMin || initMax

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
          {attr.label}
        </p>
        {hasValue && (
          <Link
            href={buildUrl(pathname, searchParams, { [minKey]: null, [maxKey]: null })}
            className="text-[0.6875rem] text-vio-forest no-underline hover:opacity-70"
          >
            Xóa
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Từ"
          value={minVal}
          onChange={e => { setMinVal(e.target.value); pushRange(e.target.value, maxVal) }}
          className="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3
                     text-[0.8125rem] placeholder:text-neutral-400
                     focus:border-vio-primary focus:outline-none focus:ring-2 focus:ring-vio-primary/20
                     [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="shrink-0 text-neutral-300">—</span>
        <input
          type="number"
          placeholder="Đến"
          value={maxVal}
          onChange={e => { setMaxVal(e.target.value); pushRange(minVal, e.target.value) }}
          className="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3
                     text-[0.8125rem] placeholder:text-neutral-400
                     focus:border-vio-primary focus:outline-none focus:ring-2 focus:ring-vio-primary/20
                     [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  )
}

// ── FilterContent — renders all attribute sections ────────────────────────────

function FilterContent({
  attributes,
  pathname,
  searchParams,
}: {
  attributes:  CategoryAttribute[]
  pathname:    string
  searchParams: URLSearchParams
}) {
  if (!attributes.length) return (
    <p className="text-[0.875rem] text-neutral-400">Không có bộ lọc cho danh mục này.</p>
  )

  const renderers: Record<AttributeInputType, (attr: CategoryAttribute) => React.ReactNode> = {
    select:      attr => <SelectFilter      key={attr.id} attr={attr} pathname={pathname} searchParams={searchParams} />,
    multiselect: attr => <MultiSelectFilter key={attr.id} attr={attr} pathname={pathname} searchParams={searchParams} />,
    range:       attr => <RangeFilter       key={attr.id} attr={attr} pathname={pathname} searchParams={searchParams} />,
    boolean:     attr => <BooleanFilter     key={attr.id} attr={attr} pathname={pathname} searchParams={searchParams} />,
    text:        ()   => null,
  }

  return (
    <div className="space-y-6">
      {attributes.map(attr => renderers[attr.input_type]?.(attr))}
    </div>
  )
}

// ── CategoryFilters — exported component ──────────────────────────────────────

interface CategoryFiltersProps {
  attributes:         CategoryAttribute[]
  activeFilterCount:  number
}

export function CategoryFilters({ attributes, activeFilterCount }: CategoryFiltersProps) {
  const pathname    = usePathname()
  const rawParams   = useSearchParams()
  const [open, setOpen] = useState(false)

  if (!attributes.length) return null

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside
        className="hidden lg:block w-[270px] shrink-0 sticky top-24 self-start"
        aria-label="Bộ lọc danh mục"
      >
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="mb-5 text-[0.9375rem] font-bold text-[#0A0A0A]">Bộ lọc</p>
          <FilterContent attributes={attributes} pathname={pathname} searchParams={rawParams} />
        </div>
      </aside>

      {/* ── Mobile FAB ───────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-6 right-4 z-30">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở bộ lọc"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-3
                     text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          Lọc
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-vio-primary
                             text-[11px] font-black text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile bottom sheet ──────────────────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl bg-white"
            role="dialog"
            aria-modal="true"
            aria-label="Bộ lọc danh mục"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-neutral-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
              <p className="text-[0.9375rem] font-bold text-[#0A0A0A]">Bộ lọc</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100
                           text-neutral-500 transition-colors hover:bg-neutral-200"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <FilterContent attributes={attributes} pathname={pathname} searchParams={rawParams} />
            </div>

            <div className="h-[env(safe-area-inset-bottom,16px)]" />
          </div>
        </div>
      )}
    </>
  )
}
