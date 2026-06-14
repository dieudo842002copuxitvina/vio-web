import type { Metadata }     from 'next'
import Link                   from 'next/link'
import { getRevenueStats, getPaymentRequests } from '@/features/billing/api/transactions.server'
import { PRODUCT_CATALOG } from '@/features/billing/api/billing-constants'

export const metadata: Metadata = {
  title:  'Doanh thu — Admin VIO AGRI',
  robots: { index: false, follow: false },
}
export const revalidate = 300

function fmtVnd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₫`
  return n.toLocaleString('vi-VN') + ' ₫'
}

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: 'green' | 'blue' | 'amber'
}) {
  const colors = {
    green: 'border-green-200 bg-green-50/60',
    blue:  'border-blue-200  bg-blue-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
  }[accent ?? 'green']

  const text = {
    green: 'text-green-700',
    blue:  'text-blue-700',
    amber: 'text-amber-700',
  }[accent ?? 'green']

  return (
    <div className={`flex flex-col gap-1 rounded-2xl border p-5 ${colors}`}>
      <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">{label}</p>
      <p className={`m-0 text-2xl font-bold ${text}`}>{value}</p>
      {sub && <p className="m-0 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default async function AdminRevenuePage() {
  const [stats, { items: recentPayments }] = await Promise.all([
    getRevenueStats(),
    getPaymentRequests('completed', 1, 20),
  ])

  const productRevenue = Object.entries(stats.by_product_type)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="p-6 md:p-10">

      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 no-underline hover:text-gray-600"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Admin OS
        </Link>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Báo cáo doanh thu
        </h1>
      </div>

      {/* ── KPIs ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Tổng doanh thu"
          value={fmtVnd(stats.total_completed_vnd)}
          sub="tất cả thời gian"
          accent="green"
        />
        <KpiCard
          label="MRR (Pro)"
          value={fmtVnd(stats.mrr_vnd)}
          sub="doanh thu tháng hiện tại"
          accent="green"
        />
        <KpiCard
          label="Chờ xác nhận"
          value={String(stats.pending_confirm_count)}
          sub="cần admin duyệt"
          accent="amber"
        />
        <KpiCard
          label="Chờ thanh toán"
          value={String(stats.pending_count)}
          sub="đã tạo yêu cầu"
          accent="blue"
        />
      </div>

      {/* ── Revenue by product ── */}
      <section className="mb-10">
        <h2 className="m-0 mb-4 text-[17px] font-bold text-gray-900 dark:text-white">
          Doanh thu theo sản phẩm
        </h2>
        {productRevenue.length === 0 ? (
          <p className="text-[13px] text-gray-400">Chưa có doanh thu.</p>
        ) : (
          <div className="space-y-2">
            {productRevenue.map(([type, amount]) => {
              const label = PRODUCT_CATALOG[type as keyof typeof PRODUCT_CATALOG]?.label ?? type
              const pct   = stats.total_completed_vnd > 0
                ? Math.round((amount / stats.total_completed_vnd) * 100)
                : 0
              return (
                <div key={type} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/[0.06] dark:bg-[#1C1C1E]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="m-0 text-[13px] font-semibold text-gray-900 dark:text-white">{label}</p>
                      <p className="m-0 text-[13px] font-bold text-gray-900 dark:text-white">{fmtVnd(amount)}</p>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-vio-forest"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-[12px] text-gray-400">{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Recent completed transactions ── */}
      <section>
        <h2 className="m-0 mb-4 text-[17px] font-bold text-gray-900 dark:text-white">
          Giao dịch gần đây
        </h2>
        {recentPayments.length === 0 ? (
          <p className="text-[13px] text-gray-400">Chưa có giao dịch hoàn tất.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.06]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Sản phẩm', 'Số tiền', 'Mã CK', 'Ngày hoàn tất'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPayments.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-[13px] font-semibold text-gray-900 dark:text-white">
                      {PRODUCT_CATALOG[r.product_type]?.label ?? r.product_type}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-bold text-green-700">
                      {fmtVnd(r.amount_vnd)}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-mono text-gray-600">
                        {r.reference_code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-400">
                      {r.completed_at
                        ? new Date(r.completed_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-right">
          <Link href="/admin/payments?status=completed" className="text-[13px] font-semibold text-blue-600 no-underline hover:underline">
            Xem tất cả giao dịch →
          </Link>
        </div>
      </section>

    </div>
  )
}
