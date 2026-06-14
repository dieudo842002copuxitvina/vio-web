import Link from 'next/link'
import { createClient }          from '@/lib/supabase/server'
import {
  getUserAffinities,
  summariseAffinities,
}                                from '@/features/personalization/api/affinities.server'
import {
  getFeaturedListings as _getFeatured,
  getListings,
}                                             from '@/entities/listing/api/listing.server'
import { listingToLandCard, LandListingCard }  from '@/entities/listing'
import { getTrendingListings }   from '../api/recommendation.server'
import { TrackableCard }         from './TrackableCard'
import { Skeleton }              from '@/shared/ui/skeleton'
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

  // Anonymous / insufficient affinity: national trending
  const trending = await getTrendingListings('national', undefined, 8)
  if (trending.length >= 2) return trending

  // Fallback 3: any featured land listings
  const featured = await _getFeatured({ type: 'land', limit: 8 })
  if (featured.length) return featured.map(l => ({ id: l.id, ...listingToLandCard(l) }))

  // Ultimate fallback: any recent approved land listings (no is_featured requirement)
  const { items } = await getListings({ type: 'land', limit: 8 })
  return items.map(l => ({ id: l.id, ...listingToLandCard(l) }))
}

// ── Skeleton — shown while server component streams ───────────────────────────

export function HomepageDiscoverySkeleton() {
  return (
    <section className="px-4 py-16" aria-hidden="true">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52 rounded-xl" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>
          <Skeleton className="h-5 w-16 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl bg-white dark:bg-[#1C1C1E]">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="mt-1 h-5 w-1/2 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader() {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div>
        <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          🎯 Gợi ý dành cho bạn
        </h2>
        <p className="m-0 mt-1 text-[0.8125rem] text-gray-500 dark:text-gray-400">
          Dựa trên hành vi và khu vực bạn quan tâm
        </p>
      </div>
      <Link
        href="/dat-nong-nghiep"
        className="shrink-0 text-[0.875rem] font-medium text-[#0071E3] no-underline transition-opacity hover:opacity-70 dark:text-[#409CFF]"
      >
        Xem thêm →
      </Link>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export async function HomepageDiscovery() {
  const listings = await resolveDiscovery()

  if (!listings.length) {
    return (
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionHeader />
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-gray-50 py-16 text-center dark:bg-[#1C1C1E]">
            <span className="text-5xl" aria-hidden="true">🎯</span>
            <p className="m-0 text-[0.9375rem] text-gray-500 dark:text-gray-400">
              Chưa có gợi ý phù hợp
            </p>
            <Link
              href="/dat-nong-nghiep"
              className="rounded-full bg-gray-900 px-6 py-2.5 text-[0.875rem] font-semibold text-white no-underline transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
            >
              Khám phá tin mới
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <SectionHeader />
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
