import Link from 'next/link'

// ── Commodity data — refresh weekly or wire to a price API ───────────────────

const COMMODITIES = [
  {
    name:   'Sầu riêng',
    icon:   '🌿',
    price:  '85.000đ/kg',
    change: +12,
    region: 'Đắk Lắk',
    href:   '/dat-nong-nghiep?q=sau+rieng',
  },
  {
    name:   'Cà phê nhân',
    icon:   '☕',
    price:  '68.000đ/kg',
    change: +5,
    region: 'Đắk Lắk · Gia Lai',
    href:   '/dat-nong-nghiep?q=ca+phe',
  },
  {
    name:   'Hồ tiêu',
    icon:   '🌱',
    price:  '142.000đ/kg',
    change: +8,
    region: 'Bình Phước',
    href:   '/dat-nong-nghiep?q=tieu',
  },
  {
    name:   'Lúa gạo ST25',
    icon:   '🌾',
    price:  '8.500đ/kg',
    change: -2,
    region: 'An Giang',
    href:   '/dat-nong-nghiep?q=lua',
  },
  {
    name:   'Mủ cao su',
    icon:   '🌳',
    price:  '35.000đ/kg',
    change: +3,
    region: 'Đồng Nai',
    href:   '/dat-nong-nghiep?q=cao+su',
  },
  {
    name:   'Hạt điều',
    icon:   '🥜',
    price:  '38.000đ/kg',
    change: -1,
    region: 'Bình Thuận',
    href:   '/dat-nong-nghiep?q=dieu',
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketPrices() {
  return (
    <section
      aria-labelledby="market-prices-heading"
      className="px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2
              id="market-prices-heading"
              className="text-2xl font-bold tracking-tight text-gray-900"
            >
              Giá nông sản tuần này
            </h2>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold text-orange-600">
              CẬP NHẬT 07/06
            </span>
          </div>
          <Link
            href="/thi-truong/gia-nong-san"
            className="text-sm font-semibold text-green-700 no-underline hover:underline"
          >
            Bảng giá đầy đủ →
          </Link>
        </div>

        {/* Widget grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          {COMMODITIES.map(c => {
            const up = c.change > 0

            return (
              <Link
                key={c.name}
                href={c.href}
                className="flex items-center justify-between rounded-[18px] bg-white p-4 no-underline
                           shadow-sm ring-1 ring-black/5
                           transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Left: icon + name + region */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none" aria-hidden="true">{c.icon}</span>
                    <span className="truncate text-sm font-bold text-gray-900">{c.name}</span>
                  </div>
                  <p className="m-0 mt-1 truncate text-xs text-gray-400">{c.region}</p>
                </div>

                {/* Right: price + trend pill */}
                <div className="ml-3 flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-base font-bold text-green-700 tabular-nums">
                    {c.price}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5
                                text-[11px] font-semibold tabular-nums
                                ${up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
                  >
                    {up ? '↑' : '↓'} {Math.abs(c.change)}%
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

      </div>
    </section>
  )
}
