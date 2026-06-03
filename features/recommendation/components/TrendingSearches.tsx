import Link from 'next/link'

interface TrendingSearchesProps {
  queries: string[]
}

export function TrendingSearches({ queries }: TrendingSearchesProps) {
  if (!queries.length) return null

  return (
    <div className="mb-8">
      <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        Tìm kiếm nhiều nhất
      </p>
      <div className="flex flex-wrap gap-2">
        {queries.map(q => (
          <Link
            key={q}
            href={`/dat-nong-nghiep?q=${encodeURIComponent(q)}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 text-[0.8125rem] font-medium text-gray-700 no-underline transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-white/[0.1] dark:bg-[#1C1C1E] dark:text-gray-300 dark:hover:border-white/[0.25] dark:hover:text-white"
          >
            <span aria-hidden="true">🔥</span>
            {q}
          </Link>
        ))}
      </div>
    </div>
  )
}
