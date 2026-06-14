import Link from 'next/link'

interface TrendingSearchesProps {
  queries: string[]
}

export function TrendingSearches({ queries }: TrendingSearchesProps) {
  return (
    <div>
      <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        🔥 Xu hướng tìm kiếm
      </p>

      {queries.length === 0 ? (
        <p className="text-[0.875rem] text-gray-400 dark:text-gray-500">
          Chưa có xu hướng tìm kiếm
        </p>
      ) : (
        // Mobile: horizontal scroll (no wrap). Desktop (sm+): wrap to multiple lines.
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {queries.map(q => (
            <Link
              key={q}
              href={`/dat-nong-nghiep?q=${encodeURIComponent(q)}`}
              className="inline-flex h-8 shrink-0 items-center rounded-full border border-gray-200 bg-white px-4 text-[0.8125rem] font-medium text-gray-700 no-underline transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-white/[0.1] dark:bg-[#1C1C1E] dark:text-gray-300 dark:hover:border-white/[0.25] dark:hover:text-white"
            >
              {q}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
