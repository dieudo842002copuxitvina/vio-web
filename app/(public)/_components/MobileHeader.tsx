'use client'

import type { ReactNode } from 'react'
import { useState }      from 'react'
import Link              from 'next/link'
import { usePathname }   from 'next/navigation'
import { useShell }      from './ShellProvider'
import { MobileDrawer }  from './MobileDrawer'

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── MobileHeader ──────────────────────────────────────────────────────────────
// Shown only on mobile (md:hidden). Height: 56px (h-14).
// Transparent on homepage, frosted glass on all other routes.

export interface MobileHeaderProps {
  authSlot: ReactNode
}

export function MobileHeader({ authSlot }: MobileHeaderProps) {
  const pathname       = usePathname()
  const isHome         = pathname === '/'
  const { openSearch } = useShell()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const onDark = isHome

  return (
    <>
      <header
        className={[
          'flex md:hidden',
          'fixed inset-x-0 top-0 z-40',
          'h-14 items-center px-4',
          onDark
            ? 'border-b border-white/10 bg-transparent'
            : 'border-b border-[var(--line)] bg-[var(--surface-strong)] backdrop-blur-xl',
        ].join(' ')}
      >
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 no-underline"
          aria-label="VIO AGRI — Trang chủ"
        >
          <span className={[
            'text-[1.125rem] font-black tracking-[-0.03em]',
            onDark ? 'text-white' : 'text-vio-forest',
          ].join(' ')}>
            VIO
          </span>
          <span className={[
            'ml-0.5 text-[0.65rem] font-bold tracking-[0.12em]',
            onDark ? 'text-white/60' : 'text-[#86868b]',
          ].join(' ')}>
            AGRI
          </span>
        </Link>

        {/* Push icons to right */}
        <div className="flex-1" aria-hidden="true" />

        {/* Search icon */}
        <button
          type="button"
          onClick={openSearch}
          aria-label="Mở tìm kiếm"
          className={[
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            onDark
              ? 'text-white/80 hover:bg-white/10'
              : 'text-[var(--sea-ink)] hover:bg-[var(--sand)]',
          ].join(' ')}
        >
          <SearchIcon />
        </button>

        {/* Menu / hamburger */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Mở menu điều hướng"
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          className={[
            'ml-1 flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            onDark
              ? 'text-white/80 hover:bg-white/10'
              : 'text-[var(--sea-ink)] hover:bg-[var(--sand)]',
          ].join(' ')}
        >
          <MenuIcon />
        </button>
      </header>

      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        authSlot={authSlot}
      />
    </>
  )
}
