import Link from 'next/link'

interface StorefrontCardProps {
  storefront: {
    slug:          string
    business_name: string
    avatar_url:    string | null
    is_verified:   boolean
    district_name?: string
  }
}

export function StorefrontCard({ storefront: sf }: StorefrontCardProps) {
  return (
    <Link
      href={`/doanh-nghiep/${sf.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#1C1C1E] no-underline shadow-[0_2px_8px_rgb(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgb(0,0,0,0.3)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_6px_20px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_6px_20px_rgb(0,0,0,0.45)] active:scale-[0.98]"
    >
      {/* ── Cover area — image bleeds to top edge ── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-[#2C2C2E]">
        {sf.avatar_url ? (
          <img
            src={sf.avatar_url}
            alt=""
            width={320}
            height={240}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-40 select-none" aria-hidden="true">🏪</span>
          </div>
        )}

        {/* Verified badge floats over image */}
        {sf.is_verified && (
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full bg-[#34C759]/90 backdrop-blur-sm text-white text-[0.625rem] font-bold leading-none">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
              <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Đã xác thực
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-4 py-3.5 flex flex-col gap-1.5">
        <p className="m-0 font-semibold text-[0.9375rem] leading-snug text-[var(--sea-ink)] line-clamp-1">
          {sf.business_name}
        </p>

        {sf.district_name && (
          <p className="m-0 flex items-center gap-1 text-[0.8125rem] text-[var(--muted)]">
            <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true">
              <path
                d="M5.5 0C3.015 0 1 2.015 1 4.5c0 3.375 4.5 8.5 4.5 8.5S10 7.875 10 4.5C10 2.015 7.985 0 5.5 0Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
                fill="currentColor"
              />
            </svg>
            {sf.district_name}
          </p>
        )}
      </div>
    </Link>
  )
}
