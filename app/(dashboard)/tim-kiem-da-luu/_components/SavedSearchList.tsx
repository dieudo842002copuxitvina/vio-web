'use client'

import { useState } from 'react'
import Link         from 'next/link'
import { deleteSearch } from '@/features/saved-searches/api/actions.server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SavedSearch {
  id:         string
  label:      string
  query_url:  string
  filters:    Record<string, unknown>
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LAND_TYPE_LABELS: Record<string, string> = {
  an_trai:     'Cây ăn trái',
  cay_lau_nam: 'Cây lâu năm',
  lua:         'Đất lúa',
  lam_nghiep:  'Lâm nghiệp',
  hon_hop:     'Hỗn hợp',
  mat_nuoc:    'Mặt nước',
  rau_mau:     'Rau màu',
}

function fmtB(n: number): string {
  const b = n / 1e9
  return Number.isInteger(b) ? String(b) : b.toFixed(1)
}

interface Chip { label: string; variant: 'green' | 'neutral' }

function getChips(filters: Record<string, unknown>): Chip[] {
  const chips: Chip[] = []

  if (filters.province_name)
    chips.push({ label: String(filters.province_name), variant: 'green' })

  if (filters.land_type) {
    const names = String(filters.land_type)
      .split(',')
      .map(t => LAND_TYPE_LABELS[t])
      .filter(Boolean)
      .slice(0, 2)
    if (names.length) chips.push({ label: names.join(', '), variant: 'neutral' })
  }

  const min = filters.price_min ? Number(filters.price_min) : null
  const max = filters.price_max ? Number(filters.price_max) : null
  if (min && max)  chips.push({ label: `${fmtB(min)}–${fmtB(max)} tỷ`, variant: 'neutral' })
  else if (min)    chips.push({ label: `Trên ${fmtB(min)} tỷ`,         variant: 'neutral' })
  else if (max)    chips.push({ label: `Dưới ${fmtB(max)} tỷ`,         variant: 'neutral' })

  if (filters.q) chips.push({ label: `"${String(filters.q)}"`, variant: 'neutral' })

  return chips
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── SearchRow ─────────────────────────────────────────────────────────────────

function SearchRow({
  s,
  isDeleting,
  onDelete,
}: {
  s:          SavedSearch
  isDeleting: boolean
  onDelete:   (id: string) => void
}) {
  const chips = getChips(s.filters)

  return (
    <div
      className={[
        'group flex items-start gap-4 rounded-2xl border border-neutral-100 bg-white',
        'px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-opacity duration-150',
        isDeleting ? 'pointer-events-none opacity-40' : '',
      ].join(' ')}
    >
      {/* Icon */}
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-vio-forest/8">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
             className="text-vio-forest" aria-hidden="true">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.75"/>
          <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[14px] font-semibold text-[#1d1d1f]">
          {s.label}
        </p>

        {chips.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips.map((chip, i) => (
              <span
                key={i}
                className={[
                  'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                  chip.variant === 'green'
                    ? 'bg-vio-forest/8 text-vio-forest'
                    : 'bg-neutral-100 text-neutral-600',
                ].join(' ')}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}

        <p className="m-0 mt-1.5 text-[11px] text-neutral-400">
          Đã lưu {fmtDate(s.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={s.query_url}
          className={[
            'flex h-8 items-center rounded-full border border-vio-forest/20',
            'bg-vio-forest/5 px-3.5 text-[12px] font-semibold text-vio-forest',
            'no-underline transition-colors hover:bg-vio-forest/10',
          ].join(' ')}
        >
          Chạy lại
        </Link>
        <button
          type="button"
          onClick={() => onDelete(s.id)}
          aria-label="Xóa tìm kiếm đã lưu"
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300
                     transition-colors hover:bg-red-50 hover:text-red-400
                     opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100"
           aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="10" cy="10" r="7" stroke="#86868b" strokeWidth="1.75"/>
          <path d="M15.5 15.5 21 21" stroke="#86868b" strokeWidth="1.75" strokeLinecap="round"/>
          <path d="M7 10h6M10 7v6" stroke="#86868b" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="m-0 text-[16px] font-semibold tracking-tight text-[#1d1d1f]">
        Chưa có tìm kiếm đã lưu
      </p>
      <p className="m-0 mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-neutral-400">
        Lưu bộ lọc từ trang tìm kiếm để theo dõi đất mới phù hợp tiêu chí của bạn
      </p>
      <Link
        href="/dat-nong-nghiep"
        className="mt-5 rounded-full bg-vio-forest px-5 py-2.5 text-[14px]
                   font-bold text-white no-underline hover:opacity-90"
      >
        Khám phá đất ngay
      </Link>
    </div>
  )
}

// ── SavedSearchList ───────────────────────────────────────────────────────────

interface SavedSearchListProps {
  searches: SavedSearch[]
}

export function SavedSearchList({ searches: initial }: SavedSearchListProps) {
  const [searches,   setSearches]   = useState(initial)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await deleteSearch(id)
    if (res.success) {
      setSearches(prev => prev.filter(s => s.id !== id))
    }
    setDeletingId(null)
  }

  if (searches.length === 0) return <EmptyState />

  return (
    <div className="flex flex-col gap-2.5">
      {searches.map(s => (
        <SearchRow
          key={s.id}
          s={s}
          isDeleting={deletingId === s.id}
          onDelete={id => void handleDelete(id)}
        />
      ))}
    </div>
  )
}
