'use client'

import Link        from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Tổng quan',     icon: '◼' },
  { href: '/quan-ly-leads', label: 'Quản lý Leads', icon: '👥' },
  { href: '/dang-tin',      label: 'Đăng tin BĐS',  icon: '🏷' },
] as const

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
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
    </nav>
  )
}
