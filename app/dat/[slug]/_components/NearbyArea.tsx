// Static nearby area placeholders — no external data source yet.
// Each item represents a relevant location type within the district.

const NEARBY_ITEMS = [
  {
    label: 'Chợ địa phương',
    distance: '~2–5 km',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3h18l-2 9H5L3 3z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="1.75"/>
        <path d="M9 12v4M15 12v4M12 12v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'UBND / Trung tâm huyện',
    distance: '~5–15 km',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 21h18M5 21V8l7-5 7 5v13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="9" y="14" width="6" height="7" stroke="currentColor" strokeWidth="1.5" rx="0.5"/>
        <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Quốc lộ',
    distance: '~1–8 km',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 3l2 18M19 3l-2 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M5 3h14M7 21h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M10 10h4M10.5 14.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Kho bãi / Logistics',
    distance: '~10–25 km',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 17l4-10h12l4 10H2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M2 17v3h20v-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M8 17v3M16 17v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function NearbyArea() {
  return (
    <section aria-labelledby="nearby-heading">
      <h2
        id="nearby-heading"
        className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
      >
        Tiện ích xung quanh
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NEARBY_ITEMS.map(item => (
          <div
            key={item.label}
            className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-4
                       shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="text-neutral-400">{item.icon}</div>
            <div>
              <p className="m-0 text-[13px] font-semibold leading-snug text-[#1d1d1f]">{item.label}</p>
              <p className="m-0 mt-0.5 text-[11px] text-neutral-400">{item.distance}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2.5 text-[11px] text-neutral-400">
        Khoảng cách ước tính. Liên hệ chủ đất để biết thêm chi tiết.
      </p>
    </section>
  )
}
