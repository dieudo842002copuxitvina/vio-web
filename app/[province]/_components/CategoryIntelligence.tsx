import type {
  RegionalSummary,
  PriceBenchmark,
  MarketStatus,
  HeatTier,
} from '@/features/commerce/api/regional-ops.server'

// ── Static category maps ──────────────────────────────────────────────────────

export const CATEGORY_LABEL: Record<number, string> = {
  1: 'Đất nông nghiệp', 2: 'Cao su',       3: 'Cây ăn trái',
  4: 'Cà phê',          5: 'Hồ tiêu',      6: 'Lúa gạo',
  7: 'Điều',            8: 'Mắc-ca',       9: 'Chăn nuôi',
  10: 'Thủy sản',       11: 'Rau màu',     12: 'Cây công nghiệp',
}

export const CATEGORY_ICON: Record<number, string> = {
  1: '🌾', 2: '🌳', 3: '🌿', 4: '☕',
  5: '🌱', 6: '🌾', 7: '🔧', 8: '🌱',
  9: '🐄', 10: '🐟', 11: '🥬', 12: '🏭',
}

// ── Heat tier display ─────────────────────────────────────────────────────────

const HEAT_CONFIG: Record<HeatTier, { label: string; badge: string; bar: string }> = {
  hot:  { label: '🔥 Nóng',     badge: 'bg-amber-50 text-amber-700 border border-amber-200', bar: 'bg-amber-500'  },
  warm: { label: '📈 Tăng',     badge: 'bg-orange-50 text-orange-700 border border-orange-200', bar: 'bg-orange-400' },
  cool: { label: '➡ Ổn định', badge: 'bg-neutral-100 text-neutral-600 border border-neutral-200', bar: 'bg-neutral-300' },
  cold: { label: '❄ Chậm',     badge: 'bg-blue-50 text-blue-600 border border-blue-200',    bar: 'bg-blue-300'   },
}

const STATUS_LABELS: Partial<Record<MarketStatus, string>> = {
  hot_shortage: '🚨 Nóng & Khan hàng',
  hot_stable:   '🔥 Nóng & Ổn định',
  growing:      '📈 Đang tăng trưởng',
  stable:       '✓ Thị trường ổn',
  oversupplied: '📦 Đang dư cung',
  declining:    '📉 Xu hướng giảm',
  cold:         '❄ Thị trường chậm',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(amount: number | null): string {
  if (!amount) return '—'
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} Tỷ`
  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)} Triệu`
  return `${amount.toLocaleString('vi-VN')}đ`
}

function fmtTrend(val: number): string {
  const pct = (Math.abs(val) * 100).toFixed(1).replace(/\.0$/, '')
  return val > 0 ? `↑${pct}%` : `↓${pct}%`
}

// ── CategoryCard — featured (large) ──────────────────────────────────────────

interface CatData {
  category_id:     number
  heat_tier:       HeatTier
  demand_score:    number
  active_listings: number
  merchant_count:  number
  inquiries_7d:    number
  opportunity_score: number
  shortage_flag:   boolean
  days_supply:     number | null
  market_status:   MarketStatus
  median_price:    number | null
  price_trend_7d:  number
}

