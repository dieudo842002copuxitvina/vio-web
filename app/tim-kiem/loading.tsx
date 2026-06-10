// ── Skeleton while page.tsx streams ──────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-neutral-100" />
      <div className="space-y-2.5 px-4 pb-4 pt-3.5">
        <div className="h-6 w-1/3 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-3 w-1/4 animate-pulse rounded-full bg-neutral-100" />
      </div>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="hidden lg:block w-64 shrink-0">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <div className="h-4 w-16 animate-pulse rounded-lg bg-neutral-100" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-9 animate-pulse rounded-xl bg-neutral-100" />
        ))}
        <div className="h-px bg-neutral-100" />
        <div className="h-4 w-20 animate-pulse rounded-lg bg-neutral-100" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-9 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
    </div>
  )
}

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-neutral-50">

      {/* Header skeleton */}
      <div className="border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 flex gap-1.5">
            <div className="h-3 w-16 animate-pulse rounded-full bg-neutral-100" />
            <div className="h-3 w-3 animate-pulse rounded-full bg-neutral-100" />
            <div className="h-3 w-20 animate-pulse rounded-full bg-neutral-100" />
          </div>
          <div className="h-7 w-64 animate-pulse rounded-xl bg-neutral-100" />
          <div className="mt-1.5 h-4 w-40 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">

          {/* Sidebar */}
          <SidebarSkeleton />

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Group header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="h-3 w-40 animate-pulse rounded-full bg-neutral-200" />
              <div className="h-3 w-16 animate-pulse rounded-full bg-neutral-200" />
            </div>
            {/* Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
