import Link from 'next/link'
import { createCachedClient } from '@/lib/supabase/server'

// ── Province chips — sampled from active listings ────────────────────────────

async function getActiveProvinceChips(): Promise<{ id: number; name: string; slug: string }[]> {
  const supabase = createCachedClient()

  const { data: rows } = await supabase
    .from('listings')
    .select('province_id')
    .eq('listing_type', 'land')
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .not('province_id', 'is', null)
    .limit(400)

  if (!rows?.length) return []

  const counts = new Map<number, number>()
  for (const { province_id } of rows as { province_id: number }[]) {
    counts.set(province_id, (counts.get(province_id) ?? 0) + 1)
  }

  const topIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id)

  const { data: provinces } = await supabase
    .from('provinces')
    .select('id, name, slug')
    .in('id', topIds)

  const nameMap = new Map(
    ((provinces ?? []) as { id: number; name: string; slug: string }[]).map(p => [p.id, p]),
  )

  return topIds.map(id => nameMap.get(id)).filter((p): p is { id: number; name: string; slug: string } => !!p)
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TradingTrendsProps {
  keywords: string[]
  searches: string[]
}

export async function TradingTrends({ keywords, searches }: TradingTrendsProps) {
  const [provinces] = await Promise.all([getActiveProvinceChips()])

  const terms = keywords.length ? keywords : searches

  if (!terms.length && !provinces.length) return null

  return (
    <section className="border-b border-gray-100 px-4 py-8 dark:border-white/[0.06]">
      <div className="mx-auto max-w-7xl">

        <h2 className="mb-5 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Xu hướng giao thương hôm nay
        </h2>

        <div className="space-y-4">

          {/* Keywords / searches */}
          {terms.length > 0 && (
            <div className="flex items-start gap-4">
              <span className="mt-1.5 w-20 shrink-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                Từ khoá
              </span>
              <div className="flex flex-wrap gap-2">
                {terms.map(t => (
                  <Link
                    key={t}
                    href={`/dat-nong-nghiep?q=${encodeURIComponent(t)}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-[0.8125rem] font-medium text-gray-700 no-underline shadow-sm transition-all hover:border-[#0071E3]/40 hover:text-[#0071E3] dark:border-white/[0.1] dark:bg-[#1C1C1E] dark:text-gray-300"
                  >
                    🔍 {t}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Province chips */}
          {provinces.length > 0 && (
            <div className="flex items-start gap-4">
              <span className="mt-1.5 w-20 shrink-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                Tỉnh thành
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                {provinces.map(p => (
                  <Link
                    key={p.id}
                    href={`/dat-nong-nghiep/${p.slug}`}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-[0.8125rem] font-medium text-gray-700 no-underline shadow-sm transition-all hover:border-[#34C759]/50 hover:text-[#34C759] dark:border-white/[0.1] dark:bg-[#1C1C1E] dark:text-gray-300"
                  >
                    📍 {p.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  )
}
