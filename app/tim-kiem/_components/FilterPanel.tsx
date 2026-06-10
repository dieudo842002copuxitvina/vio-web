'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { ProvinceOption } from '@/features/search/api/land-search.server'

// ── Static data ───────────────────────────────────────────────────────────────

const LAND_TYPES = [
  { value: 'an_trai',     label: 'Cây ăn trái'  },
  { value: 'cay_lau_nam', label: 'Cây lâu năm'  },
  { value: 'lua',         label: 'Đất lúa'       },
  { value: 'lam_nghiep',  label: 'Lâm nghiệp'   },
  { value: 'hon_hop',     label: 'Hỗn hợp'       },
  { value: 'mat_nuoc',    label: 'Mặt nước'      },
  { value: 'rau_mau',     label: 'Rau màu'       },
] as const

const LEGAL_STATUSES = [
  { value: 'so_do',   label: 'Sổ đỏ'  },
  { value: 'so_hong', label: 'Sổ hồng' },
  { value: 'khac',    label: 'Khác'    },
] as const

const PRICE_PRESETS = [
  { label: 'Dưới 1 Tỷ', min: undefined,     max: 1_000_000_000 },
  { label: '1–3 Tỷ',    min: 1_000_000_000, max: 3_000_000_000 },
  { label: '3–5 Tỷ',    min: 3_000_000_000, max: 5_000_000_000 },
  { label: 'Trên 5 Tỷ', min: 5_000_000_000, max: undefined     },
] as const

// ── Hook ──────────────────────────────────────────────────────────────────────

function useFilterNav() {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const set = useCallback((key: string, value: string | undefined) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    router.push(`${pathname}?${next.toString()}`)
  }, [router, pathname, params])

  const toggleMulti = useCallback((key: string, value: string) => {
    const next  = new URLSearchParams(params.toString())
    const curr  = (next.get(key) ?? '').split(',').filter(Boolean)
    const idx   = curr.indexOf(value)
    const after = idx >= 0 ? curr.filter(v => v !== value) : [...curr, value]
    if (after.length) next.set(key, after.join(','))
    else next.delete(key)
    next.delete('page')
    router.push(`${pathname}?${next.toString()}`)
  }, [router, pathname, params])

  const setPrice = useCallback((min?: number, max?: number) => {
    const next = new URLSearchParams(params.toString())
    if (min != null) next.set('price_min', String(min))
    else next.delete('price_min')
    if (max != null) next.set('price_max', String(max))
    else next.delete('price_max')
    next.delete('page')
    router.push(`${pathname}?${next.toString()}`)
  }, [router, pathname, params])

  const clearAll = useCallback(() => {
    const next = new URLSearchParams()
    const q = params.get('q')
    if (q) next.set('q', q)
    router.push(`${pathname}?${next.toString()}`)
  }, [router, pathname, params])

  return { params, set, toggleMulti, setPrice, clearAll }
}

// ── Sub-sections ──────────────────────────────────────────────────────────────

const SECTION_LABEL = 'mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400'
const DIVIDER       = 'my-5 h-px bg-neutral-100'
const CHECKBOX_ROW  = 'flex items-center gap-2.5 cursor-pointer select-none group'

// ── FilterPanel ───────────────────────────────────────────────────────────────

interface FilterPanelProps {
  provinces:    ProvinceOption[]
  onApply?:     () => void
}

export function FilterPanel({ provinces, onApply }: FilterPanelProps) {
  const { params, set, toggleMulti, setPrice, clearAll } = useFilterNav()

  const currentProvince = params.get('province') ?? ''
  const currentTypes    = (params.get('land_type') ?? '').split(',').filter(Boolean)
  const currentLegals   = (params.get('legal') ?? '').split(',').filter(Boolean)
  const priceMin        = params.get('price_min')
  const priceMax        = params.get('price_max')

  const activePricePreset = PRICE_PRESETS.findIndex(p => {
    const minOk = p.min == null ? !priceMin : String(p.min) === priceMin
    const maxOk = p.max == null ? !priceMax : String(p.max) === priceMax
    return minOk && maxOk
  })

  const hasFilters = currentProvince || currentTypes.length || currentLegals.length || priceMin || priceMax

  function handleProvince(slug: string) {
    set('province', slug || undefined)
    onApply?.()
  }

  function handleType(value: string) {
    toggleMulti('land_type', value)
  }

  function handleLegal(value: string) {
    toggleMulti('legal', value)
  }

  function handlePricePreset(i: number) {
    const preset = PRICE_PRESETS[i]!
    if (activePricePreset === i) setPrice(undefined, undefined)
    else setPrice(preset.min, preset.max)
  }

  return (
    <div>

      {/* ── Tỉnh thành ─────────────────────────────────────────── */}
      <div>
        <p className={SECTION_LABEL}>Tỉnh thành</p>
        <select
          value={currentProvince}
          onChange={e => handleProvince(e.target.value)}
          className="w-full h-9 rounded-xl border border-neutral-200 bg-white px-3 text-[0.875rem]
                     text-[#1d1d1f] outline-none transition-colors focus:border-vio-forest/40
                     focus:ring-2 focus:ring-vio-forest/10"
        >
          <option value="">Toàn quốc</option>
          {provinces.map(p => (
            <option key={p.id} value={p.slug}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className={DIVIDER} />

      {/* ── Loại đất ───────────────────────────────────────────── */}
      <div>
        <p className={SECTION_LABEL}>Loại đất</p>
        <div className="space-y-2">
          {LAND_TYPES.map(t => {
            const checked = currentTypes.includes(t.value)
            return (
              <label key={t.value} className={CHECKBOX_ROW}>
                <span
                  className={[
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    'transition-colors duration-100',
                    checked
                      ? 'border-vio-forest bg-vio-forest'
                      : 'border-neutral-300 bg-white group-hover:border-neutral-400',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {checked && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleType(t.value)}
                  className="sr-only"
                />
                <span className="text-[0.875rem] text-[#1d1d1f]">{t.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className={DIVIDER} />

      {/* ── Giá ────────────────────────────────────────────────── */}
      <div>
        <p className={SECTION_LABEL}>Giá</p>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePricePreset(i)}
              className={[
                'rounded-full border px-3 py-1 text-[0.8125rem] font-medium transition-colors duration-100',
                activePricePreset === i
                  ? 'border-vio-forest bg-vio-forest/8 font-semibold text-vio-forest'
                  : 'border-neutral-200 bg-white text-[#1d1d1f] hover:border-neutral-300',
              ].join(' ')}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className={DIVIDER} />

      {/* ── Pháp lý ────────────────────────────────────────────── */}
      <div>
        <p className={SECTION_LABEL}>Pháp lý</p>
        <div className="space-y-2">
          {LEGAL_STATUSES.map(s => {
            const checked = currentLegals.includes(s.value)
            return (
              <label key={s.value} className={CHECKBOX_ROW}>
                <span
                  className={[
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    'transition-colors duration-100',
                    checked
                      ? 'border-vio-forest bg-vio-forest'
                      : 'border-neutral-300 bg-white group-hover:border-neutral-400',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {checked && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleLegal(s.value)}
                  className="sr-only"
                />
                <span className="text-[0.875rem] text-[#1d1d1f]">{s.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* ── Clear all ──────────────────────────────────────────── */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => { clearAll(); onApply?.() }}
          className="mt-5 w-full rounded-xl border border-neutral-200 bg-white py-2
                     text-[0.8125rem] font-medium text-neutral-500 transition-colors
                     hover:border-neutral-300 hover:bg-neutral-50 hover:text-[#1d1d1f]"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  )
}
