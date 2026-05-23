import Link from 'next/link'

export interface LandListingCardProps {
  slug:             string
  title:            string
  price_text?:      string | null
  land_area_text?:  string | null
  location?:        string | null     // province/district display name
  land_type_label?: string | null     // human-readable label from LAND_TYPE_LABELS
  legal_status?:    string | null     // legal_status_text from DB
  image_url?:       string | null
  is_featured?:     boolean
}

export function LandListingCard({
  slug,
  title,
  price_text,
  land_area_text,
  location,
  land_type_label,
  legal_status,
  image_url,
  is_featured,
}: LandListingCardProps) {
  const badge = legal_status ?? land_type_label
  const meta  = [land_area_text, location].filter(Boolean).join(' • ')

  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${slug}`}
      className="group block rounded-[2rem] overflow-hidden bg-white dark:bg-[#1C1C1E] shadow-[0_2px_16px_rgb(0,0,0,0.08)] dark:shadow-[0_2px_16px_rgb(0,0,0,0.35)] no-underline transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Cover — 3:2 ratio ≈ 60 % of card area */}
      <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {image_url ? (
          <img
            src={image_url}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-20 select-none" aria-hidden="true">🌾</span>
          </div>
        )}

        {/* Legal / type badge — glassmorphism */}
        {badge && (
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full backdrop-blur-md bg-black/30 text-white text-xs font-semibold leading-none">
            {badge}
          </span>
        )}

        {/* Featured badge */}
        {is_featured && (
          <span className="absolute top-3 right-3 px-3 py-1 rounded-full backdrop-blur-md bg-[#0071E3]/80 text-white text-xs font-semibold leading-none">
            Nổi bật
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pt-3.5 pb-4">
        {price_text && (
          <p className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
            {price_text}
          </p>
        )}
        {meta && (
          <p className="m-0 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {meta}
          </p>
        )}
        <p className="m-0 mt-1.5 text-base font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
          {title}
        </p>
      </div>
    </Link>
  )
}
