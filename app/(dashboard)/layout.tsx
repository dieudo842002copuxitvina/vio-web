import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from './_components/nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')

  const displayName = user.user_metadata?.full_name
    ?? user.email?.split('@')[0]
    ?? 'Admin'

  return (
    <div className="flex min-h-screen">

      {/* ── Mobile header (hamburger) ─────────────────────────────────────── */}
      {/* Desktop sidebar replaces this — hidden md:hidden means always hidden
          on desktop; on mobile it provides the top brand + placeholder menu   */}
      <header
        className={[
          'md:hidden',
          'fixed top-0 inset-x-0 z-40',
          'flex h-14 items-center justify-between px-4',
          'bg-white border-b border-gray-100',
        ].join(' ')}
      >
        {/* Brand */}
        <p className="m-0 text-base font-bold tracking-tight text-gray-900">
          VIO AGRI
        </p>

        {/* Hamburger — visual only; full drawer is a future enhancement */}
        <button
          type="button"
          aria-label="Mở menu điều hướng"
          className={[
            'flex h-10 w-10 items-center justify-center',
            'rounded-xl text-gray-500',
            'transition-colors hover:bg-gray-100 active:bg-gray-200',
          ].join(' ')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <rect x="2" y="4.5"  width="16" height="1.75" rx="0.875" />
            <rect x="2" y="9.125" width="16" height="1.75" rx="0.875" />
            <rect x="2" y="13.75" width="16" height="1.75" rx="0.875" />
          </svg>
        </button>
      </header>

      {/* ── Sidebar (desktop only) ────────────────────────────────────────── */}
      <aside
        className={[
          'hidden md:flex',
          'w-64 shrink-0 flex-col',
          'border-r border-gray-100 bg-white',
          'dark:border-white/[0.06] dark:bg-[#1C1C1E]',
        ].join(' ')}
      >
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto p-4">

          {/* Logo */}
          <div className="mb-6 px-3 pt-4">
            <p className="m-0 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              VIO AGRI
            </p>
            <p className="m-0 text-xs text-gray-400 dark:text-gray-500">
              Quản trị hệ thống
            </p>
          </div>

          {/* Nav */}
          <DashboardNav />

          {/* Spacer */}
          <div className="flex-1" />

          {/* User chip */}
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.04]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {displayName[0].toUpperCase()}
            </div>
            <p className="m-0 min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
              {displayName}
            </p>
          </div>

        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      {/* pt-14: clears mobile header on small screens */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50 pt-14 md:pt-0 dark:bg-black">
        {children}
      </main>

    </div>
  )
}
