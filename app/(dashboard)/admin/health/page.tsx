import {
  getTodayMetrics,
  getMarketplaceDailyMetrics,
  getActiveAlerts,
  getGeographicBreakdown,
  resolveAlert,
} from '@/features/admin/api/health.server'
import type { MarketplaceAlert, MarketplaceDailyMetric } from '@/features/admin/api/health.server'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Sức khỏe thị trường | Admin VIO AGRI' }
export const dynamic  = 'force-dynamic'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  return n.toLocaleString('vi-VN')
}

function fmtVnd(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M ₫'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K ₫'
  return n + ' ₫'
}

function delta(today: number, prev: number): { sign: string; pct: string; up: boolean } {
  if (!prev) return { sign: '', pct: '—', up: true }
  const d   = ((today - prev) / prev) * 100
  const up  = d >= 0
  return { sign: up ? '+' : '', pct: `${d.toFixed(1)}%`, up }
}

// ── Alert banner ──────────────────────────────────────────────────────────────

async function AlertBanner({ alert }: { alert: MarketplaceAlert }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminId = user?.id ?? ''

  async function resolveAction() {
    'use server'
    await resolveAlert(alert.id, adminId)
  }

  const BG: Record<string, string> = {
    critical: 'border-red-300 bg-red-50 text-red-800',
    warning:  'border-amber-300 bg-amber-50 text-amber-800',
    info:     'border-blue-200 bg-blue-50 text-blue-800',
  }

  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${BG[alert.severity] ?? BG.info}`}>
      <div>
        <p className="font-medium">{alert.message_vi}</p>
        <p className="text-xs opacity-70">
          {new Date(alert.triggered_at).toLocaleString('vi-VN')}
        </p>
      </div>
      <form action={resolveAction}>
        <button
          type="submit"
          className="rounded-lg border border-current px-3 py-1 text-xs font-medium opacity-80 hover:opacity-100"
        >
          Đã xử lý
        </button>
      </form>
    </div>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({
  rows,
  field,
}: {
  rows:  MarketplaceDailyMetric[]
  field: keyof MarketplaceDailyMetric
}) {
  const values = rows.map(r => Number(r[field]))
  const max    = Math.max(...values, 1)

  return (
    <div className="flex h-12 items-end gap-0.5">
      {values.map((v, i) => (
        <div
          key={i}
          style={{ height: `${Math.round((v / max) * 100)}%` }}
          className="flex-1 rounded-t bg-green-500 opacity-70"
          title={String(v)}
        />
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HealthPage() {
  const [today, history30, alerts, geo] = await Promise.all([
    getTodayMetrics(),
    getMarketplaceDailyMetrics(30),
    getActiveAlerts(),
    getGeographicBreakdown(),
  ])

  const yesterday = history30.at(-2) ?? null

  const KPI_CARDS = [
    { label: 'Tin đang đăng',   field: 'active_listings'       as const, fmt: fmtNum },
    { label: 'Tin mới hôm nay', field: 'new_listings'           as const, fmt: fmtNum },
    { label: 'Khách hàng mới',  field: 'new_leads'              as const, fmt: fmtNum },
    { label: 'Lịch xem đất',    field: 'visit_requests'         as const, fmt: fmtNum },
    { label: 'Gói Pro active',   field: 'pro_subscribers'        as const, fmt: fmtNum },
    { label: 'Doanh thu hôm nay', field: 'revenue_vnd'           as const, fmt: fmtVnd },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Sức khỏe thị trường</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Cập nhật lúc {today ? new Date(today.computed_at).toLocaleTimeString('vi-VN') : '—'}
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-600">Cảnh báo đang mở</h2>
          {alerts.map(a => <AlertBanner key={a.id} alert={a} />)}
        </section>
      )}

      {/* KPI grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">Hôm nay</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {KPI_CARDS.map(({ label, field, fmt }) => {
            const val  = today ? Number(today[field]) : 0
            const prev = yesterday ? Number(yesterday[field]) : 0
            const d    = delta(val, prev)
            return (
              <div key={field} className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-medium text-neutral-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">{fmt(val)}</p>
                <p className={`mt-0.5 text-xs font-medium ${d.up ? 'text-emerald-600' : 'text-red-600'}`}>
                  {d.sign}{d.pct} vs hôm qua
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 30-day sparklines */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">30 ngày qua</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Khách hàng mới', field: 'new_leads'      as const },
            { label: 'Tin đang đăng',  field: 'active_listings' as const },
            { label: 'Doanh thu (₫)',  field: 'revenue_vnd'     as const },
          ].map(({ label, field }) => (
            <div key={field} className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="mb-2 text-xs font-medium text-neutral-500">{label}</p>
              <Sparkline rows={history30} field={field} />
            </div>
          ))}
        </div>
      </section>

      {/* Geographic breakdown */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">Top tỉnh thành</h2>
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-600">Tỉnh</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">Tin đang đăng</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">Khách hàng (30d)</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">Điểm thanh khoản</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {geo.map(row => (
                <tr key={row.province_id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-neutral-800">{row.province_name}</td>
                  <td className="px-4 py-3 text-right text-neutral-600">{fmtNum(row.active_listings)}</td>
                  <td className="px-4 py-3 text-right text-neutral-600">{fmtNum(row.leads_30d)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      (row.liquidity_score ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      (row.liquidity_score ?? 0) >= 60 ? 'bg-blue-100 text-blue-700' :
                      (row.liquidity_score ?? 0) >= 40 ? 'bg-amber-100 text-amber-700' :
                      'bg-neutral-100 text-neutral-600'
                    }`}>
                      {row.liquidity_score ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {geo.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                    Chưa có dữ liệu. Chạy refresh_all_liquidity_scores() để tạo dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
