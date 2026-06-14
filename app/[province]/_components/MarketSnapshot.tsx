import type {
  EconomicTelemetryRow,
  RegionalSummary,
} from '@/features/commerce/api/regional-ops.server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTrend(val: number | undefined): string | null {
  if (val == null || val === 0) return null
  const pct = (val * 100).toFixed(1).replace(/\.0$/, '')
  return val > 0 ? `↑${pct}%` : `↓${Math.abs(Number(pct))}%`
}

function fmtNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  value, label, trend, trendPositive, sub,
}: {
  value:         string
  label:         string
  trend?:        string | null
  trendPositive?: boolean
  sub?:          string
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="m-0 text-[2rem] font-black leading-none tracking-tight text-[#0A0A0A]">
        {value}
      </p>
      <p className="m-0 mt-2 text-[0.8125rem] font-medium text-neutral-500">{label}</p>
      {trend && (
        <p className={[
          'm-0 mt-1.5 text-[0.75rem] font-bold',
          trendPositive ? 'text-vio-forest' : 'text-red-500',
        ].join(' ')}>
          {trend} <span className="font-normal text-neutral-400">7 ngày qua</span>
        </p>
      )}
      {sub && !trend && (
        <p className="m-0 mt-1.5 text-[0.75rem] text-neutral-400">{sub}</p>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MarketSnapshotProps {
  telemetry: EconomicTelemetryRow[]   // last 7 rows
  summary:   RegionalSummary[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketSnapshot({ telemetry, summary }: MarketSnapshotProps) {
  const latest  = telemetry[0]   // most recent day
  const week    = telemetry      // up to 7 days

  // Aggregate from summary rows
  const totalListings  = summary.reduce((s, r) => s + r.active_listings, 0)
  const totalMerchants = summary.reduce((s, r) => s + r.merchant_count, 0)
  const totalInquiries = summary.reduce((s, r) => s + r.inquiries_7d, 0)

  // Avg heat index across all categories
  const avgHeat = summary.length > 0
    ? Math.round(summary.reduce((s, r) => s + r.heat_index, 0) / summary.length)
    : null

  // 7d listing trend from telemetry
  const oldListings  = week[week.length - 1]?.active_listings ?? 0
  const nowListings  = latest?.active_listings ?? totalListings
  const listingTrend = oldListings > 0 && nowListings !== oldListings
    ? fmtTrend((nowListings - oldListings) / oldListings)
    : null

  const liquidity = latest?.liquidity_index ?? null

  return (
    <section
      className="border-y border-neutral-100 bg-white px-4 sm:px-6 lg:px-8 py-10"
      aria-labelledby="snapshot-heading"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              Pulse thị trường
            </p>
            <h2
              id="snapshot-heading"
              className="m-0 mt-1 text-2xl font-black tracking-tight text-[#0A0A0A]"
            >
              Tổng quan hôm nay
            </h2>
          </div>
          {latest && (
            <p className="text-[0.75rem] text-neutral-400">
              Cập nhật {new Date(latest.updated_at).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            value={fmtNumber(nowListings || totalListings)}
            label="Tin đăng hoạt động"
            trend={listingTrend}
            trendPositive={(nowListings - oldListings) > 0}
          />
          <StatCard
            value={fmtNumber(totalInquiries)}
            label="Hỏi thăm / tuần"
            sub="Từ người mua thực"
          />
          <StatCard
            value={fmtNumber(totalMerchants)}
            label="Doanh nghiệp"
            sub="Đang hoạt động"
          />
          <StatCard
            value={avgHeat != null ? `${avgHeat}` : liquidity != null ? `${(liquidity * 100).toFixed(0)}` : '—'}
            label={avgHeat != null ? 'Chỉ số thị trường' : 'Chỉ số thanh khoản'}
            sub={avgHeat != null ? 'Trên 100 điểm' : 'Trên 100 điểm'}
          />
        </div>

        {/* 7-day inquiry sparkline — simple bar chart */}
        {week.length > 1 && (
          <div className="mt-6">
            <p className="mb-3 text-[0.75rem] font-semibold text-neutral-400">Hỏi thăm 7 ngày qua</p>
            <SparkBars rows={week} />
          </div>
        )}
      </div>
    </section>
  )
}

// ── Simple sparkline bar chart ────────────────────────────────────────────────

function SparkBars({ rows }: { rows: EconomicTelemetryRow[] }) {
  const values = [...rows].reverse().map(r => r.inquiries)
  const max    = Math.max(...values, 1)

  const labels = [...rows]
    .reverse()
    .map(r => new Date(r.telemetry_date).toLocaleDateString('vi-VN', { weekday: 'short' }))

  return (
    <div className="flex items-end gap-1.5 h-12" role="img" aria-label="Biểu đồ hỏi thăm 7 ngày">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm bg-vio-primary/30 transition-all"
            style={{ height: `${Math.round((v / max) * 40)}px`, minHeight: '4px' }}
            title={`${labels[i]}: ${v} hỏi thăm`}
          />
          {i === values.length - 1 && (
            <span className="text-[0.5625rem] text-neutral-400 whitespace-nowrap">Hôm nay</span>
          )}
        </div>
      ))}
    </div>
  )
}
