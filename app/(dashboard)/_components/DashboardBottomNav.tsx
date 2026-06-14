'use client'

import Link            from 'next/link'
import { usePathname } from 'next/navigation'

// ── Icons ─────────────────────────────────────────────────────────────────────

function OverviewIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3"  y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="14" y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="3"  y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function MembershipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M2 10h20M6 15h4M15 15h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

// ── Tab items ─────────────────────────────────────────────────────────────────

const TABS = [
  { href: '/dashboard',       label: 'Tổng quan', icon: <OverviewIcon />,    exact: true  },
  { href: '/tin-da-luu',      label: 'Đã lưu',    icon: <BookmarkIcon />,    exact: false },
  { href: '/tim-kiem-da-luu', label: 'Tìm kiếm',  icon: <SearchIcon />,      exact: false },
  { href: '/goi-thanh-vien',  label: 'Gói',        icon: <MembershipIcon />,  exact: false },
  { href: '/ho-so-ca-nhan',   label: 'Hồ sơ',     icon: <ProfileIcon />,     exact: false },
]

// ── DashboardBottomNav ────────────────────────────────────────────────────────

export function DashboardBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30
                 flex items-end h-[calc(3.25rem+env(safe-area-inset-bottom))]
                 border-t border-neutral-100 bg-white/95 backdrop-blur-xl"
      aria-label="Điều hướng chính"
    >
      {TABS.map(item => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex flex-1 flex-col items-center gap-0.5 no-underline',
              'pb-[env(safe-area-inset-bottom)] pt-2.5',
              active ? 'text-vio-forest' : 'text-neutral-400',
            ].join(' ')}
          >
            {item.icon}
            <span className="text-[9.5px] font-semibold">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
