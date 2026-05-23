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
      href={`/ho-kinh-doanh/${sf.slug}`}
      className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] no-underline h-full transition-[border-color,box-shadow] duration-150 hover:border-[var(--sea-ink-soft)] hover:shadow-sm"
    >
      <div className="flex gap-3 items-start">
        {/* Avatar */}
        <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-[var(--sand)] border border-[var(--line)]">
          {sf.avatar_url ? (
            <img
              src={sf.avatar_url}
              alt=""
              width={48}
              height={48}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-xl">🏪</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-[0.9375rem] leading-snug text-[var(--sea-ink)]">
              {sf.business_name}
            </span>
            {sf.is_verified && (
              <span className="text-[0.6875rem] font-semibold text-[var(--palm)] bg-[rgba(47,106,74,0.1)] px-1.5 py-px rounded-full whitespace-nowrap">
                ✓ Đã xác thực
              </span>
            )}
          </div>

          {sf.district_name && (
            <span className="inline-block mt-1.5 text-[0.75rem] font-medium text-[var(--sea-ink-soft)] bg-[var(--chip-bg)] border border-[var(--chip-line)] px-2 py-0.5 rounded-full">
              {sf.district_name}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
