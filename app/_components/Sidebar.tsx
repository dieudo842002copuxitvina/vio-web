import Link         from 'next/link'
import { BadgeCheck } from 'lucide-react'

// ── Widget 1 data: land price reference ───────────────────────────────────────

type Trend = 'up' | 'down' | 'stable'

const PRICE_DATA = [
  { province: 'Đồng Nai',   price: '~3.2 Tỷ/ha', trend: 'up'     as Trend },
  { province: 'Lâm Đồng',   price: '~2.8 Tỷ/ha', trend: 'up'     as Trend },
  { province: 'Đắk Lắk',   price: '~2.1 Tỷ/ha', trend: 'up'     as Trend },
  { province: 'Tây Ninh',   price: '~1.8 Tỷ/ha', trend: 'stable' as Trend },
  { province: 'Bình Phước', price: '~1.5 Tỷ/ha', trend: 'down'   as Trend },
] as const

const TREND: Record<Trend, { symbol: string; className: string }> = {
  up:     { symbol: '↑', className: 'text-green-600' },
  down:   { symbol: '↓', className: 'text-red-500'   },
  stable: { symbol: '→', className: 'text-gray-400'  },
}

// ── Widget 2 data: featured members ───────────────────────────────────────────

const MEMBERS = [
  {
    id:       'm1',
    name:     'Nguyễn Văn Hùng',
    tag:      'VIP Member',
    listings: 24,
    initials: 'NH',
    color:    'bg-green-500',
  },
  {
    id:       'm2',
    name:     'Công ty BĐS Tâm An',
    tag:      'VIP Member',
    listings: 87,
    initials: 'TA',
    color:    'bg-blue-600',
  },
  {
    id:       'm3',
    name:     'Trần Thị Lan Hương',
    tag:      'Đã xác thực',
    listings: 12,
    initials: 'TH',
    color:    'bg-purple-500',
  },
  {
    id:       'm4',
    name:     'Môi giới Đắk Lắk Pro',
    tag:      'VIP Member',
    listings: 156,
    initials: 'ĐL',
    color:    'bg-amber-500',
  },
] as const

// ── Shared card shell ─────────────────────────────────────────────────────────

function WidgetCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {children}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <div className="sticky top-24 flex w-full flex-col gap-6">

      {/* ── Widget 1: Price Reference ─────────────────────────────────────── */}
      <WidgetCard>

        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[15px] font-bold text-gray-900">
            Tham khảo giá đất
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            T6/2026
          </span>
        </div>

        <ul className="m-0 list-none divide-y divide-gray-50 p-0">
          {PRICE_DATA.map(row => {
            const trend = TREND[row.trend]
            return (
              <li
                key={row.province}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-[13px] font-medium text-gray-700">
                  {row.province}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-gray-900">
                    {row.price}
                  </span>
                  <span
                    className={`text-[12px] font-bold ${trend.className}`}
                    aria-label={
                      row.trend === 'up'   ? 'đang tăng' :
                      row.trend === 'down' ? 'đang giảm' : 'ổn định'
                    }
                  >
                    {trend.symbol}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="mt-3 text-[11px] leading-snug text-gray-400">
          Giá tham khảo trung bình. Biến động tùy vị trí và pháp lý.
        </p>

      </WidgetCard>

      {/* ── Widget 2: Verified Members ────────────────────────────────────── */}
      <WidgetCard>

        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[15px] font-bold text-gray-900">
            Thành viên nổi bật
          </h3>
          <Link
            href="/thanh-vien"
            className="text-[12px] font-semibold text-green-700 no-underline hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>

        <ul className="m-0 list-none flex flex-col gap-3.5 p-0">
          {MEMBERS.map(m => (
            <li key={m.id} className="flex items-center gap-3">

              {/* Avatar — initials on a brand-colour circle */}
              <div
                className={`h-9 w-9 shrink-0 rounded-full ${m.color}
                            flex items-center justify-center
                            text-[11px] font-bold text-white`}
                aria-hidden="true"
              >
                {m.initials}
              </div>

              {/* Name + badges */}
              <div className="min-w-0 flex-1">

                {/* Name row */}
                <div className="flex items-center gap-1">
                  <span className="truncate text-[13px] font-semibold text-gray-900">
                    {m.name}
                  </span>
                  <BadgeCheck
                    size={13}
                    className="shrink-0 text-blue-500"
                    aria-label="Đã xác thực"
                  />
                </div>

                {/* Tag + listing count */}
                <div className="mt-0.5 flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                                ${m.tag === 'VIP Member'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-blue-50  text-blue-700'}`}
                  >
                    {m.tag}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {m.listings} tin đăng
                  </span>
                </div>

              </div>
            </li>
          ))}
        </ul>

        {/* Blue-tick upsell CTA */}
        <Link
          href="/thanh-vien/dang-ky"
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl
                     bg-gradient-to-r from-blue-600 to-blue-500
                     px-4 py-2.5 text-[13px] font-semibold text-white
                     no-underline shadow-sm shadow-blue-200/60
                     transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          <BadgeCheck size={14} aria-hidden="true" />
          Đăng ký Tích xanh VIP
        </Link>

      </WidgetCard>

    </div>
  )
}
