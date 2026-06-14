'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Data ───────────────────────────────────────────────────────────────────────
// Top agricultural provinces — shown in hero for speed.
// Full list is available in the /dat-nong-nghiep FilterSidebar.

const PROVINCES = [
  { value: 'lam-dong',   label: 'Lâm Đồng'   },
  { value: 'dak-lak',    label: 'Đắk Lắk'    },
  { value: 'gia-lai',    label: 'Gia Lai'     },
  { value: 'dong-nai',   label: 'Đồng Nai'   },
  { value: 'binh-phuoc', label: 'Bình Phước' },
  { value: 'tay-ninh',   label: 'Tây Ninh'   },
  { value: 'an-giang',   label: 'An Giang'    },
  { value: 'long-an',    label: 'Long An'     },
  { value: 'dak-nong',   label: 'Đắk Nông'   },
  { value: 'kon-tum',    label: 'Kon Tum'     },
] as const

const LAND_TYPES = [
  { value: 'lua',        label: 'Đất lúa'        },
  { value: 'rau-mau',    label: 'Đất rau màu'    },
  { value: 'cay-lau-nam',label: 'Cây lâu năm'    },
  { value: 'lam-nghiep', label: 'Lâm nghiệp'     },
  { value: 'mat-nuoc',   label: 'Nuôi thuỷ sản'  },
  { value: 'trang-trai', label: 'Trang trại'      },
] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

function ChevronDown() {
  return (
    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-40"
         width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden="true">
      <path d="M1 1l6 6 6-6" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── HeroSearchForm ─────────────────────────────────────────────────────────────

export function HeroSearchForm() {
  const router   = useRouter()
  const [txn,      setTxn]      = useState<'mua' | 'thue'>('mua')
  const [province, setProvince] = useState('')
  const [landType, setLandType] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('giao_dich', txn)
    if (province) params.set('tinh', province)
    if (landType) params.set('loai', landType)
    router.push(`/dat-nong-nghiep?${params.toString()}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Tìm kiếm đất nông nghiệp"
      className="w-full overflow-hidden rounded-[22px] border border-white/20
                 bg-white/[0.94] shadow-[0_28px_72px_rgba(0,0,0,0.22)]
                 backdrop-blur-2xl"
    >
      {/* ── Buy / Rent toggle — always visible ───────────────────────── */}
      <div className="flex gap-1 border-b border-neutral-100/80 px-4 pt-3 pb-2.5">
        {([['mua', 'Mua đất'], ['thue', 'Cho thuê']] as const).map(([val, lbl]) => (
          <button
            key={val}
            type="button"
            onClick={() => setTxn(val)}
            className={[
              'rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors duration-150',
              txn === val
                ? 'bg-[#1A4D2E] text-white'
                : 'text-[#6e6e73] hover:text-[#1d1d1f]',
            ].join(' ')}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Desktop: single row ───────────────────────────────────────── */}
      <div className="hidden items-center lg:flex">

        {/* Province */}
        <div className="flex min-w-0 flex-1 flex-col px-5 py-3.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">
            Tỉnh thành
          </span>
          <div className="relative mt-1.5">
            <select
              value={province}
              onChange={e => setProvince(e.target.value)}
              aria-label="Chọn tỉnh thành"
              className="w-full appearance-none bg-transparent pr-6 text-[15px]
                         font-semibold text-[#1d1d1f] outline-none cursor-pointer"
            >
              <option value="">Tất cả tỉnh thành</option>
              {PROVINCES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown />
          </div>
        </div>

        {/* Divider */}
        <div className="h-10 w-px shrink-0 bg-neutral-200" aria-hidden="true" />

        {/* Land type */}
        <div className="flex min-w-0 flex-1 flex-col px-5 py-3.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">
            Loại đất
          </span>
          <div className="relative mt-1.5">
            <select
              value={landType}
              onChange={e => setLandType(e.target.value)}
              aria-label="Chọn loại đất"
              className="w-full appearance-none bg-transparent pr-6 text-[15px]
                         font-semibold text-[#1d1d1f] outline-none cursor-pointer"
            >
              <option value="">Tất cả loại đất</option>
              {LAND_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown />
          </div>
        </div>

        {/* Search button */}
        <div className="px-3 py-2.5">
          <button
            type="submit"
            className="flex h-12 items-center gap-2.5 rounded-[14px] bg-[#1A4D2E]
                       px-7 text-[15px] font-bold text-white
                       transition-all hover:bg-[#2D7A4F] active:scale-[0.97]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.2"/>
              <path d="M16.5 16.5 21 21" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            Tìm đất ngay
          </button>
        </div>
      </div>

      {/* ── Mobile: stacked ───────────────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="grid grid-cols-2">
          <div className="border-b border-r border-neutral-100/80 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">
              Tỉnh thành
            </p>
            <div className="relative mt-1.5">
              <select
                value={province}
                onChange={e => setProvince(e.target.value)}
                aria-label="Chọn tỉnh thành"
                className="w-full appearance-none bg-transparent pr-5 text-[15px]
                           font-semibold text-[#1d1d1f] outline-none cursor-pointer"
              >
                <option value="">Tất cả</option>
                {PROVINCES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <ChevronDown />
            </div>
          </div>

          <div className="border-b border-neutral-100/80 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b]">
              Loại đất
            </p>
            <div className="relative mt-1.5">
              <select
                value={landType}
                onChange={e => setLandType(e.target.value)}
                aria-label="Chọn loại đất"
                className="w-full appearance-none bg-transparent pr-5 text-[15px]
                           font-semibold text-[#1d1d1f] outline-none cursor-pointer"
              >
                <option value="">Tất cả</option>
                {LAND_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown />
            </div>
          </div>
        </div>

        <div className="px-3 pb-3 pt-2">
          <button
            type="submit"
            className="w-full rounded-[14px] bg-[#1A4D2E] py-[15px]
                       text-[16px] font-bold text-white
                       transition-all hover:bg-[#2D7A4F] active:scale-[0.98]"
          >
            Tìm đất ngay
          </button>
        </div>
      </div>
    </form>
  )
}
