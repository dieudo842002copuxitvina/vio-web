'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SearchAutocomplete } from '@/components/search-autocomplete'

const NAV_LINKS = [
  { href: '/',                label: 'Khám phá' },
  { href: '/dat-nong-nghiep', label: 'Đất nông nghiệp' },
]

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-sm">
      <div className="page-wrap flex items-center h-14 gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 font-bold text-xl text-[var(--sea-ink)] no-underline"
          style={{ fontFamily: '"Fraunces", Georgia, serif' }}
        >
          VIO<span className="text-[var(--lagoon)]">.</span>LOCAL
        </Link>

        {/* Desktop: search + nav — hidden on mobile */}
        <div className="hidden md:flex ml-auto items-center gap-4">
          <SearchAutocomplete compact placeholder="Tìm kiếm..." className="w-52" />
          <nav className="flex items-center gap-5 text-sm">
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[var(--sea-ink-soft)] no-underline font-medium hover:text-[var(--sea-ink)] transition-colors duration-100 whitespace-nowrap"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile hamburger — hidden on md+ */}
        <button
          className="md:hidden ml-auto p-2 -mr-1 rounded-lg text-[var(--sea-ink-soft)] hover:bg-[var(--chip-bg)] transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
        >
          {open ? (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l12 12M17 5L5 17" />
            </svg>
          ) : (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7h16M3 12h16M3 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu drawer */}
      {open && (
        <nav
          className="md:hidden border-t border-[var(--line)] bg-[var(--header-bg)]"
          aria-label="Mobile navigation"
        >
          <div className="page-wrap flex flex-col py-3 gap-2 px-4">
            <SearchAutocomplete placeholder="Tìm kiếm..." className="w-full" />
            <ul className="flex flex-col gap-0.5 list-none m-0 p-0">
              {NAV_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block px-3 py-3 rounded-lg text-sm font-medium text-[var(--sea-ink-soft)] hover:bg-[var(--chip-bg)] hover:text-[var(--sea-ink)] no-underline transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </header>
  )
}
