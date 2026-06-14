import type { Metadata } from 'next'
import Link              from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getModerationStats } from '@/features/admin/api/moderation.server'

export const metadata: Metadata = {
  title:  'Admin OS — VIO AGRI',
  robots: { index: false, follow: false },
}
export const revalidate = 60

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVnd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₫`
  return n.toLocaleString('vi-VN') + ' ₫'
}

function KpiCard({
  label, value, sub, accent,
}: {
  label:   string
  value:   string | number
  sub?:    string
  accent?: 'green' | 'amber' | 'red' | 'blue' | 'default'
}) {
  const border = {
    green:   'border-green-200  bg-green-50/60',
    amber:   'border-amber-200  bg-amber-50/60',
    red:     'border-red-200    bg-red-50/60',
    blue:    'border-blue-200   bg-blue-50/60',
    default: 'border-gray-100   bg-white',
  }[accent ?? 'default']

  const textColor = {
    green:   'text-green-700',
    amber:   'text-amber-700',
    red:     'text-red-700',
    blue:    'text-blue-700',
    default: 'text-gray-900 dark:text-white',
  }[accent ?? 'default']

  return (
    <div className={`flex flex-col gap-1 rounded-2xl border p-5 ${border}`}>
      <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        {label}
      </p>
      <p className={`m-0 text-2xl font-bold ${textColor}`}>{value}</p>
      {sub && <p className="m-0 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function NavCard({
  href, title, description, count, accent,
}: {
  href:        string
  title:       string
  description: string
  count?:      number
  accent?:     'red' | 'amber' | 'green' | 'blue'
}) {
  const dot = {
    red:   'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    blue:  'bg-blue-500',
  }[accent ?? 'blue']

  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5
                 no-underline shadow-[0_1px_4px_rgb(0,0,0,0.04)]
                 transition-shadow hover:shadow-[0_4px_16px_rgb(0,0,0,0.08)]
                 dark:border-white/[0.06] dark:bg-[#1C1C1E]"
    >
      <div className="flex items-center justify-between">
        <p className="m-0 text-[15px] font-bold text-gray-900 dark:text-white">{title}</p>
        {count !== undefined && count > 0 && (
          <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${dot}`}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
      <p className="m-0 text-[13px] text-gray-500 dark:text-gray-400">{description}</p>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const supabase  = await createAdminClient()
  const modStats  = await getModerationStats()

  // Supply counts
  const [listingStats, subStats, featuredStats, fraudStats] = await Promise.all([
    supabase
      .from('listings')
      .select('status, is_public')
      .in('status', ['published', 'draft', 'archived']),
    supabase
      .from('subscriptions')
      .select('plan_id, status')
      .eq('status', 'active'),
    supabase
      .from('featured_listings')
      .select('status')
      .eq('status', 'active'),
    supabase
      .from('fraud_signals')
      .select('id')
      .eq('status', 'open'),
  ])

  const listingRows = (listingStats.data ?? []) as { status: string; is_public: boolean }[]
  const activeListings = listingRows.filter(r => r.status === 'published' && r.is_public).length
  const draftListings  = listingRows.filter(r => r.status === 'draft').length

  const subRows  = (subStats.data ?? []) as { plan_id: string }[]
  const proCount = subRows.filter(r => r.plan_id === 'pro').length
  const mrr      = proCount * 299_000

  const featuredCount = (featuredStats.data ?? []).length
  const fraudCount    = (fraudStats.data ?? []).length

  return (
    <div className="p-6 md:p-10">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
          Admin OS
        </p>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Bảng điều hành
        </h1>
        <p className="m-0 mt-1 text-[14px] text-gray-500">VIO AGRI — Quản trị hệ thống</p>
      </div>

      {/* ── Supply KPIs ── */}
      <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        Nguồn cung
      </p>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Tin đang hoạt động" value={activeListings} sub="published + public"/>
        <KpiCard label="Tin nháp"           value={draftListings}  sub="chưa đăng"/>
        <KpiCard
          label="Chờ duyệt"
          value={modStats.pending}
          sub="cần xem xét"
          accent={modStats.pending > 0 ? 'amber' : 'default'}
        />
        <KpiCard
          label="Phát hiện gian lận"
          value={fraudCount}
          sub="tín hiệu mở"
          accent={fraudCount > 0 ? 'red' : 'default'}
        />
      </div>

      {/* ── Revenue KPIs ── */}
      <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        Doanh thu
      </p>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Người dùng Pro" value={proCount}         sub="đang hoạt động"   accent="green"/>
        <KpiCard label="MRR"            value={fmtVnd(mrr)}      sub="doanh thu tháng"  accent="green"/>
        <KpiCard label="Tin nổi bật"    value={featuredCount}    sub="slot đang chạy"/>
        <KpiCard label="Từ chối"        value={modStats.rejected} sub="tin bị từ chối"/>
      </div>

      {/* ── Navigation Grid ── */}
      <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        Quản trị
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard
          href="/admin/moderation"
          title="Hàng đợi kiểm duyệt"
          description="Duyệt, từ chối và ẩn tin đăng đang chờ"
          count={modStats.pending}
          accent="amber"
        />
        <NavCard
          href="/admin/listings"
          title="Quản lý tin đăng"
          description="Lọc, sắp xếp và hành động hàng loạt trên toàn bộ tin"
          accent="blue"
        />
        <NavCard
          href="/admin/sellers"
          title="Quản lý người bán"
          description="Xác minh danh tính, cấp Pro, đình chỉ tài khoản"
          accent="green"
        />
        <NavCard
          href="/admin/fraud"
          title="Phát hiện gian lận"
          description="Số điện thoại trùng lặp, giá bất thường, đăng tin ồ ạt"
          count={fraudCount}
          accent="red"
        />
        <NavCard
          href="/admin/payments"
          title="Thanh toán đang chờ"
          description="Xác nhận chuyển khoản và kích hoạt sản phẩm"
          accent="amber"
        />
        <NavCard
          href="/admin/revenue"
          title="Báo cáo doanh thu"
          description="MRR, featured listings, xác minh và kiểm tra pháp lý"
          accent="green"
        />
        <NavCard
          href="/admin/audit"
          title="Nhật ký kiểm tra"
          description="Toàn bộ hành động của admin theo thời gian"
          accent="blue"
        />
      </div>

      {/* ── Marketplace OS ── */}
      <p className="mb-3 mt-8 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        Marketplace OS
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard
          href="/admin/health"
          title="Sức khỏe thị trường"
          description="KPI hàng ngày, cảnh báo tự động và phân tích địa lý"
          accent="green"
        />
        <NavCard
          href="/admin/liquidity"
          title="Thanh khoản"
          description="Điểm thanh khoản tỉnh A–D, phễu chuyển đổi, cung/cầu"
          accent="blue"
        />
        <NavCard
          href="/admin/experiments"
          title="Thử nghiệm giá A/B"
          description="Kiểm thử mức giá sản phẩm theo biến thể mà không cần thay code"
          accent="amber"
        />
        <NavCard
          href="/admin/ecosystem"
          title="Hệ sinh thái VIO"
          description="Lượt nhấn sang LOCAL và EXPORT, các tin đăng dẫn nhiều nhất"
          accent="green"
        />
      </div>

      {/* ── Nav ── */}
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 no-underline hover:text-gray-600 dark:hover:text-gray-300"
        >
          ← Dashboard
        </Link>
      </div>

    </div>
  )
}
