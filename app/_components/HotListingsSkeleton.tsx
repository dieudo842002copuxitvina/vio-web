export function HotListingsSkeleton() {
  return (
    <div className="px-4 section-y border-t border-[var(--line)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-xl bg-[var(--line)]" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-4xl bg-[var(--line)]" />
          ))}
        </div>
      </div>
    </div>
  )
}
