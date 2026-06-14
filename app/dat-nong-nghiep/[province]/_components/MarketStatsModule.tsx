import type { MarketStats } from '@/lib/seo/statistics.server'

function formatPrice(vnd: number): string {
  if (vnd >= 1_000_000_000) return `${(vnd / 1_000_000_000).toFixed(1)} tỷ`
  if (vnd >= 1_000_000)     return `${(vnd / 1_000_000).toFixed(0)} triệu`
  return `${Math.round(vnd / 1_000)} nghìn`
}

function formatPricePerM2(vnd: number | null): string {
  if (!vnd) return '—'
  if (vnd >= 1_000_000) return `${(vnd / 1_000_000).toFixed(1)} triệu/m²`
  return `${Math.round(vnd / 1_000)} nghìn/m²`
}

export function MarketStatsModule({ stats }: { stats: MarketStats }) {
  if (stats.listing_count === 0) return null

  const items = [
    {
      value: stats.listing_count.toLocaleString('vi-VN'),
      label: 'Tin đăng',
    },
    stats.avg_price_per_m2
      ? { value: formatPricePerM2(stats.avg_price_per_m2), label: 'Giá TB/m²' }
      : stats.median_price_vnd
        ? { value: formatPrice(stats.median_price_vnd), label: 'Giá trung vị' }
        : null,
    stats.new_this_month > 0
      ? { value: `+${stats.new_this_month}`, label: 'Tin mới tháng này' }
      : null,
    stats.pct_with_legal > 0
      ? { value: `${stats.pct_with_legal}%`, label: 'Có sổ đỏ / sổ hồng' }
      : null,
  ].filter(Boolean) as { value: string; label: string }[]

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white px-4 py-3">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-black tabular-nums text-[#1d1d1f]">
              {item.value}
            </span>
            <span className="text-[11px] text-neutral-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
