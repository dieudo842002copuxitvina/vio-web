import Link from 'next/link'
import { createCachedClient } from '@/lib/supabase/server'

// ── Data ──────────────────────────────────────────────────────────────────────

interface ProvinceCard {
  id:           number
  name:         string
  slug:         string
  listingCount: number
  avgPriceText: string | null
}

function formatAvgPrice(amount: number): string {
  if (amount >= 1_000_000_000) return `~${(amount / 1_000_000_000).toFixed(1)} tỷ/lô`
  if (amount >= 1_000_000)     return `~${Math.round(amount / 1_000_000)} triệu/lô`
  return `~${amount.toLocaleString('vi-VN')} đ`
}

async function getTopProvinces(limit = 12): Promise<ProvinceCard[]> {
  const supabase = createCachedClient()

  // Sample active land listings for distribution
  const { data: rows } = await supabase
    .from('listings')
    .select('province_id, price_amount')
    .eq('listing_type', 'land')
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .not('province_id', 'is', null)
    .limit(500)

  if (!rows?.length) return []

  // Aggregate per province
  const map = new Map<number, { count: number; totalPrice: number; priceCount: number }>()
  for (const { province_id, price_amount } of rows as { province_id: number; price_amount: number | null }[]) {
    const p = map.get(province_id) ?? { count: 0, totalPrice: 0, priceCount: 0 }
    p.count++
    if (price_amount) { p.totalPrice += price_amount; p.priceCount++ }
    map.set(province_id, p)
  }

  const topIds = [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([id]) => id)

  const { data: provinces } = await supabase
    .from('provinces')
    .select('id, name, slug')
    .in('id', topIds)

  const nameMap = new Map(
    ((provinces ?? []) as { id: number; name: string; slug: string }[]).map(p => [p.id, p]),
  )

  return topIds
    .map(id => {
      const stats = map.get(id)!
      const province = nameMap.get(id)
      if (!province) return null
      return {
        id,
        name:         province.name,
        slug:         province.slug,
        listingCount: stats.count,
        avgPriceText: stats.priceCount > 0
          ? formatAvgPrice(Math.round(stats.totalPrice / stats.priceCount))
          : null,
      }
    })
    .filter((p): p is ProvinceCard => !!p)
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function ProvinceExplorer() {
  const provinces = await getTopProvinces(12)
  if (!provinces.length) return null

  return (
    <section className="bg-gray-50/60 px-4 py-12 dark:bg-[#111]">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[#FF9500]">
              Bất động sản địa phương
            </p>
            <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Khám phá theo tỉnh
            </h2>
          </div>
          <Link
            href="/dat-nong-nghiep"
            className="shrink-0 text-[0.875rem] font-semibold text-[#0071E3] no-underline transition-opacity hover:opacity-70 dark:text-[#409CFF]"
          >
            Xem tất cả →
          </Link>
        </div>

        {/* Grid — 4 col desktop / 3 col tablet / 2 col mobile */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {provinces.map(p => (
            <Link
              key={p.id}
              href={`/dat-nong-nghiep/${p.slug}`}
              className="group flex flex-col justify-between rounded-3xl bg-white p-5 no-underline shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-transform duration-200 hover:scale-[1.02] dark:bg-[#1C1C1E]"
            >
              {/* Province icon placeholder */}
              <span className="mb-3 text-3xl select-none" aria-hidden="true">🌿</span>

              <div>
                <p className="m-0 text-[0.9375rem] font-bold leading-snug text-gray-900 group-hover:text-[#0071E3] dark:text-white dark:group-hover:text-[#409CFF]">
                  {p.name}
                </p>
                <p className="m-0 mt-1 text-[0.75rem] font-medium text-gray-500 dark:text-gray-400">
                  {p.listingCount.toLocaleString('vi-VN')} tin đăng
                </p>
                {p.avgPriceText && (
                  <p className="m-0 mt-0.5 text-[0.75rem] text-gray-400 dark:text-gray-500">
                    {p.avgPriceText}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
