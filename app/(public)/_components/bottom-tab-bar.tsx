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
    label: 'Khám phá',
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
    href:  '/dang-tin',
    label: 'Đăng tin',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3" y="3" width="18" height="18" rx="4"
          stroke="currentColor" strokeWidth="1.75"
        />
        <path
          d="M12 8v8M8 12h8"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href:  '/ca-nhan',
    label: 'Cá nhân',
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
