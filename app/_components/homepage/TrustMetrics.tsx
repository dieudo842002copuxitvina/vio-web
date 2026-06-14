// ── TrustMetrics ───────────────────────────────────────────────────────────────
// Stat row inserted between HeroSection and FeaturedListings.
// listingCount: live from DB. Other numbers are launch estimates.

interface Stat {
  value:  string
  label:  string
  suffix: string
}

function buildStats(listingCount: number): Stat[] {
  const count =
    listingCount >= 100
      ? `${Math.floor(listingCount / 100) * 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : '1.200'

  return [
    { value: count, label: 'Tin đang đăng',       suffix: '+' },
    { value: '320',  label: 'Người bán xác minh',  suffix: '+' },
    { value: '8',    label: 'Tỉnh thành phủ sóng', suffix: ''  },
    { value: '500',  label: 'Giao dịch thành công',suffix: '+' },
  ]
}

// ── TrustMetrics ───────────────────────────────────────────────────────────────

interface TrustMetricsProps {
  listingCount: number
}

export function TrustMetrics({ listingCount }: TrustMetricsProps) {
  const stats = buildStats(listingCount)

  return (
    <section
      aria-label="Thống kê nền tảng"
      className="mx-auto max-w-[1280px] px-4 sm:px-8"
    >
      {/* Card — overlaps hero bottom */}
      <div
        className="relative z-10 -mt-8 grid grid-cols-2 overflow-hidden rounded-[20px]
                   bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]
                   sm:grid-cols-4"
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={[
              'flex flex-col items-center gap-1 px-6 py-5 text-center sm:items-start sm:text-left',
              // Vertical divider: right border except on last column in each row
              i % 2 === 0 ? 'border-r border-[rgba(60,60,67,0.08)]' : '',
              // Horizontal divider: top border on second row (mobile only)
              i >= 2 ? 'border-t border-[rgba(60,60,67,0.08)] sm:border-t-0' : '',
              // On desktop, add right border for cols 1-3, not col 4
              i < 3 ? 'sm:border-r sm:border-[rgba(60,60,67,0.08)]' : 'sm:border-r-0',
            ].filter(Boolean).join(' ')}
          >
            <span className="text-[32px] font-bold leading-none tracking-[-0.03em] text-[#1A4D2E] sm:text-[36px]">
              {s.value}
              {s.suffix && (
                <span className="text-[24px] sm:text-[28px]">{s.suffix}</span>
              )}
            </span>
            <span className="text-[13px] font-medium text-[#6e6e73]">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
