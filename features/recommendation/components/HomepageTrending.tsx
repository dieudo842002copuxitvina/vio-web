import Link                from 'next/link'
import { getTrendingListings } from '../api/recommendation.server'
import { TrackableCard }       from './TrackableCard'

export async function HomepageTrending() {
  const listings = await getTrendingListings('national', undefined, 8)
  if (!listings.length) return null

  return (
    <section className="bg-gray-50/60 px-4 py-16 dark:bg-[#141414]">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Đang được quan tâm
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map(({ id, slug, title, price_text, location }) => (
            <TrackableCard key={id} targetId={id} type="trending">
              <Link
                href={`/dat-nong-nghiep/chi-tiet/${slug}`}
                className="flex flex-col gap-2 rounded-2xl bg-white p-4 no-underline shadow-[0_1px_6px_rgb(0,0,0,0.07)] transition-transform duration-200 hover:scale-[1.02] dark:bg-[#1C1C1E]"
              >
                <span className="w-fit rounded-full bg-[#FF9500]/10 px-2 py-0.5 text-[0.6875rem] font-bold text-[#FF9500]">
                  🔥 Trending
                </span>
                <p className="m-0 line-clamp-2 text-[0.875rem] font-semibold leading-snug text-gray-900 dark:text-white">
                  {title}
                </p>
                {price_text && (
                  <p className="m-0 mt-auto text-[0.9375rem] font-bold text-[#34C759]">
                    {price_text}
                  </p>
                )}
                {location && (
                  <p className="m-0 text-[0.75rem] text-gray-500 dark:text-gray-400">
                    📍 {location}
                  </p>
                )}
              </Link>
            </TrackableCard>
          ))}
        </div>

      </div>
    </section>
  )
}
