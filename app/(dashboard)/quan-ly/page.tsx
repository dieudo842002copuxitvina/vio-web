import type { Metadata }       from 'next'
import Link                       from 'next/link'
import {
  getMerchantMetrics,
  getNotifications,
  getListingPerformances,
} from '@/features/merchant/api/merchant.server'
import type {
  MerchantMetrics,
  ListingPerformance,
} from '@/features/merchant/api/merchant.server'
import { createClient }           from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Tổng quan' }
export const revalidate = 0

// ── Tier config ───────────────────────────────────────────────────────────────

const TIER_LABEL: Record<string, string> = {
  top:     'Top',
  good:    'Tốt',
  average: 'Trung bình',
  low:     'Yếu',
  new:     'Mới',
}

const TIER_COLOR: Record<string, string> = {
  top:     'text-emerald-600 dark:text-emerald-400',
  good:    'text-blue-600   dark:text-blue-400',
  average: 'text-amber-600  dark:text-amber-400',
  low:     'text-red-600    dark:text-red-400',
  new:     'text-gray-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPct(v: number) { return `${(v * 100).toFixed(1)}%` }
function fmtNum(v: number) { return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v) }

function TrustRing({ score }: { score: number }) {
  const r        = 28
  const circ     = 2 * Math.PI * r
  const dash     = circ * Math.min(score / 100, 1)
  const color    = score >= 75 ? '#34C759'
                 : score >= 50 ? '#FF9500'
                 : '#FF3B30'
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="rotate-[-90deg]">
      <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor"
        className="text-gray-100 dark:text-white/[0.06]" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.4s ease' }} />
      <text x="40" y="40" textAnchor="middle" dominantBaseline="central"
        className="fill-gray-900 dark:fill-white"
        style={{ fontSize: 18, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '40px 40px' }}>
        {score}
      </text>
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent = false,
}: {
  label: string
  value: string | number
  sub?:  string
  accent?: boolean
}) {
  return (
    <div className={[
      'flex flex-col gap-1 rounded-2xl border p-5',
      accent
        ? 'border-[#0071E3]/20 bg-[#0071E3]/5 dark:border-[#409CFF]/20 dark:bg-[#409CFF]/10'
        : 'border-gray-100 bg-white shadow-[0_1px_4px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]',
    ].join(' ')}>
      <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        {label}
      </p>
      <p className="m-0 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
      {sub && (
        <p className="m-0 text-xs text-gray-400">{sub}</p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function QuanLyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-center text-gray-500">
        Vui lòng đăng nhập để xem tổng quan.
      </div>
    )
  }

  const [metrics, { notifications, unreadCount }, { items: listings }] = await Promise.all([
    getMerchantMetrics(user.id),
    getNotifications(user.id, { limit: 5 }),
    getListingPerformances(user.id, 5),
  ])

  const m = metrics

  return (
    <main className="p-6 md:p-10">

      {/* ── Header ── */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Dashboard
          </p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Tổng quan
          </h1>
        </div>
        {unreadCount > 0 && (
          <Link
            href="/quan-ly-thong-bao"
            className="flex items-center gap-2 rounded-full bg-[#0071E3] px-4 py-1.5 text-sm font-semibold text-white no-underline shadow-sm hover:bg-[#0077ED]"
          >
            <span>{unreadCount} thông báo mới</span>
          </Link>
        )}
      </div>

      {/* ── Trust + overview ── */}
      {m ? (
        <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-stretch">

          {/* Trust score ring */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_4px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E] lg:w-44">
            <TrustRing score={Math.round(m.trust_score)} />
            <p className="m-0 text-center text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
              Điểm tin cậy
            </p>
          </div>

          {/* KPI grid */}
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="Tin đang đăng"
              value={m.active_listings}
              sub={`/ ${m.total_listings} tổng`}
              accent
            />
            <StatCard
              label="Lượt xem 7 ngày"
              value={fmtNum(m.impressions_7d)}
              sub={`CTR ${fmtPct(m.ctr_7d)}`}
            />
            <StatCard
              label="Yêu cầu 7 ngày"
              value={m.inquiries_7d}
              sub={`Tỷ lệ ${fmtPct(m.inquiry_rate_7d)}`}
            />
            <StatCard
              label="Leads đang xử lý"
              value={m.leads_active}
              sub={`${m.leads_won_30d} chốt / 30 ngày`}
            />
            <StatCard
              label="Tỷ lệ phản hồi"
              value={fmtPct(m.response_rate_7d)}
              sub={m.avg_response_hours > 0 ? `Tb ${m.avg_response_hours.toFixed(1)}h` : undefined}
            />
            <StatCard
              label="Tỷ lệ chuyển đổi"
              value={fmtPct(m.conversion_rate)}
              sub="leads → thành công"
            />
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400 dark:border-white/[0.08]">
          Chỉ số sẽ xuất hiện sau khi hệ thống thu thập đủ dữ liệu (thường sau 24 giờ hoạt động).
        </div>
      )}

      {/* ── Two-column lower section ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Listing performance */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-base font-bold text-gray-900 dark:text-white">
              Hiệu quả tin đăng
            </h2>
            <Link
              href="/quan-ly-tin-dang"
              className="text-xs font-semibold text-[#0071E3] no-underline hover:underline dark:text-[#409CFF]"
            >
              Xem tất cả
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 dark:border-white/[0.08]">
              Chưa có tin đăng nào.{' '}
              <Link href="/dang-tin" className="font-semibold text-[#0071E3] no-underline hover:underline dark:text-[#409CFF]">
                Đăng tin ngay
              </Link>
            </div>
          ) : (
            <ul className="m-0 list-none space-y-3 p-0">
              {listings.map((l: ListingPerformance) => (
                <li key={l.listing_id}>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_4px_rgb(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dat-nong-nghiep/chi-tiet/${l.listing_slug}`}
                        className="block truncate text-sm font-semibold text-gray-900 no-underline hover:underline dark:text-white"
                      >
                        {l.listing_title ?? l.listing_id}
                      </Link>
                      <p className="m-0 mt-0.5 text-xs text-gray-400">
                        {fmtNum(l.impressions_7d)} lượt xem · {l.inquiries_7d} yêu cầu · CTR {fmtPct(l.ctr_7d)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold ${TIER_COLOR[l.performance_tier] ?? 'text-gray-400'}`}>
                      {TIER_LABEL[l.performance_tier] ?? l.performance_tier}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent notifications */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-base font-bold text-gray-900 dark:text-white">
              Thông báo gần đây
            </h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400 dark:border-white/[0.08]">
              Chưa có thông báo nào.
            </div>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {notifications.map(n => (
                <li key={n.id}>
                  <div className={[
                    'rounded-2xl border px-4 py-3',
                    !n.is_read
                      ? 'border-[#0071E3]/20 bg-[#0071E3]/5 dark:border-[#409CFF]/20 dark:bg-[#409CFF]/10'
                      : 'border-gray-100 bg-white shadow-[0_1px_4px_rgb(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-[#1C1C1E]',
                  ].join(' ')}>
                    <p className="m-0 text-sm font-semibold text-gray-900 dark:text-white">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="m-0 mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                        {n.body}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>

      {/* ── Quick actions ── */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: '/dang-tin',        label: 'Đăng tin mới' },
          { href: '/quan-ly-leads',   label: 'Xem Leads' },
          { href: '/quan-ly-tin-dang', label: 'Quản lý tin' },
          { href: '/ho-so',           label: 'Hồ sơ' },
        ].map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 no-underline shadow-[0_1px_4px_rgb(0,0,0,0.04)] transition-colors hover:border-gray-200 hover:bg-gray-50 dark:border-white/[0.06] dark:bg-[#1C1C1E] dark:text-gray-200 dark:hover:border-white/[0.1] dark:hover:bg-[#2C2C2E]"
          >
            {a.label}
          </Link>
        ))}
      </div>

    </main>
  )
}
