interface StatsRowProps {
  listingCount:    number
  storefrontCount: number
}

const STAT_META = [
  { icon: '📋', label: 'Tin đăng',     sub: 'được xác thực'      },
  { icon: '🏪', label: 'Đại lý & HTX', sub: 'đang hoạt động'     },
  { icon: '📍', label: 'Tỉnh thành',   sub: 'phủ sóng toàn quốc' },
  { icon: '✅', label: 'Tin xác thực', sub: 'kiểm duyệt thủ công' },
] as const

export function StatsRow({ listingCount, storefrontCount }: StatsRowProps) {
  const values = [
    listingCount    > 100 ? `${Math.floor(listingCount    / 100) * 100}+` : '1.500+',
    storefrontCount > 50  ? `${storefrontCount}+`                         : '500+',
    '63',
    '100%',
  ]

  return (
    <section className="px-4 section-y">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STAT_META.map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left"
            >
              {/* Icon — unified tint across all stats */}
              <div
                className="mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:mb-0"
                style={{ background: 'var(--hero-a)' }}
              >
                <span className="text-xl" aria-hidden="true">{s.icon}</span>
              </div>

              <div>
                <p className="m-0 text-[2.25rem] font-black leading-none tracking-tight text-[var(--sea-ink)]">
                  {values[i]}
                </p>
                <p className="m-0 mt-1 text-[0.9375rem] font-semibold text-[var(--sea-ink)]">{s.label}</p>
                <p className="m-0 text-[0.75rem] text-[var(--muted)]">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
