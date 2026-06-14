import Link                   from 'next/link'
import { createCachedClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────────────────────

interface FeaturedListing {
  id:            string
  slug:          string
  title:         string
  cover_url:     string | null
  price_text:    string | null
  location_text: string | null
  land_type:     string | null
  is_featured:   boolean
  is_verified:   boolean
}

const LAND_TYPE_LABELS: Record<string, string> = {
  lua:         'Đất lúa',
  rau_mau:     'Rau màu',
  cay_lau_nam: 'Cây lâu năm',
  an_trai:     'Ăn trái',
  lam_nghiep:  'Lâm nghiệp',
  mat_nuoc:    'Nuôi thuỷ sản',
  hon_hop:     'Hỗn hợp',
}

// ── Data ───────────────────────────────────────────────────────────────────────

async function getFeaturedListings(): Promise<FeaturedListing[]> {
  try {
    const supabase = createCachedClient()
    const { data, error } = await supabase
      .from('listings')
      .select('id, slug, title, cover_url, price_text, location_text, land_type, is_featured, is_verified')
      .eq('listing_type', 'land')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .order('published_at',  { ascending: false })
      .limit(6)

    if (error) {
      console.error('[getFeaturedListings]', error.message)
      return []
    }
    return (data ?? []) as FeaturedListing[]
  } catch (err) {
    console.error('[getFeaturedListings] unexpected:', err)
    return []
  }
}

// ── ListingCard ────────────────────────────────────────────────────────────────

function ListingCard({ listing }: { listing: FeaturedListing }) {
  const href = `/dat/${listing.slug}`
  const landLabel = listing.land_type ? LAND_TYPE_LABELS[listing.land_type] : null

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-[20px]
                 border border-gray-200/60 bg-white no-underline
                 shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                 transition-all duration-300
                 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)]"
    >
      {/* Save button — top-right, always accessible */}
      <button
        type="button"
        aria-label="Lưu tin đăng"
        onClick={e => e.preventDefault()}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center
                   rounded-full bg-white/80 backdrop-blur-sm transition-colors
                   hover:bg-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
                stroke="#1A4D2E" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Image */}
      <div className="relative aspect-[3/2] overflow-hidden bg-[#F5F5F7]">
        {listing.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_url}
            alt={listing.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover
                       transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-neutral-100 to-[#E8EDE8]"
            aria-hidden="true"
          />
        )}

        {/* Status badge — bottom left */}
        {listing.is_featured && (
          <span
            className="absolute left-3 bottom-3 rounded-full bg-[#1A4D2E] px-2.5 py-1
                       text-[11px] font-bold text-white"
          >
            Nổi bật
          </span>
        )}
        {!listing.is_featured && listing.is_verified && (
          <span
            className="absolute left-3 bottom-3 rounded-full border border-[#1A4D2E]/20
                       bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#1A4D2E]
                       backdrop-blur-sm"
          >
            Xác thực
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 px-5 pb-5 pt-4">
        {/* Price — most important signal */}
        {listing.price_text && (
          <p className="m-0 text-[22px] font-bold leading-tight tracking-tight text-[#1A4D2E]">
            {listing.price_text}
          </p>
        )}

        {/* Title */}
        <p className="m-0 line-clamp-2 text-[15px] font-semibold leading-snug text-[#1d1d1f]">
          {listing.title}
        </p>

        {/* Meta row: land type + location */}
        <div className="flex flex-wrap items-center gap-2">
          {landLabel && (
            <span
              className="rounded-full bg-[#E8F0EB] px-2.5 py-0.5
                         text-[11px] font-semibold text-[#1A4D2E]"
            >
              {landLabel}
            </span>
          )}
          {listing.location_text && (
            <p className="m-0 text-[13px] text-[#86868b]">{listing.location_text}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── FeaturedListings ───────────────────────────────────────────────────────────

export async function FeaturedListings() {
  const listings = await getFeaturedListings()
  if (listings.length === 0) return null

  return (
    <section
      className="mx-auto max-w-[1280px] px-4 py-24 sm:px-8 sm:py-32"
      aria-labelledby="featured-heading"
    >
      {/* Section header */}
      <div className="mb-14 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">
            Đất nổi bật
          </p>
          <h2
            id="featured-heading"
            className="text-[32px] font-bold tracking-[-0.02em] text-[#1d1d1f]
                       sm:text-[40px]"
          >
            Những lô đất đáng chú ý
          </h2>
        </div>
        <Link
          href="/dat-nong-nghiep"
          className="shrink-0 text-[15px] font-semibold text-[#1A4D2E] no-underline
                     transition-opacity hover:opacity-70"
        >
          Xem tất cả →
        </Link>
      </div>

      {/* Grid: 3 cols desktop / 2 cols tablet / 1 col mobile */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map(l => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  )
}
