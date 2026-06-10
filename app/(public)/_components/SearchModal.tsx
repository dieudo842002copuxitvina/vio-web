'use client'

import { useEffect, useRef, useState } from 'react'
import Link        from 'next/link'
import { useRouter } from 'next/navigation'
import { useShell } from './ShellProvider'

// ── Static suggestions ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: 'Đất trồng lúa · Lâm Đồng',    href: '/dat-nong-nghiep?province=lam-dong&loai=dat-lua'       },
  { label: 'Đất vườn cà phê · Đắk Lắk',   href: '/dat-nong-nghiep?province=dak-lak&loai=dat-vuon'       },
  { label: 'Đất rẫy · Gia Lai',             href: '/dat-nong-nghiep?province=gia-lai&loai=dat-ray'         },
  { label: 'Đất nông nghiệp · Đồng Nai',   href: '/dat-nong-nghiep?province=dong-nai'                     },
  { label: 'Trang trại · Bình Phước',       href: '/dat-nong-nghiep?province=binh-phuoc&loai=trang-trai'  },
] as const

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── SearchModal ───────────────────────────────────────────────────────────────

export function SearchModal() {
  const { isSearchOpen, closeSearch } = useShell()
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  // Focus & reset when opened
  useEffect(() => {
    if (!isSearchOpen) return
    setQuery('')
    const id = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(id)
  }, [isSearchOpen])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/dat-nong-nghiep?q=${encodeURIComponent(q)}` : '/dat-nong-nghiep')
    closeSearch()
  }

  if (!isSearchOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm toàn trang"
      onKeyDown={e => e.key === 'Escape' && closeSearch()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={closeSearch}
      />

      {/* Panel */}
      <div className="relative mx-4 mt-[12vh] w-full max-w-[600px] overflow-hidden
                      rounded-2xl bg-[var(--surface)]
                      shadow-[0_24px_64px_rgba(0,0,0,0.22)]
                      dark:bg-[#1C1C1E]">

        {/* Search input */}
        <form onSubmit={handleSubmit} role="search">
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
            <span className="shrink-0 text-[var(--muted)]">
              <SearchIcon size={18} />
            </span>

            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm kiếm đất nông nghiệp, tỉnh thành..."
              aria-label="Tìm kiếm"
              className="min-w-0 flex-1 bg-transparent text-base
                         text-[var(--sea-ink)] placeholder:text-[var(--muted)]
                         outline-none"
            />

            <kbd
              aria-label="Nhấn Escape để đóng"
              className="hidden shrink-0 items-center rounded-lg
                         border border-[var(--line)] bg-[var(--foam)]
                         px-2 py-0.5 font-mono text-[11px] text-[var(--muted)]
                         sm:inline-flex"
            >
              Esc
            </kbd>
          </div>
        </form>

        {/* Suggestions */}
        <div className="p-2">
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase
                        tracking-[0.1em] text-[var(--muted)]">
            Tìm kiếm phổ biến
          </p>
          <ul className="m-0 list-none p-0" role="listbox" aria-label="Gợi ý tìm kiếm">
            {SUGGESTIONS.map(s => (
              <li key={s.href} role="option" aria-selected={false}>
                <Link
                  href={s.href}
                  onClick={closeSearch}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5
                             text-[14px] text-[var(--sea-ink)] no-underline
                             transition-colors hover:bg-[var(--sand)]
                             focus-visible:bg-[var(--sand)] focus-visible:outline-none"
                >
                  <span className="shrink-0 text-[var(--muted)]">
                    <SearchIcon size={14} />
                  </span>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
