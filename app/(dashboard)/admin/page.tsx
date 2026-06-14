import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { getBillingMetrics } from '@/features/billing/api/subscription.server'

export const metadata: Metadata = { title: 'Admin — Billing Metrics' }
export const revalidate = 0

function fmtVnd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₫`
  return n.toLocaleString('vi-VN') + ' ₫'
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function MetricCard({
  label, value, sub,
}: {
  label: string
  value: string
  sub?:  string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">
      <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        {label}
      </p>
      <p className="m-0 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
      {sub && <p className="m-0 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-center text-gray-500">
        Vui lòng đăng nhập.
      </div>
    )
  }

  const metrics = await getBillingMetrics()

  return (
    <div className="p-6 md:p-10">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
          Admin
        </p>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Billing Metrics
        </h1>
      </div>

      {/* ── KPI Grid ── */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          label="Free Users"
          value={String(metrics.totalFreeUsers)}
          sub="gói miễn phí"
        />
        <MetricCard
          label="Pro Users"
          value={String(metrics.totalProUsers)}
          sub="đang hoạt động"
        />
        <MetricCard
          label="MRR"
          value={fmtVnd(metrics.mrrVnd)}
          sub="doanh thu hàng tháng"
        />
        <MetricCard
          label="Featured Active"
          value={String(metrics.featuredListingsActive)}
          sub="tin đang nổi bật"
        />
        <MetricCard
          label="Conversion"
          value={fmtPct(metrics.conversionRate)}
          sub="Free → Pro"
        />
      </div>

      {/* ── Admin Actions (documentation) ── */}
      <section className="rounded-2xl border border-dashed border-gray-200 p-6 dark:border-white/[0.08]">
        <h2 className="m-0 mb-4 text-base font-bold text-gray-900 dark:text-white">
          Admin Actions
        </h2>
        <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
          <p className="m-0">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.06]">
              grantPro(profileId, adminId, durationDays?)
            </code>{' '}
            — Kích hoạt Pro cho user (không giới hạn thời gian nếu bỏ qua duration).
          </p>
          <p className="m-0">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.06]">
              revokePro(profileId)
            </code>{' '}
            — Huỷ Pro, hạ xuống Free ngay lập tức.
          </p>
          <p className="m-0">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.06]">
              activateFeaturedListing(listingId, merchantId, priority, days?)
            </code>{' '}
            — Bật Featured Listing với điểm ưu tiên.
          </p>
          <p className="m-0">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.06]">
              deactivateFeaturedListing(listingId)
            </code>{' '}
            — Tắt Featured Listing.
          </p>
          <p className="m-0 pt-2 text-xs text-gray-400">
            Tất cả actions trong{' '}
            <code className="rounded bg-gray-100 px-1 font-mono dark:bg-white/[0.06]">
              features/billing/api/admin.server.ts
            </code>
            {' '}dùng service-role client, có thể gọi từ Server Action hoặc API Route.
          </p>
        </div>
      </section>

      {/* ── Nav ── */}
      <div className="mt-6">
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
