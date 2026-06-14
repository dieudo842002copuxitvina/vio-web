import { createCachedClient } from '@/lib/supabase/server'

// ── Data ──────────────────────────────────────────────────────────────────────

async function getMarketStats() {
  const supabase = createCachedClient()

  const [listingRes, storefrontRes, provinceRes] = await Promise.all([
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true)
      .eq('moderation_status', 'approved'),

    supabase
      .from('storefronts')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true),

    // Count unique provinces that have active listings
    supabase
      .from('listings')
      .select('province_id')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .not('province_id', 'is', null)
      .limit(500),
  ])

  const uniqueProvinces = new Set(
    (provinceRes.data ?? []).map((r: { province_id: number }) => r.province_id),
  ).size

  return {
    listingCount:    listingRes.count    ?? 0,
    storefrontCount: storefrontRes.count ?? 0,
    provinceCount:   uniqueProvinces,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function MarketInsights() {
  const stats = await getMarketStats()

  const cards = [
    {
      icon:     '📋',
      label:    'Tin đăng đang hiển thị',
      value:    stats.listingCount.toLocaleString('vi-VN'),
      sub:      'Đất nông nghiệp toàn quốc',
      accent:   '#0071E3',
      bg:       'bg-[#0071E3]/5 dark:bg-[#0071E3]/10',
    },
    {
      icon:     '🏪',
      label:    'Hộ kinh doanh hoạt động',
      value:    stats.storefrontCount.toLocaleString('vi-VN'),
      sub:      'Đại lý & hộ nông nghiệp',
      accent:   '#34C759',
      bg:       'bg-[#34C759]/5 dark:bg-[#34C759]/10',
    },
    {
      icon:     '📍',
      label:    'Tỉnh thành có tin đăng',
      value:    stats.provinceCount.toLocaleString('vi-VN'),
      sub:      'Trên tổng 63 tỉnh thành',
      accent:   '#FF9500',
      bg:       'bg-[#FF9500]/5 dark:bg-[#FF9500]/10',
    },
  ]

  if (!stats.listingCount && !stats.storefrontCount) return null

  return (
    <section className="bg-gray-50/60 px-4 py-12 sm:py-16 dark:bg-[#111]">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Dữ liệu nền tảng
          </p>
          <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Toàn cảnh thị trường
          </h2>
        </div>

        {/* 3-col cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {cards.map(card => (
            <div
              key={card.label}
              className="rounded-3xl bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1C1E]"
            >
              {/* Icon badge */}
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg}`}>
                <span className="text-2xl" aria-hidden="true">{card.icon}</span>
              </div>

              {/* Value */}
              <p
                className="m-0 text-[2rem] font-bold leading-none tracking-tight"
                style={{ color: card.accent }}
              >
                {card.value}
              </p>

              {/* Labels */}
              <p className="m-0 mt-2 text-[0.9375rem] font-semibold text-gray-900 dark:text-white">
                {card.label}
              </p>
              <p className="m-0 mt-0.5 text-[0.8125rem] text-gray-500 dark:text-gray-400">
                {card.sub}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
