import { redirect }   from 'next/navigation'
import type { Metadata } from 'next'
import Link             from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard' }

const QUICK_ACTIONS = [
  {
    href:     '/dashboard/storefronts/new',
    emoji:    '🏪',
    title:    'Thêm cửa hàng mới',
    subtitle: 'Tạo hồ sơ hộ kinh doanh của bạn',
  },
  {
    href:     '/dashboard/listings/new',
    emoji:    '🌾',
    title:    'Đăng tin đất nông nghiệp',
    subtitle: 'Mua, bán hoặc cho thuê đất',
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // proxy.ts redirects unauthenticated requests — safety net only
  if (!user) redirect('/?next=/dashboard')

  const displayName = user.user_metadata?.full_name
    ?? user.email?.split('@')[0]
    ?? 'bạn'

  return (
    <main className="page-wrap py-10">

      {/* Welcome header */}
      <header className="mb-10">
        <p className="island-kicker mb-1.5">Dashboard</p>
        <h1
          className="display-title font-bold text-[var(--sea-ink)] m-0"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}
        >
          Xin chào, {displayName}!
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{user.email}</p>
      </header>

      {/* Quick actions */}
      <section aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-4"
        >
          Thao tác nhanh
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg list-none m-0 p-0">
          {QUICK_ACTIONS.map(a => (
            <li key={a.href}>
              <Link
                href={a.href}
                className="island-shell rounded-xl p-5 no-underline flex flex-col gap-2.5 h-full transition-[box-shadow] duration-150 hover:shadow-md"
              >
                <span className="text-3xl leading-none" aria-hidden="true">{a.emoji}</span>
                <div>
                  <p className="m-0 font-semibold text-[var(--sea-ink)] text-[0.9375rem]">{a.title}</p>
                  <p className="m-0 text-xs text-[var(--muted)] mt-0.5 leading-relaxed">{a.subtitle}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Divider */}
      <div className="my-10 h-px bg-[var(--line)]" />

      {/* Account */}
      <section aria-labelledby="account-heading" className="max-w-lg">
        <h2
          id="account-heading"
          className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-4"
        >
          Tài khoản
        </h2>
        <div className="island-shell rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 font-medium text-sm text-[var(--sea-ink)] truncate">{user.email}</p>
            <p className="m-0 text-xs text-[var(--muted)] mt-0.5">
              Tham gia từ {new Date(user.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="btn-secondary text-xs px-3 py-1.5 min-h-0 h-auto"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </section>

    </main>
  )
}
