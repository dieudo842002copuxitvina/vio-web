import Link       from 'next/link'
import { MapPin } from 'lucide-react'
import { Badge }  from '@/shared/ui/badge'

interface StorefrontCardProps {
  storefront: {
    slug:           string
    business_name:  string
    avatar_url:     string | null
    is_verified:    boolean
    district_name?: string
  }
}

export function StorefrontCard({ storefront: sf }: StorefrontCardProps) {
  return (
    <Link
      href={`/doanh-nghiep/${sf.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl
                 bg-[var(--surface)] dark:bg-[var(--surface)]
                 no-underline shadow-apple-soft
                 transition-all duration-200 hover:shadow-apple-card active:scale-[0.98]"
    >
      {/* Cover area — image bleeds to top edge */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-[var(--sand)]">
        {sf.avatar_url ? (
          <img
            src={sf.avatar_url}
            alt=""
            width={320}
            height={240}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-5xl opacity-50 select-none" aria-hidden="true">🏪</span>
          </div>
        )}

        {/* Verified badge */}
        {sf.is_verified && (
          <span className="absolute right-2.5 top-2.5">
            <Badge variant="success" size="sm">Đã xác thực</Badge>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 px-4 py-3.5">
        <p className="m-0 line-clamp-1 text-[0.9375rem] font-semibold leading-snug text-[var(--sea-ink)]">
          {sf.business_name}
        </p>

        {sf.district_name && (
          <p className="m-0 flex items-center gap-1 text-[0.8125rem] text-[var(--muted)]">
            <MapPin size={11} aria-hidden="true" />
            {sf.district_name}
          </p>
        )}
      </div>
    </Link>
  )
}
