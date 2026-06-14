export default function Loading() {
  return (
    <div className="p-6 md:p-10">
      {/* Header skeleton */}
      <div className="mb-6 h-9 w-56 animate-pulse rounded-xl bg-gray-200 dark:bg-white/[0.06]" />

      {/* Temperature summary skeleton */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/[0.06]"
          />
        ))}
      </div>

      {/* Lead cards skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/[0.06]"
          />
        ))}
      </div>
    </div>
  )
}
