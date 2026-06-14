import Link                    from 'next/link'
import { SectionHeader }       from '@/shared/ui/section-header'
import { getHotMarkets }       from '@/features/commerce/api/regional-ops.server'
import { createCachedClient }  from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketCard {
  key:             string
  province_id:     number
  category_id:     number
  heat_index:      number
  demand_score:    number
  liquidity_score: number
  provinceName:    string
  provinceSlug:    string
  categoryName:    string
  icon:            string
}

// ── Static lookups ─────────────────────────────────────────────────────────────
// Category IDs from the VIO schema — used as fallback when DB lookup fails

const CATEGORY_LABEL: Record<number, string> = {
  1: 'Đất nông nghiệp',
  2: 'Cao su',
  3: 'Cây ăn trái',
  4: 'Cà phê',
  5: 'Hồ tiêu',
  6: 'Lúa gạo',
  7: 'Điều',
  8: 'Mắc-ca',
  9: 'Chăn nuôi',
}

const CATEGORY_ICON: Record<number, string> = {
  1: '🌾', 2: '🌳', 3: '🌿', 4: '☕',
  5: '🌱', 6: '🌾', 7: '🔧', 8: '🌱', 9: '🐄',
}

// ── Mock fallback — shown while heatmap table is being seeded ─────────────────

const MOCK_MARKETS: MarketCard[] = [
  { key: 'm1', province_id: 0, category_id: 2, heat_index: 87, demand_score: 0.85, liquidity_score: 0.79, provinceName: 'Đồng Nai',   provinceSlug: 'dong-nai',   categoryName: 'Cao su',       icon: '🌳' },
  { key: 'm2', province_id: 0, category_id: 4, heat_index: 83, demand_score: 0.82, liquidity_score: 0.71, provinceName: 'Lâm Đồng',   provinceSlug: 'lam-dong',   categoryName: 'Cà phê',       icon: '☕' },
  { key: 'm3', province_id: 0, category_id: 3, heat_index: 79, demand_score: 0.76, liquidity_score: 0.68, provinceName: 'Gia Lai',    provinceSlug: 'gia-lai',    categoryName: 'Cây ăn trái',  icon: '🌿' },
  { key: 'm4', province_id: 0, category_id: 5, heat_index: 75, demand_score: 0.73, liquidity_score: 0.64, provinceName: 'Bình Phước', provinceSlug: 'binh-phuoc', categoryName: 'Hồ tiêu',      icon: '🌱' },
  { key: 'm5', province_id: 0, category_id: 7, heat_index: 71, demand_score: 0.69, liquidity_score: 0.62, provinceName: 'Bình Thuận', provinceSlug: 'binh-thuan', categoryName: 'Điều',         icon: '🔧' },
  { key: 'm6', province_id: 0, category_id: 6, heat_index: 68, demand_score: 0.65, liquidity_score: 0.58, provinceName: 'An Giang',   provinceSlug: 'an-giang',   categoryName: 'Lúa gạo',      icon: '🌾' },
]

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetchMarkets(): Promise<MarketCard[]> {
  const markets = await getHotMarkets(6)
  if (!markets.length) return MOCK_MARKETS

  const supabase = createCachedClient()
  const provinceIds = [...new Set(markets.map(m => m.province_id))]

  const { data: provData } = await supabase
    .from('provinces')
    .select('id, name, slug')
    .in('id', provinceIds)

  type ProvRow = { id: number; name: string; slug: string }
  const provMap = new Map<number, ProvRow>(
    ((provData ?? []) as ProvRow[]).map(p => [p.id, p]),
  )

  const result: MarketCard[] = markets.map(m => {
    const prov = provMap.get(m.province_id)
    return {
      key:             `${m.province_id}-${m.category_id}`,
      province_id:     m.province_id,
      category_id:     m.category_id,
      heat_index:      m.heat_index,
      demand_score:    m.demand_score,
      liquidity_score: m.liquidity_score,
      provinceName:    prov?.name  ?? `Tỉnh ${m.province_id}`,
      provinceSlug:    prov?.slug  ?? '',
      categoryName:    CATEGORY_LABEL[m.category_id] ?? 'Nông sản',
      icon:            CATEGORY_ICON[m.category_id]  ?? '🌾',
    }
  })

  return result.length >= 2 ? result : MOCK_MARKETS
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function MarketActivity() {
  const markets = await fetchMarkets()

  return (
    <section
      className="bg-neutral-50 px-4 sm:px-6 lg:px-8 py-16 md:py-20"
      aria-labelledby="markets-heading"
    >
      <div className="mx-auto max-w-7xl">

        <SectionHeader
          kicker="Thị trường"
          kickerColor="text-amber-600"
          title="Thị trường nổi bật"
          subtitle="Tổng hợp tín hiệu nhu cầu, thanh khoản và độ tin cậy theo thời gian thực"
          action={{ label: 'Xem phân tích →', href: '/thi-truong' }}
          className="mb-8"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m, i) => {
            const searchHref = m.provinceSlug
              ? `/dat-nong-nghiep/${m.provinceSlug}?q=${encodeURIComponent(m.categoryName)}`
              : `/dat-nong-nghiep?q=${encodeURIComponent(m.categoryName)}`
            const isHot = i < 2

            return (
              <Link
                key={m.key}
                href={searchHref}
                className="group flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 no-underline
                           shadow-sm transition-all duration-300
                           hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl
                                 transition-colors duration-300 group-hover:bg-vio-primary/10"
                      style={{ backgroundColor: isHot ? 'rgb(255 247 237)' : 'rgb(245 245 245)' }}
                      aria-hidden="true"
                    >
                      {m.icon}
                    </span>
                    <div>
                      <p className="m-0 text-[0.9375rem] font-bold leading-tight text-[#0A0A0A]">
                        {m.categoryName}
                      </p>
                      <p className="m-0 text-[0.75rem] text-neutral-500">{m.provinceName}</p>
                    </div>
                  </div>

                  <span
                    className={[
                      'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                      isHot
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-neutral-100 text-neutral-500',
                    ].join(' ')}
                  >
                    {isHot ? '🔥 Nóng' : '📈 Tăng'}
                  </span>
                </div>

                {/* Heat index bar */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                      Chỉ số thị trường
                    </span>
                    <span className="text-[0.8125rem] font-black text-[#0A0A0A]">
                      {Math.round(m.heat_index)}
                      <span className="text-[10px] font-normal text-neutral-400">/100</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-vio-primary"
                      style={{ width: `${Math.min(100, m.heat_index)}%` }}
                    />
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
                    <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                      Nhu cầu
                    </p>
                    <p className="m-0 text-sm font-black text-[#0A0A0A]">
                      {Math.round(m.demand_score * 100)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
                    <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                      Thanh khoản
                    </p>
                    <p className="m-0 text-sm font-black text-[#0A0A0A]">
                      {Math.round(m.liquidity_score * 100)}%
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

      </div>
    </section>
  )
}