function FeaturedCategoryCard({ cat }: { cat: CatData; provinceSlug: string }) {
  const heat    = HEAT_CONFIG[cat.heat_tier]
  const label   = CATEGORY_LABEL[cat.category_id] ?? `Danh mục ${cat.category_id}`
  const icon    = CATEGORY_ICON[cat.category_id]  ?? '🌾'
  const status  = STATUS_LABELS[cat.market_status]
  const demPct  = Math.round(cat.demand_score * 100)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-2xl"
                aria-hidden="true">
            {icon}
          </span>
          <div>
            <h3 className="m-0 text-[1.0625rem] font-black text-[#0A0A0A]">{label}</h3>
            {status && (
              <p className="m-0 mt-0.5 text-[0.75rem] text-neutral-500">{status}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-bold ${heat.badge}`}>
          {heat.label}
        </span>
      </div>

      {/* Demand bar */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
            Nhu cầu thị trường
          </span>
          <span className="text-[0.875rem] font-black text-[#0A0A0A]">{demPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={`h-full rounded-full ${heat.bar}`}
            style={{ width: `${demPct}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Giá trung vị</p>
          <p className="m-0 text-[0.9375rem] font-black text-[#0A0A0A]">{fmtPrice(cat.median_price)}</p>
          {cat.price_trend_7d !== 0 && (
            <p className={`m-0 text-[0.6875rem] font-bold ${cat.price_trend_7d > 0 ? 'text-vio-forest' : 'text-red-500'}`}>
              {fmtTrend(cat.price_trend_7d)} 7 ngày
            </p>
          )}
        </div>
        <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Tồn kho</p>
          <p className="m-0 text-[0.9375rem] font-black text-[#0A0A0A]">
            {cat.days_supply != null ? `${Math.round(cat.days_supply)} ngày` : '—'}
          </p>
          {cat.shortage_flag && (
            <p className="m-0 text-[0.6875rem] font-bold text-red-500">⚠ Đang thiếu hàng</p>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between border-t border-neutral-100 pt-3.5">
        <div className="flex items-center gap-4 text-[0.8125rem] text-neutral-500">
          <span><strong className="font-bold text-[#0A0A0A]">{cat.active_listings}</strong> tin</span>
          <span><strong className="font-bold text-[#0A0A0A]">{cat.inquiries_7d}</strong> hỏi/tuần</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.75rem] font-semibold text-neutral-400">Cơ hội</span>
          <span className="text-[0.875rem] font-black text-vio-forest">
            {Math.round(cat.opportunity_score)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── CategoryCard — compact ────────────────────────────────────────────────────

function CompactCategoryCard({ cat }: { cat: CatData }) {
  const heat   = HEAT_CONFIG[cat.heat_tier]
  const label  = CATEGORY_LABEL[cat.category_id] ?? `#${cat.category_id}`
  const icon   = CATEGORY_ICON[cat.category_id]  ?? '🌾'
  const demPct = Math.round(cat.demand_score * 100)

  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm
                    transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-lg"
                aria-hidden="true">{icon}</span>
          <p className="m-0 text-[0.875rem] font-bold text-[#0A0A0A]">{label}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${heat.badge}`}>
          {heat.label}
        </span>
      </div>

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${heat.bar}`} style={{ width: `${demPct}%` }} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[0.75rem] text-neutral-500">{demPct}% nhu cầu</span>
        {cat.median_price && (
          <span className="text-[0.75rem] font-bold text-[#0A0A0A]">{fmtPrice(cat.median_price)}</span>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface CategoryIntelligenceProps {
  summary:     RegionalSummary[]
  benchmarks:  PriceBenchmark[]
  provinceSlug: string
}

export function CategoryIntelligence({ summary, benchmarks, provinceSlug }: CategoryIntelligenceProps) {
  if (!summary.length) return null

  // Join summary + benchmarks by category_id
  const benchMap = new Map<number, PriceBenchmark>(benchmarks.map(b => [b.category_id, b]))

  const cats: CatData[] = summary.map(s => {
    const bench = benchMap.get(s.category_id)
    return {
      category_id:     s.category_id,
      heat_tier:       s.heat_tier,
      demand_score:    s.demand_score,
      active_listings: s.active_listings,
      merchant_count:  s.merchant_count,
      inquiries_7d:    s.inquiries_7d,
      opportunity_score: s.opportunity_score,
      shortage_flag:   s.shortage_flag,
      days_supply:     s.days_supply,
      market_status:   s.market_status,
      median_price:    bench?.median_price ?? null,
      price_trend_7d:  bench?.price_trend_7d ?? 0,
    }
  })

  const [featured, ...rest] = cats
  const compact = rest.slice(0, 5)

  return (
    <section
      className="bg-neutral-50 px-4 sm:px-6 lg:px-8 py-16 md:py-20"
      aria-labelledby="category-intel-heading"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-600">
              Market Intelligence
            </p>
            <h2
              id="category-intel-heading"
              className="m-0 mt-1 text-2xl font-black tracking-tight text-[#0A0A0A] sm:text-3xl"
            >
              Phân tích theo ngành hàng
            </h2>
            <p className="m-0 mt-1 text-[0.9375rem] text-neutral-500">
              Chỉ số nhu cầu, giá và cơ hội thị trường từ dữ liệu thực
            </p>
          </div>
        </div>

        {/* Featured + compact grid */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">

          {/* Featured category (top by heat_index) */}
          {featured && (
            <div>
              <FeaturedCategoryCard cat={featured} provinceSlug={provinceSlug} />
            </div>
          )}

          {/* Compact grid (2×3) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 content-start">
            {compact.map(cat => (
              <CompactCategoryCard key={cat.category_id} cat={cat} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
