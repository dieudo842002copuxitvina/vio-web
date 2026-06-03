import { LandListingCard } from '@/entities/listing'
import {
  getSimilarListings,
  getTrendingListings,
}                          from '../api/recommendation.server'
import { TrackableCard }   from './TrackableCard'
import type { RecommendedListing } from '../types'

interface SimilarListingsProps {
  listingId:  string
  provinceId: number | null
  categoryId: number | null
}

async function resolveSimilar(
  listingId:  string,
  provinceId: number | null,
  categoryId: number | null,
): Promise<RecommendedListing[]> {
  const similar = await getSimilarListings(listingId, 8)
  if (similar.length >= 2) return similar

  // Fallback 1: province-scoped trending
  if (provinceId) {
    const prov = await getTrendingListings('province', provinceId, 8)
    if (prov.length > 0) return prov
  }

  // Fallback 2: category-scoped trending
  if (categoryId) {
    const cat = await getTrendingListings('category', categoryId, 8)
    if (cat.length > 0) return cat
  }

  // Fallback 3: national trending
  return getTrendingListings('national', undefined, 8)
}

export async function SimilarListings({
  listingId,
  provinceId,
  categoryId,
}: SimilarListingsProps) {
  const listings = await resolveSimilar(listingId, provinceId, categoryId)
  if (!listings.length) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Bất động sản tương tự',
    itemListElement: listings.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'RealEstateListing',
        url: `/dat-nong-nghiep/chi-tiet/${l.slug}`,
        name: l.title,
      },
    })),
  }

  return (
    <section aria-label="Bất động sản tương tự">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="mb-4 flex items-center gap-3">
        <h2 className="m-0 shrink-0 text-[1.0625rem] font-bold tracking-tight text-gray-900 dark:text-white">
          Bất động sản tương tự
        </h2>
        <div className="h-px flex-1 bg-gray-200/70 dark:bg-white/[0.07]" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map(({ id, ...card }) => (
          <TrackableCard key={id} targetId={id} sourceId={listingId} type="similar">
            <LandListingCard {...card} />
          </TrackableCard>
        ))}
      </div>
    </section>
  )
}
