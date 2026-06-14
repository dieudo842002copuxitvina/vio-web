import type { Metadata }        from 'next'
import Link                      from 'next/link'
import { createClient }          from '@/lib/supabase/server'
import { getActiveSubscription } from '@/features/billing/api/subscription.server'

export const metadata: Metadata = { title: 'Tổng quan — VIO AGRI' }
export const revalidate = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function initials(name: string): string {
  return name.split(' ').slice(-2).map(w => w[0] ?? '').join('').toUpperCase() || '?'
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  href, label, value, sub, icon, accent,
}: {
  href:    string
  label:   string
  value:   string | number
  sub?:    string
  icon:    React.ReactNode
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className={[
        'group flex flex-col gap-4 rounded-[20px] border bg-white p-5 no-underline',
        'shadow-[0_1px_4px_rgba(0,0,0,0.04)]',
        'transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
        accent ? 'border-vio-forest/20' : 'border-neutral-100',
      ].join(' ')}
    >
      <div className={[
        'flex h-10 w-10 items-center justify-center rounded-2xl',
        accent ? 'bg-vio-forest/8 text-vio-forest' : 'bg-neutral-100 text-neutral-400',
      ].join(' ')}>
        {icon}
      </div>
      <div>
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          {label}
        </p>
        <p className={[
          'm-0 mt-1 text-[26px] font-black leading-none tracking-tight',
          accent ? 'text-vio-forest' : 'text-[#1d1d1f]',
        ].join(' ')}>
          {value}
        </p>
        {sub && (
          <p className="m-0 mt-1 text-[12px] text-neutral-400">{sub}</p>
        )}
      </div>
    </Link>
  )
}

// ── Quick link row ────────────────────────────────────────────────────────────

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white
                 px-4 py-3 no-underline shadow-[0_1px_3px_rgba(0,0,0,0.03)]
                 transition-colors hover:border-neutral-200 hover:bg-neutral-50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                       bg-neutral-100 text-neutral-400">
        {icon}
      </span>
      <span className="text-[14px] font-semibold text-[#1d1d1f]">{label}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="ml-auto text-neutral-300">
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Bạn'

  // Parallel data fetches
  const [subscription, savedRes, searchRes] = await Promise.all([
    getActiveSubscription(user.id),
    supabase
      .from('listing_saves')
      .select('listing_id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const isPro          = subscription?.plan_id === 'pro' && subscription?.status === 'active'
  const savedCount     = savedRes.count ?? 0
  const searchCount    = searchRes.count ?? 0
  const renewDate      = subscription?.current_period_end ?? null

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 sm:py-10">

      {/* ── Greeting ─────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center gap-4">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                        bg-vio-forest text-[14px] font-bold text-white">
          {initials(displayName)}
        </div>
        <div>
          <p className="m-0 text-[12px] font-semibold text-neutral-400">Tổng quan</p>
          <h1 className="m-0 text-[22px] font-black leading-tight tracking-tight text-[#1d1d1f]">
            {displayName}
          </h1>
        </div>
        <div className="ml-auto">
          {isPro ? (
            <span className="rounded-full border border-vio-forest/20 bg-vio-forest/8
                             px-3 py-1 text-[11px] font-bold text-vio-forest">
              Pro
            </span>
          ) : (
            <Link
              href="/goi-thanh-vien"
              className="rounded-full border border-neutral-200 bg-white
                         px-3 py-1 text-[11px] font-semibold text-neutral-500
                         no-underline shadow-[0_1px_2px_rgba(0,0,0,0.04)]
                         transition-colors hover:border-neutral-300"
            >
              Free
            </Link>
          )}
        </div>
      </div>

      {/* ── 4 Stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">

        <StatCard
          href="/tin-da-luu"
          label="Tin đã lưu"
          value={savedCount}
          sub={savedCount === 0 ? 'Chưa có tin nào' : 'mảnh đất đang theo dõi'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          }
        />

        <StatCard
          href="/tim-kiem-da-luu"
          label="Tìm kiếm đã lưu"
          value={searchCount}
          sub={searchCount === 0 ? 'Chưa có bộ lọc' : 'bộ lọc đang lưu'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <circle cx="10" cy="10" r="7"/>
              <path d="M15.5 15.5 21 21"/>
            </svg>
          }
        />

        <StatCard
          href="/dashboard"
          label="Thông báo mới"
          value={0}
          sub="Không có thông báo"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          }
        />

        <StatCard
          href="/goi-thanh-vien"
          label={isPro ? 'Gia hạn Pro' : 'Gói thành viên'}
          value={isPro ? fmtDate(renewDate) : 'Free'}
          sub={isPro ? 'ngày hết hạn' : 'Nâng cấp để xem liên hệ'}
          accent={isPro}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="2" y="6" width="20" height="14" rx="2.5"/>
              <path d="M2 10h20" strokeLinecap="round"/>
              <path d="M6 15h4M15 15h3" strokeLinecap="round"/>
            </svg>
          }
        />

      </div>

      {/* ── Quick links ───────────────────────────────────────────── */}
      <div className="mt-8 space-y-2">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          Khám phá
        </p>

        <QuickLink
          href="/tim-kiem"
          label="Tìm đất nông nghiệp"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <circle cx="10" cy="10" r="7"/>
              <path d="M15.5 15.5 21 21"/>
            </svg>
          }
        />

        <QuickLink
          href="/tin-da-luu"
          label="Đất đã lưu"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          }
        />

        <QuickLink
          href="/ho-so-ca-nhan"
          label="Chỉnh sửa hồ sơ"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/>
            </svg>
          }
        />

      </div>

      {/* ── Pro upgrade ───────────────────────────────────────────── */}
      {!isPro && (
        <div className="mt-6 flex items-center gap-4 rounded-[20px] border border-neutral-100
                        bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[14px] font-bold text-[#1d1d1f]">Nâng cấp Pro</p>
            <p className="m-0 mt-0.5 text-[12px] text-neutral-400">
              Xem liên hệ, theo dõi giá và dữ liệu thị trường.
            </p>
          </div>
          <Link
            href="/goi-thanh-vien"
            className="shrink-0 rounded-full bg-vio-forest px-4 py-2 text-[13px] font-bold
                       text-white no-underline transition-opacity hover:opacity-90"
          >
            Xem gói
          </Link>
        </div>
      )}

    </div>
  )
}
