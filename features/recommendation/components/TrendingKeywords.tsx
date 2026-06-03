import Link from 'next/link'

interface TrendingKeywordsProps {
  keywords: string[]
}

export function TrendingKeywords({ keywords }: TrendingKeywordsProps) {
  if (!keywords.length) return null

  return (
    <div className="mb-8">
      <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        Từ khóa đang tìm
      </p>
      <div className="flex flex-wrap gap-2">
        {keywords.map(kw => (
          <Link
            key={kw}
            href={`/dat-nong-nghiep?q=${encodeURIComponent(kw)}`}
            className="inline-flex h-8 items-center rounded-full border border-gray-200 bg-white px-4 text-[0.8125rem] font-medium text-gray-700 no-underline transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-white/[0.1] dark:bg-[#1C1C1E] dark:text-gray-300 dark:hover:border-white/[0.25] dark:hover:text-white"
          >
            {kw}
          </Link>
        ))}
      </div>
    </div>
  )
}
