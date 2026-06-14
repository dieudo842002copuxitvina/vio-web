'use client'

import Link           from 'next/link'
import { usePathname } from 'next/navigation'

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  {
    href:  '/',
    label: 'Trang chủ',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z"
          stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"
        />
        <path
          d="M9 21v-7h6v7"
          stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href:  '/dat-nong-nghiep',
    label: 'Tìm đất',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M16.5 16.5 21 21"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href:  '/tin-da-luu',
    label: 'Đã lưu',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
          stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href:  '/quan-ly-leads',
    label: 'Tin nhắn',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href:  '/ho-so',
    label: 'Hồ sơ',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M4.5 20c0-3.59 3.358-6.5 7.5-6.5s7.5 2.91 7.5 6.5"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className={[
        // Visibility — mobile only
        'flex md:hidden',
        // Positioning
        'fixed bottom-0 inset-x-0 z-40',
        // Surface — glassmorphism
        'bg-white/90 backdrop-blur-xl',
        // Top border hairline
        'border-t border-gray-100',
        // Layout
        'flex-row items-stretch',
        // iOS safe area
        'pb-[env(safe-area-inset-bottom)]',
      ].join(' ')}
      aria-label="Điều hướng chính"
    >
      {TABS.map(({ href, label, icon }) => {
        const active = href === '/'
          ? pathname === '/'
          : pathname === href || pathname.startsWith(href + '/')

        return (
          <Link
            key={href}
            href={href}
            className={[
              // Equal-width tap targets, min 44px height (Apple HIG)
              'flex flex-1 flex-col items-center justify-center gap-1',
              'min-h-[49px] pt-2',
              // Typography
              'text-[10px] font-medium leading-none',
              // Colour
              active
                ? 'text-vio-primary'
                : 'text-gray-400',
              // Tap feedback
              'transition-colors duration-150 active:opacity-70',
              'no-underline',
            ].join(' ')}
            aria-current={active ? 'page' : undefined}
          >
            <span className={active ? 'text-vio-primary' : 'text-gray-400'}>
              {icon}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
