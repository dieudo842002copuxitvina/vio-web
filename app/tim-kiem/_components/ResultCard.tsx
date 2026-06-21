import Image from 'next/image'
import Link  from 'next/link'

// ── DisplayHit — normalized across universalSearch and searchListings ──────────

export interface DisplayHit {
  id:          string
  type:        string      // 'land_listing' | 'storefront' | raw DB type
  slug:        string
  title:       string
  subtitle:    string | null  // price_text for listings, location/desc for storefronts
  image_url:   string | null
  href:        string
  badge?:      string         // 'Nổi bật' | 'Xác thực'
  is_featured: boolean
  is_verified: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function avatarColor(name: string): string {
  const palette = ['#1A4D2E', '#0071E3', '#FF9500', '#34C759', '#5856D6', '#FF3B30']
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return palette[Math.abs(hash) % palette.length]!
}

// ── ListingCard ───────────────────────────────────────────────────────────────

function ListingCard({ hit }: { hit: DisplayHit }) {
  return (
    <Link
      href={hit.href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white
                 shadow-sm no-underline transition-all duration-300
                 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
    >
      {/* Image area */}
      <div className="relative aspect-[3/2] overflow-hidden bg-[#F5F5F7]">
        {hit.image_url ? (
          <Image
            src={hit.image_url}
            alt={hit.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 to-[#E8EDE8]" aria-hidden="true" />
        )}

        {/* Badge — top right */}
        {hit.badge && (
          <span
            className={[
              'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold',
              hit.is_featured
                ? 'bg-vio-forest text-white'
                : 'bg-white/90 text-vio-forest backdrop-blur-sm',
            ].join(' ')}
          >
            {hit.badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 px-4 pb-5 pt-4">
        {/* Price */}
        {hit.subtitle && (
          <p className="m-0 text-xl font-bold leading-tight tracking-tight text-green-700">
            {hit.subtitle}
          </p>
        )}

        {/* Title */}
        <p className="m-0 line-clamp-2 text-[0.875rem] font-medium leading-snug text-[#1d1d1f]">
          {hit.title}
        </p>
      </div>
    </Link>
  )
}

// ── StorefrontCard ────────────────────────────────────────────────────────────

function StorefrontCard({ hit }: { hit: DisplayHit }) {
  return (
    <Link
      href={hit.href}
      className="group flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5
                 shadow-sm no-underline transition-all duration-300
                 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
    >
      {/* Avatar */}
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
                   overflow-hidden text-sm font-bold text-white"
        style={{ backgroundColor: hit.image_url ? undefined : avatarColor(hit.title) }}
      >
        {hit.image_url ? (
          <Image
            src={hit.image_url}
            alt=""
            width={48}
            height={48}
            className="h-full w-full rounded-2xl object-cover"
          />
        ) : (
          <span aria-hidden="true">{initials(hit.title)}</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="m-0 line-clamp-1 text-[0.9375rem] font-bold leading-tight text-[#0A0A0A]
                        group-hover:text-vio-forest transition-colors">
            {hit.title}
          </p>
          {hit.is_verified && (
            <span className="mt-0.5 shrink-0 rounded-full bg-vio-primary/10 px-2 py-0.5
                             text-[10px] font-bold text-vio-forest">
              ✓ Xác thực
            </span>
          )}
        </div>

        {hit.subtitle && (
          <p className="m-0 mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-neutral-500">
            {hit.subtitle}
          </p>
        )}
      </div>
    </Link>
  )
}

// ── ResultCard — dispatches to correct card type ──────────────────────────────

export function ResultCard({ hit }: { hit: DisplayHit }) {
  if (hit.type === 'storefront') return <StorefrontCard hit={hit} />
  return <ListingCard hit={hit} />
}
