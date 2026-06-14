'use client'

import type { ReactNode }  from 'react'
import Link                from 'next/link'
import { usePathname }     from 'next/navigation'
import { useShell }        from './ShellProvider'

// ── Navigation links ──────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Khám phá đất', href: '/dat-nong-nghiep' },
  { label: 'Tỉnh thành',   href: '/tinh'             },
  { label: 'Bản đồ',       href: '/ban-do'           },
] as const

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── TopNav ────────────────────────────────────────────────────────────────────
// Desktop only (hidden md:flex → visible ≥ 768px). Height: 64px (h-16).
// Transparent on homepage, frosted glass on all other routes.
//
// authSlot — a ReactNode passed from the server layout (Suspense-wrapped
// UserMenuServer). Making it optional preserves compatibility with pages that
// render TopNav directly (e.g. app/page.tsx) without passing auth.

export interface TopNavProps {
  authSlot?: ReactNode
}

export function TopNav({ authSlot }: TopNavProps) {
  const pathname       = usePathname()
  const isHome         = pathname === '/'
  const { openSearch } = useShell()

  const onDark = isHome

  return (
    <header
      className={[
        'hidden md:flex',
        'fixed inset-x-0 top-0 z-40',
        'h-16 items-center',
        onDark
          ? 'border-b border-white/10 bg-transparent'
          : 'border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-xl',
      ].join(' ')}
    >
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-1 px-8">

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <Link
          href="/"
          className="mr-5 shrink-0 no-underline"
          aria-label="VIO AGRI — Trang chủ"
        >
          <span className={[
            'text-[1.25rem] font-black tracking-[-0.03em]',
            onDark ? 'text-white' : 'text-vio-forest',
          ].join(' ')}>
            VIO
          </span>
          <span className={[
            'ml-0.5 text-[0.7rem] font-bold tracking-[0.12em]',
            onDark ? 'text-white/60' : 'text-[#86868b]',
          ].join(' ')}>
            AGRI
          </span>
        </Link>

        {/* ── Primary nav links ──────────────────────────────────────────── */}
        <nav className="flex items-center gap-0.5" aria-label="Điều hướng chính">
          {NAV_LINKS.map(link => {
            const active =
              pathname === link.href ||
              pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'whitespace-nowrap rounded-lg px-3 py-2',
                  'text-[14px] font-medium no-underline',
                  'transition-colors duration-150',
                  onDark
                    ? active
                      ? 'bg-white/10 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    : active
                      ? 'bg-vio-primary/[0.08] font-semibold text-vio-forest'
                      : 'text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]',
                ].join(' ')}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* ── Spacer ────────────────────────────────────────────────────── */}
        <div className="flex-1" aria-hidden="true" />

        {/* ── Search pill (lg+) ─────────────────────────────────────────── */}
        <button
          type="button"
          onClick={openSearch}
          aria-label="Tìm kiếm (⌘K)"
          className={[
            'hidden lg:flex items-center gap-2 rounded-full px-3.5 h-9 shrink-0',
            'text-[13px] font-medium transition-colors',
            onDark
              ? 'border border-white/20 bg-white/10 text-white/80 hover:bg-white/15'
              : 'border border-[var(--line)] bg-[var(--sand)] text-[var(--sea-ink-soft)] hover:bg-[var(--foam)]',
          ].join(' ')}
        >
          <SearchIcon size={14} />
          <span>Tìm kiếm...</span>
          <kbd className={[
            'hidden xl:inline-flex items-center rounded px-1.5 py-0.5',
            'font-mono text-[10px] leading-none',
            onDark
              ? 'bg-white/10 text-white/50'
              : 'bg-[var(--chip-bg)] text-[var(--muted)]',
          ].join(' ')}>
            ⌘K
          </kbd>
        </button>

        {/* Search icon only (md–lg, when pill is hidden) */}
        <button
          type="button"
          onClick={openSearch}
          aria-label="Tìm kiếm"
          className={[
            'flex lg:hidden h-9 w-9 items-center justify-center rounded-xl shrink-0',
            'transition-colors',
            onDark
              ? 'text-white/80 hover:bg-white/10'
              : 'text-[var(--sea-ink)] hover:bg-[var(--sand)]',
          ].join(' ')}
        >
          <SearchIcon size={18} />
        </button>

        {/* ── Gói Pro link ──────────────────────────────────────────────── */}
        <Link
          href="/pro"
          aria-current={pathname === '/pro' ? 'page' : undefined}
          className={[
            'hidden lg:block shrink-0 whitespace-nowrap rounded-lg px-3 py-2',
            'text-[14px] font-medium no-underline transition-colors',
            pathname === '/pro'
              ? onDark
                ? 'bg-white/10 text-white'
                : 'bg-vio-primary/[0.08] font-semibold text-vio-forest'
              : onDark
                ? 'text-white/80 hover:bg-white/10 hover:text-white'
                : 'text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]',
          ].join(' ')}
        >
          Gói Pro
        </Link>

        {/* ── Đăng tin CTA ──────────────────────────────────────────────── */}
        <Link
          href="/dashboard/tin-dang/moi"
          className={[
            'ml-1 shrink-0 whitespace-nowrap rounded-full px-5 py-2',
            'text-[14px] font-bold no-underline',
            'transition-all hover:opacity-90 active:scale-[0.97]',
            onDark
              ? 'bg-white text-vio-forest'
              : 'bg-vio-forest text-white',
          ].join(' ')}
        >
          Đăng tin
        </Link>

        {/* ── User menu slot (server-rendered, Suspense-wrapped) ─────────── */}
        {authSlot && (
          <div className="ml-1 shrink-0">
            {authSlot}
          </div>
        )}

      </div>
    </header>
  )
}
