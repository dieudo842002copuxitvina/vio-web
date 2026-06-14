'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { saveSearch }                   from '@/features/saved-searches/api/actions.server'
import type { ProvinceOption }          from '@/features/search/api/land-search.server'

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

function fmtBillion(n: number): string {
  const b = n / 1e9
  return Number.isInteger(b) ? String(b) : b.toFixed(1)
}

function buildLabel(params: URLSearchParams, provinces: ProvinceOption[]): string {
  const parts: string[] = []

  const lt = params.get('land_type')
  if (lt) {
    const names = lt.split(',').map(t => LAND_TYPE_LABELS[t]).filter(Boolean)
    if (names.length) parts.push(names.slice(0, 2).join(', '))
  }

  const slug = params.get('province')
  if (slug) {
    const match = provinces.find(p => p.slug === slug)
    parts.push(match?.name ?? slug)
  }

  const pMin = params.get('price_min') ? Number(params.get('price_min')) : null
  const pMax = params.get('price_max') ? Number(params.get('price_max')) : null
  if (pMin && pMax)  parts.push(`${fmtBillion(pMin)}–${fmtBillion(pMax)} tỷ`)
  else if (pMin)     parts.push(`Trên ${fmtBillion(pMin)} tỷ`)
  else if (pMax)     parts.push(`Dưới ${fmtBillion(pMax)} tỷ`)

  const q = params.get('q')
  if (q) parts.push(`"${q}"`)

  return parts.join(' · ') || 'Tìm kiếm đất nông nghiệp'
}

function buildFilters(params: URLSearchParams, provinces: ProvinceOption[]): Record<string, unknown> {
  const slug  = params.get('province')
  const match = slug ? provinces.find(p => p.slug === slug) : null
  return {
    q:             params.get('q')         || null,
    province:      slug                    || null,
    province_name: match?.name             ?? null,
    land_type:     params.get('land_type') || null,
    legal:         params.get('legal')     || null,
    price_min:     params.get('price_min') ? Number(params.get('price_min')) : null,
    price_max:     params.get('price_max') ? Number(params.get('price_max')) : null,
    sort:          params.get('sort')      || null,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type BtnState = 'idle' | 'open' | 'saving' | 'saved' | 'error'

interface SaveSearchButtonProps {
  provinces: ProvinceOption[]
}

export function SaveSearchButton({ provinces }: SaveSearchButtonProps) {
  const [state,   setState]   = useState<BtnState>('idle')
  const [label,   setLabel]   = useState('')
  const params    = useSearchParams()
  const pathname  = usePathname()
  const wrapRef   = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (state !== 'open') return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setState('idle')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [state])

  // Select all text in input when popover opens
  useEffect(() => {
    if (state === 'open') inputRef.current?.select()
  }, [state])

  function open() {
    setLabel(buildLabel(params, provinces))
    setState('open')
  }

  async function handleSave() {
    if (!label.trim()) return
    setState('saving')
    const queryUrl = `${pathname}?${params.toString()}`
    const filters  = buildFilters(params, provinces)
    const res      = await saveSearch(label.trim(), queryUrl, filters)
    if (res.success) {
      setState('saved')
      setTimeout(() => setState('idle'), 2200)
    } else if (res.error === 'auth') {
      window.location.href = `/dang-nhap?next=${encodeURIComponent(queryUrl)}`
    } else {
      setState('error')
      setTimeout(() => setState('idle'), 2500)
    }
  }

  return (
    <div ref={wrapRef} className="relative">

      {/* ── Trigger ─────────────────────────────────────── */}
      {state === 'saved' ? (
        <div className="flex h-8 items-center gap-1.5 rounded-full
                        bg-vio-forest/10 px-3 text-[0.8125rem] font-semibold text-vio-forest">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">Đã lưu</span>
        </div>
      ) : state === 'error' ? (
        <div className="flex h-8 items-center rounded-full bg-red-50 px-3
                        text-[0.8125rem] font-medium text-red-500">
          Lỗi — thử lại
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          aria-label="Lưu tìm kiếm này"
          className={[
            'flex h-8 items-center gap-1.5 rounded-full border px-3',
            'text-[0.8125rem] font-medium transition-colors duration-100',
            state === 'open'
              ? 'border-vio-forest/40 bg-vio-forest/8 text-vio-forest'
              : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-[#1d1d1f]',
          ].join(' ')}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
                  stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">Lưu tìm kiếm</span>
        </button>
      )}

      {/* ── Save popover ─────────────────────────────────── */}
      {state === 'open' && (
        <div
          role="dialog"
          aria-label="Đặt tên tìm kiếm"
          className="absolute right-0 top-full z-50 mt-2 w-[288px] rounded-2xl border
                     border-neutral-100 bg-white p-4
                     shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        >
          <p className="m-0 mb-3 text-[13px] font-semibold text-[#1d1d1f]">
            Đặt tên cho tìm kiếm
          </p>
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSave() }}
            maxLength={120}
            placeholder="VD: Đất sầu riêng Lâm Đồng"
            className="mb-3 h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50
                       px-3 text-[0.875rem] text-[#1d1d1f] outline-none
                       placeholder:text-neutral-400
                       focus:border-vio-forest/40 focus:ring-2 focus:ring-vio-forest/10"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setState('idle')}
              className="px-3 py-1.5 text-[0.8125rem] font-medium text-neutral-500
                         transition-colors hover:text-[#1d1d1f]"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!label.trim()}
              onClick={() => void handleSave()}
              className="flex h-8 items-center rounded-full bg-vio-forest px-4
                         text-[0.8125rem] font-semibold text-white
                         transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Lưu
            </button>
          </div>
        </div>
      )}

      {/* ── Saving indicator ─────────────────────────────── */}
      {state === 'saving' && (
        <div className="absolute right-0 top-full z-50 mt-2 flex items-center gap-2
                        rounded-2xl border border-neutral-100 bg-white px-4 py-3
                        text-[0.8125rem] text-neutral-500
                        shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Đang lưu...
        </div>
      )}
    </div>
  )
}
