import Link from 'next/link'
import { LandListingCard, listingToLandCard } from '@/entities/listing'
import {
  getFeaturedListings,
  getListings,
}                        from '@/entities/listing/api/listing.server'
import { TrackableCard } from '@/features/recommendation/components/TrackableCard'
import type { RecommendedListing } from '@/features/recommendation/types'

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetchFeaturedLand(): Promise<RecommendedListing[]> {
  const featured = await getFeaturedListings({ type: 'land', limit: 8 })
  if (featured.length >= 2) return featured.map(l => ({ id: l.id, ...listingToLandCard(l) }))

  const { items } = await getListings({ type: 'land', limit: 8 })
  return items.map(l => ({ id: l.id, ...listingToLandCard(l) }))
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function FeaturedLand() {
  const listings = await fetchFeaturedLand()
  if (!listings.length) return null

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[#34C759]">
              Đất đai
            </p>
            <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Đất nổi bật toàn quốc
            </h2>
          </div>
          <Link
            href="/dat-nong-nghiep"
            className="shrink-0 text-[0.875rem] font-semibold text-[#0071E3] no-underline transition-opacity hover:opacity-70 dark:text-[#409CFF]"
          >
            Xem tất cả →
          </Link>
        </div>

        {/* Grid — 4 col desktop / 2 col tablet / 1 col mobile */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map(({ id, ...card }) => (
            <TrackableCard key={id} targetId={id} type="discovery">
              <LandListingCard {...card} />
            </TrackableCard>
          ))}
        </div>

      </div>
    </section>
  )
}
