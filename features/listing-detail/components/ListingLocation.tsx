// Server Component — location section on detail pages.
// Map embed is a placeholder; wire to a real provider (Mapbox/GG Maps) later.

interface ListingLocationProps {
  location_text?: string | null    // "Cẩm Mỹ, Đồng Nai"
  province?:      string | null
  district?:      string | null
  address?:       string | null    // full street address if available
  className?:     string
  // Pass true once a real map is wired up to show the placeholder
  showMapPlaceholder?: boolean
}

export function ListingLocation({
  location_text,
  province,
  district,
  address,
  className = '',
  showMapPlaceholder = true,
}: ListingLocationProps) {
  const display = location_text
    ?? [district, province].filter(Boolean).join(', ')
    ?? null

  if (!display && !address) return null

  return (
    <section className={['flex flex-col gap-3', className].join(' ')}>
      <h2 className="m-0 text-[1.0625rem] font-semibold text-gray-900 dark:text-white">
        Vị trí
      </h2>

      <div className="flex flex-col gap-2">
        {display && (
          <div className="flex items-start gap-2 text-[0.9375rem] text-gray-700 dark:text-gray-300">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-[#FF3B30]"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0a6 6 0 0 1 6 6c0 4.5-6 10-6 10S2 10.5 2 6a6 6 0 0 1 6-6zm0 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
            </svg>
            <span>{display}</span>
          </div>
        )}

        {address && (
          <p className="m-0 text-[0.875rem] text-gray-500 dark:text-gray-400 pl-6">
            {address}
          </p>
        )}
      </div>

      {/* Map embed placeholder */}
      {showMapPlaceholder && (
        <div
          className={[
            'flex h-48 items-center justify-center rounded-2xl',
            'bg-gray-100 dark:bg-gray-800/60',
            'border border-dashed border-gray-200 dark:border-white/[0.08]',
          ].join(' ')}
          aria-label="Bản đồ chưa được tích hợp"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 3v6h6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[0.8125rem] text-gray-400 dark:text-gray-500">
              Bản đồ sẽ được tích hợp sớm
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
