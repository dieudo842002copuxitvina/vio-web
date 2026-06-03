import { LandListingCard } from '@/entities/listing'
import { TrackableCard }   from './TrackableCard'
import type { RecommendedListing } from '../types'

interface TrendingListingsSectionProps {
  listings: RecommendedListing[]
}

export function TrendingListingsSection({ listings }: TrendingListingsSectionProps) {
  if (!listings.length) return null

  return (
    <section aria-label="Đất đang được quan tâm" className="mb-10">
      <div className="mb-5 flex items-center gap-3">
        <div>
          <span className="mb-1 block text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[#FF9500]">
            Trending
          </span>
          <h2 className="m-0 text-[1.125rem] font-bold tracking-tight text-gray-900 dark:text-white">
            Đất đang được quan tâm
          </h2>
        </div>
        <div className="ml-auto h-px flex-1 bg-gray-200/70 dark:bg-white/[0.07]" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {listings.map(({ id, ...card }) => (
          <TrackableCard key={id} targetId={id} type="trending">
            <LandListingCard {...card} />
          </TrackableCard>
        ))}
      </div>
    </section>
  )
}
