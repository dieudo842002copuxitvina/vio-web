export default function Loading() {
  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 h-9 w-48 animate-pulse rounded-xl bg-gray-200 dark:bg-white/[0.06]" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/[0.06]"
          />
        ))}
      </div>
    </div>
  )
}
