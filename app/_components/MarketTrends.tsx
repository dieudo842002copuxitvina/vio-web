import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type TrendDir    = 'up' | 'flat'
type TrendStatus = 'hot' | 'stable'

interface Commodity {
  id:         string
  name:       string
  emoji:      string
  location:   string
  status:     TrendStatus
  trend:      TrendDir
  trendLabel: string
  listings:   string
  avgPrice:   string
  href:       string
}

// ── Data ──────────────────────────────────────────────────────────────────────

const COMMODITIES: Commodity[] = [
  {
    id:         'cao-su',
    name:       'Cao su',
    emoji:      '🌳',
    location:   'Đông Nam Bộ',
    status:     'hot',
    trend:      'up',
    trendLabel: 'Tăng mạnh',
    listings:   '1.245',
    avgPrice:   '4,2 tỷ/ha',
    href:       '/dat-nong-nghiep?q=cao+su',
  },
  {
    id:         'sau-rieng',
    name:       'Sầu riêng',
    emoji:      '🌿',
    location:   'Lâm Đồng, Tây Nguyên',
    status:     'hot',
    trend:      'up',
    trendLabel: 'Tăng mạnh',
    listings:   '987',
    avgPrice:   '5,8 tỷ/ha',
    href:       '/dat-nong-nghiep?q=s%E1%BA%A7u+ri%C3%AAng',
  },
  {
    id:         'ca-phe',
    name:       'Cà phê',
    emoji:      '☕',
    location:   'Đắk Lắk, Gia Lai',
    status:     'stable',
    trend:      'flat',
    trendLabel: 'Ổn định',
    listings:   '1.102',
    avgPrice:   '3,1 tỷ/ha',
    href:       '/dat-nong-nghiep?q=c%C3%A0+ph%C3%AA',
  },
  {
    id:         'ho-tieu',
    name:       'Hồ tiêu',
    emoji:      '🌶️',
    location:   'Bình Phước, Đắk Nông',
    status:     'stable',
    trend:      'flat',
    trendLabel: 'Ổn định',
    listings:   '634',
    avgPrice:   '2,8 tỷ/ha',
    href:       '/dat-nong-nghiep?q=h%E1%BB%93+ti%C3%AAu',
  },
]

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TrendStatus }) {
  return status === 'hot' ? (
    <span className="inline-flex shrink-0 items-center rounded-full bg-red-500
                     px-2 py-0.5 text-[10px] font-bold leading-none text-white">
      NÓNG
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-400
                     px-2 py-0.5 text-[10px] font-bold leading-none text-gray-900">
      ỔN ĐỊNH
    </span>
  )
}

// ── MarketTrends ──────────────────────────────────────────────────────────────

export function MarketTrends() {
  return (
    <section
      aria-labelledby="market-trends-heading"
      className="px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        {/* Section header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
              Dữ liệu thị trường
            </p>
            <h2
              id="market-trends-heading"
              className="mt-1 text-2xl font-bold tracking-tight text-gray-900"
            >
              Thị trường nổi bật
            </h2>
          </div>
          <Link
            href="/dat-nong-nghiep"
            className="text-[0.8125rem] font-semibold text-green-700 no-underline
                       transition-colors hover:text-green-800"
          >
            Xem tất cả →
          </Link>
        </div>

        {/* Widget grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COMMODITIES.map(c => (
            <Link
              key={c.id}
              href={c.href}
              className="group flex flex-col justify-between rounded-3xl border border-gray-100
                         bg-white p-6 no-underline
                         shadow-[0_2px_20px_rgb(0,0,0,0.03)]
                         transition-all duration-200
                         hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(0,0,0,0.07)]"
            >
              {/* ── Top: emoji + name + badge ── */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-2xl leading-none">{c.emoji}</p>
                  <h3 className="m-0 mt-2 text-xl font-bold tracking-tight text-gray-900">
                    {c.name}
                  </h3>
                </div>
                <StatusBadge status={c.status} />
              </div>

              {/* ── Middle: trend arrow + region ── */}
              <div className="mt-3">
                <p
                  className={[
                    'flex items-center gap-1 text-sm font-semibold',
                    c.trend === 'up' ? 'text-green-600' : 'text-amber-600',
                  ].join(' ')}
                >
                  <span aria-hidden="true">{c.trend === 'up' ? '↑' : '→'}</span>
                  {c.trendLabel}
                </p>
                <p className="m-0 mt-1 text-xs text-gray-400">{c.location}</p>
              </div>

              {/* ── Bottom: two-column stats ── */}
              <div className="mt-5 flex items-end justify-between border-t border-gray-100 pt-4">

                {/* Left: listing count */}
                <div>
                  <p className="m-0 text-sm text-gray-500">Tin đăng</p>
                  <p className="m-0 mt-0.5 font-semibold text-gray-900">{c.listings}</p>
                </div>

                {/* Right: avg price — the "hero number" */}
                <div className="text-right">
                  <p className="m-0 text-sm text-gray-500">Giá trung bình</p>
                  <p className="m-0 mt-0.5 text-2xl font-bold tracking-tighter text-gray-900">
                    {c.avgPrice}
                  </p>
                </div>

              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
