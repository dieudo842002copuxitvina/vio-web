'use client'

import { useState, useRef, useEffect } from 'react'
import Link    from 'next/link'
import { MapPin, ChevronDown, X } from 'lucide-react'

const PROVINCES = [
  { slug: null,         name: 'Toàn quốc',   count: null },
  { slug: 'dong-nai',   name: 'Đồng Nai',    count: null },
  { slug: 'binh-phuoc', name: 'Bình Phước',  count: null },
  { slug: 'tay-ninh',   name: 'Tây Ninh',    count: null },
  { slug: 'lam-dong',   name: 'Lâm Đồng',    count: null },
  { slug: 'gia-lai',    name: 'Gia Lai',      count: null },
  { slug: 'dak-lak',    name: 'Đắk Lắk',     count: null },
  { slug: 'an-giang',   name: 'An Giang',     count: null },
  { slug: 'binh-thuan', name: 'Bình Thuận',   count: null },
] as const

export function ProvinceSwitcher() {
  const [open, setOpen] = useState(false)
  const ref  = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[0.8125rem] font-medium text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--link-bg-hover)]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <MapPin size={13} className="text-vio-primary shrink-0" />
        <span>Toàn quốc</span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[180px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-apple-hover"
          role="listbox"
          aria-label="Chọn tỉnh thành"
        >
          <div className="p-1.5">
            {PROVINCES.map(p => (
              <Link
                key={p.slug ?? 'all'}
                href={p.slug ? `/dat-nong-nghiep/${p.slug}` : '/dat-nong-nghiep'}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.8125rem] font-medium text-[var(--sea-ink)] no-underline hover:bg-[var(--link-bg-hover)] transition-colors"
                role="option"
              >
                {p.slug
                  ? <MapPin size={12} className="text-vio-primary shrink-0" />
                  : <span className="h-3 w-3 shrink-0 rounded-full border border-[var(--line)]" />
                }
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
