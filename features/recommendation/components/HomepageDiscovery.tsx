import Link from 'next/link'
import { createClient }          from '@/lib/supabase/server'
import {
  getUserAffinities,
  summariseAffinities,
}                                from '@/features/personalization/api/affinities.server'
import { getFeaturedListings as _getFeatured } from '@/entities/listing/api/listing.server'
import { listingToLandCard, LandListingCard }  from '@/entities/listing'
import { getTrendingListings }   from '../api/recommendation.server'
import { TrackableCard }         from './TrackableCard'
import type { RecommendedListing } from '../types'

async function resolveDiscovery(): Promise<RecommendedListing[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.id) {
    try {
      const affinities = await getUserAffinities(user.id)
      const { topProvince } = summariseAffinities(affinities)
      if (topProvince) {
        const provinceId = parseInt(topProvince.affinity_key, 10)
        if (!isNaN(provinceId)) {
          const personalized = await getTrendingListings('province', provinceId, 8)
          if (personalized.length >= 2) return personalized
        }
      }
    } catch { /* fallthrough to generic discovery */ }
  }

  // Anonymous / insufficient affinity data: national trending
  const trending = await getTrendingListings('national', undefined, 8)
  if (trending.length >= 2) return trending

  // Ultimate fallback: featured listings
  const rows = await _getFeatured({ type: 'land', limit: 8 })
  return rows.map(l => ({ id: l.id, ...listingToLandCard(l) }))
}

export async function HomepageDiscovery() {
  const listings = await resolveDiscovery()
  if (!listings.length) return null

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[#0071E3] dark:text-[#409CFF]">
              Dành cho bạn
            </p>
            <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Khám phá dành cho bạn
            </h2>
          </div>
          <Link
            href="/dat-nong-nghiep"
            className="shrink-0 text-[0.875rem] font-medium text-[#0071E3] no-underline transition-opacity hover:opacity-70 dark:text-[#409CFF]"
          >
            Xem tất cả →
          </Link>
        </div>

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
