// Apple-style info grid for the key property facts.
// Pure JSX — no client state needed.

export interface FactItem {
  label: string
  value: string
  icon:  React.ReactNode
}

interface KeyFactsProps {
  items: FactItem[]
}

// ── SVG icon set ──────────────────────────────────────────────────────────────

export const ICONS = {
  area: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  ),
  price: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 0 1 0 3H9.5a1.5 1.5 0 0 0 0 3H15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  land: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 18l5-8 4 5 3-4 6 7H3z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  legal: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
      <path d="M14 2v6h6M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  frontage: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M3 18h18M6 6v12M18 6v12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  road: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 3l2 18M19 3l-2 18M5 3h14M7 21h10M9 10h6M9.5 15h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  water: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C12 2 5 9.5 5 14a7 7 0 0 0 14 0c0-4.5-7-12-7-12z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  ),
  electricity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 2L4 13h8l-1 9 9-11h-8l1-9z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  ),
  crop: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22V12M12 12C12 7 7 4 2 4c0 5 3 9.5 10 8M12 12c0-5 5-8 10-8-1 5-5 9-10 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

// ── KeyFacts ──────────────────────────────────────────────────────────────────

export function KeyFacts({ items }: KeyFactsProps) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="key-facts-heading">
      <h2
        id="key-facts-heading"
        className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
      >
        Thông số
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map(item => (
          <div
            key={item.label}
            className="flex flex-col gap-2.5 rounded-2xl border border-neutral-100 bg-white p-4
                       shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="text-neutral-400">{item.icon}</div>
            <div>
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                {item.label}
              </p>
              <p className="m-0 mt-0.5 text-[15px] font-bold leading-snug text-[#1d1d1f]">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
