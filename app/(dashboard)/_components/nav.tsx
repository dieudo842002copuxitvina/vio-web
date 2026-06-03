'use client'

import Link            from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',              label: 'Tổng quan',     icon: '◼', exact: true  },
  { href: '/phan-tich',              label: 'Phân tích',     icon: '📊', exact: false },
  { href: '/quan-ly-leads',          label: 'CRM Leads',     icon: '👥', exact: true  },
  { href: '/quan-ly-leads/tin-hieu', label: 'Tín hiệu Lead', icon: '⚡', exact: false },
  { href: '/dang-tin',               label: 'Đăng tin BĐS',  icon: '🏷', exact: false },
] as const

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium no-underline transition-colors',
              active
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white',
            ].join(' ')}
          >
            <span className="text-base leading-none" aria-hidden="true">{icon}</span>
            {label}
          </Link>
        )
      })}

      {/* Upgrade CTA — always visible at the bottom of nav */}
      <Link
        href="/nang-cap"
        className={[
          'mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium no-underline transition-colors',
          pathname.startsWith('/nang-cap') || pathname === '/pricing'
            ? 'bg-[#0071E3] text-white'
            : 'bg-[#0071E3]/10 text-[#0071E3] hover:bg-[#0071E3]/15 dark:text-[#409CFF] dark:bg-[#409CFF]/10 dark:hover:bg-[#409CFF]/15',
        ].join(' ')}
      >
        <span className="text-base leading-none" aria-hidden="true">⭐</span>
        Nâng cấp Pro
      </Link>
    </nav>
  )
}
