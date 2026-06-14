import Link                   from 'next/link'
import { getHotMarkets }      from '@/features/commerce/api/regional-ops.server'
import { createCachedClient } from '@/lib/supabase/server'

// ── Static lookups ─────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<number, string> = {
  1: 'Đất nông nghiệp', 2: 'Cao su',  3: 'Cây ăn trái',
  4: 'Cà phê',          5: 'Hồ tiêu', 6: 'Lúa gạo',
  7: 'Điều',            8: 'Mắc-ca',  9: 'Chăn nuôi',
}
const CATEGORY_ICON: Record<number, string> = {
  1: '🌾', 2: '🌳', 3: '🌿', 4: '☕', 5: '🌱', 6: '🌾', 7: '🔧', 8: '🌱', 9: '🐄',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketRow {
  key:          string
  icon:         string
  categoryName: string
  provinceName: string
  provinceSlug: string
  heat_index:   number
  isHot:        boolean
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_MARKETS: MarketRow[] = [
  { key: 'm1', icon: '🌳', categoryName: 'Cao su',      provinceName: 'Đồng Nai',   provinceSlug: 'dong-nai',   heat_index: 87, isHot: true  },
  { key: 'm2', icon: '☕', categoryName: 'Cà phê',      provinceName: 'Đắk Lắk',   provinceSlug: 'dak-lak',    heat_index: 83, isHot: true  },
  { key: 'm3', icon: '🌿', categoryName: 'Cây ăn trái', provinceName: 'Lâm Đồng',   provinceSlug: 'lam-dong',   heat_index: 79, isHot: true  },
  { key: 'm4', icon: '🌱', categoryName: 'Hồ tiêu',     provinceName: 'Bình Phước', provinceSlug: 'binh-phuoc', heat_index: 75, isHot: false },
  { key: 'm5', icon: '🔧', categoryName: 'Điều',         provinceName: 'Bình Thuận', provinceSlug: 'binh-thuan', heat_index: 71, isHot: false },
  { key: 'm6', icon: '🌾', categoryName: 'Lúa gạo',     provinceName: 'An Giang',   provinceSlug: 'an-giang',   heat_index: 68, isHot: false },
]

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetchMarkets(): Promise<MarketRow[]> {
  const markets = await getHotMarkets(6)
  if (!markets.length) return MOCK_MARKETS

  const supabase = createCachedClient()
  const { data: provData } = await supabase
    .from('provinces')
    .select('id, name, slug')
    .in('id', [...new Set(markets.map(m => m.province_id))])

  type ProvRow = { id: number; name: string; slug: string }
  const provMap = new Map<number, ProvRow>(
    ((provData ?? []) as ProvRow[]).map(p => [p.id, p]),
  )

  const result: MarketRow[] = markets.map((m, i) => {
    const prov = provMap.get(m.province_id)
    return {
      key:          `${m.province_id}-${m.category_id}`,
      icon:         CATEGORY_ICON[m.category_id] ?? '🌾',
      categoryName: CATEGORY_LABEL[m.category_id] ?? 'Nông sản',
      provinceName: prov?.name ?? `Tỉnh ${m.province_id}`,
      provinceSlug: prov?.slug ?? '',
      heat_index:   m.heat_index,
      isHot:        i < 3,
    }
  })

  return result.length >= 2 ? result : MOCK_MARKETS
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function HotCommodities() {
  const markets = await fetchMarkets()

  return (
    <section className="bg-white px-4 pb-4 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-1 rounded-full"
              style={{ background: '#F9A825' }}
              aria-hidden="true"
            />
            <h2 className="m-0 text-[1rem] font-black text-[#1A1A1A]">
              Thị trường nổi bật
            </h2>
          </div>
          <Link
            href="/thi-truong"
            className="text-[0.8125rem] font-semibold no-underline"
            style={{ color: '#2E7D32' }}
          >
            Xem thêm →
          </Link>
        </div>

        {/* 3×2 market grid — full width */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {markets.map(m => {
            const searchHref = m.provinceSlug
              ? `/dat-nong-nghiep/${m.provinceSlug}?q=${encodeURIComponent(m.categoryName)}`
              : `/dat-nong-nghiep?q=${encodeURIComponent(m.categoryName)}`

            return (
              <Link
                key={m.key}
                href={searchHref}
                className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-[#F7F9F5]
                           px-3.5 py-3 no-underline transition-all
                           hover:border-neutral-200 hover:bg-white hover:shadow-sm"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                  style={{ background: m.isHot ? '#FFF3E0' : '#F5F5F5' }}
                  aria-hidden="true"
                >
                  {m.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="m-0 truncate text-[0.8125rem] font-bold text-[#1A1A1A]">
                      {m.categoryName}
                    </p>
                    {m.isHot && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase"
                        style={{ background: '#FFF3E0', color: '#E65100' }}
                      >
                        HOT
                      </span>
                    )}
                  </div>
                  <p className="m-0 truncate text-[0.6875rem] text-neutral-500">
                    {m.provinceName}
                  </p>
                  {/* Mini heat bar */}
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, m.heat_index)}%`,
                        background: m.isHot ? '#F9A825' : '#66BB6A',
                      }}
                    />
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
