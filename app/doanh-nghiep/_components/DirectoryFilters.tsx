'use client'

import { useState }                                from 'react'
import Link                                        from 'next/link'
import { usePathname, useSearchParams }            from 'next/navigation'

// ── Static data ───────────────────────────────────────────────────────────────

const PROVINCES = [
  { slug: 'dong-nai',   name: 'Đồng Nai'   },
  { slug: 'binh-phuoc', name: 'Bình Phước' },
  { slug: 'lam-dong',   name: 'Lâm Đồng'   },
  { slug: 'gia-lai',    name: 'Gia Lai'     },
  { slug: 'dak-lak',    name: 'Đắk Lắk'    },
  { slug: 'tay-ninh',   name: 'Tây Ninh'   },
  { slug: 'an-giang',   name: 'An Giang'    },
  { slug: 'binh-thuan', name: 'Bình Thuận' },
] as const

const SORT_OPTIONS = [
  { value: 'trust',    label: 'Uy tín cao nhất' },
  { value: 'newest',   label: 'Mới nhất'         },
  { value: 'listings', label: 'Nhiều tin nhất'   },
] as const

// ── URL builder ───────────────────────────────────────────────────────────────

function buildUrl(
  pathname: string,
  current:  URLSearchParams,
  updates:  Record<string, string | null>,
): string {
  const next = new URLSearchParams(current.toString())
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === '') next.delete(k)
    else next.set(k, v)
  }
  const qs = next.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

// ── FilterContent — shared between desktop sidebar + mobile sheet ─────────────

function FilterContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const params   = useSearchParams()

  const currentProvince = params.get('province') ?? ''
  const currentVerified = params.get('verified') === 'true'
  const currentSort     = params.get('sort') ?? 'trust'

  function linkFor(updates: Record<string, string | null>): string {
    const url = buildUrl(pathname, params, updates)
    return url
  }

  return (
    <div className="space-y-7">

      {/* Tỉnh thành */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
          Tỉnh thành
        </p>
        <div className="space-y-1">
          {[{ slug: '', name: 'Toàn quốc' }, ...PROVINCES].map(p => (
            <Link
              key={p.slug}
              href={linkFor({ province: p.slug || null })}
              onClick={onClose}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.875rem]',
                'font-medium no-underline transition-colors duration-150',
                currentProvince === p.slug
                  ? 'bg-vio-primary/10 font-bold text-vio-forest'
                  : 'text-[#0A0A0A] hover:bg-neutral-100',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                  currentProvince === p.slug
                    ? 'border-vio-primary bg-vio-primary'
                    : 'border-neutral-300',
                ].join(' ')}
                aria-hidden="true"
              >
                {currentProvince === p.slug && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              {p.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="h-px bg-neutral-100" />

      {/* Xác thực */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
          Xác thực
        </p>
        <Link
          href={linkFor({ verified: currentVerified ? null : 'true' })}
          onClick={onClose}
          className={[
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.875rem]',
            'font-medium no-underline transition-colors duration-150',
            currentVerified
              ? 'bg-vio-primary/10 font-bold text-vio-forest'
              : 'text-[#0A0A0A] hover:bg-neutral-100',
          ].join(' ')}
        >
          <span
            className={[
              'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
              currentVerified
                ? 'border-vio-primary bg-vio-primary text-white'
                : 'border-neutral-300',
            ].join(' ')}
            aria-hidden="true"
          >
            {currentVerified && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4l2 2L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          Chỉ doanh nghiệp đã xác thực
        </Link>
      </div>

      <div className="h-px bg-neutral-100" />

      {/* Sắp xếp */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
          Sắp xếp theo
        </p>
        <div className="space-y-1">
          {SORT_OPTIONS.map(opt => (
            <Link
              key={opt.value}
              href={linkFor({ sort: opt.value === 'trust' ? null : opt.value })}
              onClick={onClose}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.875rem]',
                'font-medium no-underline transition-colors duration-150',
                currentSort === opt.value
                  ? 'bg-vio-primary/10 font-bold text-vio-forest'
                  : 'text-[#0A0A0A] hover:bg-neutral-100',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                  currentSort === opt.value
                    ? 'border-vio-primary bg-vio-primary'
                    : 'border-neutral-300',
                ].join(' ')}
                aria-hidden="true"
              >
                {currentSort === opt.value && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              {opt.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── DirectoryFilters — exported ───────────────────────────────────────────────

interface DirectoryFiltersProps {
  activeFilterCount: number
}

export function DirectoryFilters({ activeFilterCount }: DirectoryFiltersProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────── */}
      <aside
        className="hidden lg:block w-[240px] shrink-0 sticky top-24 self-start"
        aria-label="Bộ lọc doanh nghiệp"
      >
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="mb-5 text-[0.9375rem] font-bold text-[#0A0A0A]">Bộ lọc</p>
          <FilterContent />
        </div>
      </aside>

      {/* ── Mobile FAB ────────────────────────────────────── */}
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

      {/* ── Mobile bottom sheet ───────────────────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-white"
            role="dialog"
            aria-modal="true"
            aria-label="Bộ lọc doanh nghiệp"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-neutral-200" />
            </div>
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
              <p className="text-[0.9375rem] font-bold text-[#0A0A0A]">Bộ lọc</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100
                           text-neutral-500 hover:bg-neutral-200"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <FilterContent onClose={() => setOpen(false)} />
            </div>
            <div className="h-[env(safe-area-inset-bottom,16px)]" />
          </div>
        </div>
      )}
    </>
  )
}
