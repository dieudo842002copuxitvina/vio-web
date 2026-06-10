export default function Loading() {
  return (
    <div className="p-6 md:p-10">

      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-gray-200 dark:bg-white/[0.06]" />
          <div className="h-9 w-44 animate-pulse rounded-xl bg-gray-200 dark:bg-white/[0.06]" />
        </div>
      </div>

      {/* KPI bar — 6 tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/[0.06] dark:bg-[#1C1C1E]">
            <div className="h-2.5 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-white/[0.06]" />
            <div className="h-7   w-20 animate-pulse rounded-lg  bg-gray-200 dark:bg-white/[0.1]"  />
          </div>
        ))}
      </div>

      {/* Summary bar — 5 tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-3 dark:border-white/[0.06] dark:bg-[#1C1C1E]">
            <div className="h-2 w-14 animate-pulse rounded-full bg-gray-100 dark:bg-white/[0.06]" />
            <div className="h-7 w-16 animate-pulse rounded-lg  bg-gray-200 dark:bg-white/[0.1]"  />
          </div>
        ))}
      </div>

      {/* Insight cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/[0.06]" />
        ))}
      </div>
    </div>
  )
}
