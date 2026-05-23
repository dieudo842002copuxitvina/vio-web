'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SearchAutocomplete } from '@/components/search-autocomplete'

const NAV_LINKS = [
  { href: '/',                label: 'Khám phá' },
  { href: '/dat-nong-nghiep', label: 'Đất nông nghiệp' },
  { href: '/dang-nhap',       label: 'Đăng nhập' },
]

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.07] dark:border-white/[0.09] bg-white/75 dark:bg-black/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75 dark:supports-[backdrop-filter]:bg-black/75">
      <div className="page-wrap flex items-center h-14 gap-3">

        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 text-[1.0625rem] font-bold tracking-tight text-[var(--sea-ink)] no-underline select-none"
        >
          VIO<span className="text-[var(--lagoon)]">.</span>LOCAL
        </Link>

        {/* Desktop: search pill + nav */}
        <div className="hidden md:flex ml-auto items-center gap-3">
          <SearchAutocomplete
            compact
            placeholder="Tìm kiếm..."
            className="w-56"
          />
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-lg text-[0.875rem] font-medium text-[var(--sea-ink-soft)] no-underline hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-[var(--sea-ink)] transition-colors duration-100 whitespace-nowrap"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile: hamburger */}
        <button
          className="md:hidden ml-auto flex items-center justify-center w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] text-[var(--sea-ink-soft)] transition-colors hover:bg-black/[0.09]"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
        >
          {open ? (
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M2 2l11 11M13 2L2 13" />
            </svg>
          ) : (
            <svg width="16" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M0 1h16M0 6h16M0 11h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav
          className="md:hidden border-t border-black/[0.07] dark:border-white/[0.09] bg-white/90 dark:bg-black/90 backdrop-blur-xl"
          aria-label="Mobile navigation"
        >
          <div className="page-wrap px-2 py-3 flex flex-col gap-1.5">
            <SearchAutocomplete placeholder="Tìm kiếm..." className="w-full" />
            <ul className="flex flex-col gap-0.5 list-none m-0 p-0 pt-1">
              {NAV_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-center px-3 py-2.5 rounded-xl text-[0.9375rem] font-medium text-[var(--sea-ink-soft)] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-[var(--sea-ink)] no-underline transition-colors"
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
