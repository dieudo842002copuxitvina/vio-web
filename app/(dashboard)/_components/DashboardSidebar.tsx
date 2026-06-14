'use client'

import Link            from 'next/link'
import { usePathname } from 'next/navigation'
import { logout }      from '@/features/auth/api/auth.server'

// ── Icons ─────────────────────────────────────────────────────────────────────

function OverviewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3"  y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="14" y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="3"  y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function ListingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function AnalyticsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 20V14M8 20V9M13 20V12M18 20V4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function LeadsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9"  cy="7"  r="4"  stroke="currentColor" strokeWidth="1.75"/>
      <path d="M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M16 11l2 2 4-4"  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function MembershipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M2 10h20M6 15h4M15 15h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function PromoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 11l19-9-9 19-2-8-8-2z" stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function MarketplaceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9l9-6 9 6v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
      <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Nav structure ──────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { label: 'Tổng quan',         href: '/dashboard',       icon: <OverviewIcon />,    exact: true  },
      { label: 'Tin đã lưu',        href: '/tin-da-luu',      icon: <BookmarkIcon />,    exact: false },
      { label: 'Tìm kiếm đã lưu',  href: '/tim-kiem-da-luu', icon: <SearchIcon />,      exact: false },
    ],
  },
  {
    label: 'Người bán',
    items: [
      { label: 'Tin đăng',          href: '/tin-dang-cua-toi',   icon: <ListingsIcon />,  exact: false },
      { label: 'Phân tích',         href: '/phan-tich',          icon: <AnalyticsIcon />, exact: false },
      { label: 'Quản lý leads',     href: '/quan-ly-leads',      icon: <LeadsIcon />,     exact: false },
      { label: 'Lịch hẹn',         href: '/quan-ly-lich-hen',   icon: <CalendarIcon />,  exact: false },
      { label: 'Xúc tiến tin',      href: '/xuc-tien-tin-dang',  icon: <PromoteIcon />,     exact: false },
      { label: 'Thị trường',        href: '/marketplace',         icon: <MarketplaceIcon />, exact: false },
    ],
  },
  {
    label: 'Tài khoản',
    items: [
      { label: 'Gói thành viên',    href: '/goi-thanh-vien',  icon: <MembershipIcon />,  exact: false },
      { label: 'Hồ sơ',             href: '/ho-so-ca-nhan',   icon: <ProfileIcon />,     exact: false },
    ],
  },
]

// ── DashboardSidebar ──────────────────────────────────────────────────────────

export interface DashboardSidebarProps {
  displayName: string
  email:       string
  isPro:       boolean
}

export function DashboardSidebar({ displayName, email, isPro }: DashboardSidebarProps) {
  const pathname = usePathname()

  function initials(name: string) {
    return name.split(' ').slice(-2).map(w => w[0] ?? '').join('').toUpperCase() || '?'
  }

  function isActive(href: string, exact: boolean) {
    return exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-neutral-100 bg-white">
      <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">

        {/* ── Logo ───────────────────────────────────────────────────── */}
        <div className="px-5 pb-2 pt-6">
          <Link href="/dashboard" className="block no-underline" aria-label="VIO AGRI">
            <span className="text-[17px] font-black tracking-[-0.03em] text-vio-forest">VIO</span>
            <span className="ml-0.5 text-[10px] font-bold tracking-[0.1em] text-neutral-400"> AGRI</span>
          </Link>
        </div>

        {/* ── Post listing CTA ───────────────────────────────────────── */}
        <div className="mt-4 px-3">
          <Link
            href="/dang-tin-dat"
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl
                       bg-vio-forest py-2.5 text-[13px] font-bold text-white no-underline
                       transition-opacity hover:opacity-90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Đăng tin mới
          </Link>
        </div>

        {/* ── Nav groups ────────────────────────────────────────────── */}
        <nav className="mt-4 flex flex-col gap-4 px-3" aria-label="Điều hướng">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map(item => {
                  const active = isActive(item.href, item.exact)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium no-underline',
                        'transition-colors duration-150',
                        active
                          ? 'bg-[#F0F7F1] font-semibold text-vio-forest'
                          : 'text-neutral-500 hover:bg-neutral-50 hover:text-[#1d1d1f]',
                      ].join(' ')}
                    >
                      <span className={active ? 'text-vio-forest' : 'text-neutral-400'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex-1"/>

        {/* ── Pro upgrade nudge (free users only) ───────────────────── */}
        {!isPro && (
          <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-gray-900 px-4 py-4">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-white/40">
              Pro
            </p>
            <p className="m-0 mt-1 text-[13px] font-semibold text-white/90 leading-snug">
              Mở khoá leads nóng, spotlight & phân tích đầy đủ
            </p>
            <Link
              href="/nang-cap?reason=sidebar"
              className="mt-3 flex h-8 w-full items-center justify-center rounded-xl
                         bg-white text-[12px] font-bold text-gray-900 no-underline
                         transition-opacity hover:opacity-90"
            >
              Nâng cấp Pro →
            </Link>
          </div>
        )}

        {/* ── User chip + logout ─────────────────────────────────────── */}
        <div className="border-t border-neutral-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                            bg-vio-forest text-[11px] font-bold text-white" aria-hidden="true">
              {initials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[13px] font-semibold text-[#1d1d1f]">{displayName}</p>
              <p className="m-0 mt-0.5 truncate text-[11px] text-neutral-400">
                {isPro ? (
                  <span className="font-semibold text-vio-forest">Pro</span>
                ) : (
                  <span>{email}</span>
                )}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Đăng xuất"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400
                           transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </form>
          </div>
        </div>

      </div>
    </aside>
  )
}
