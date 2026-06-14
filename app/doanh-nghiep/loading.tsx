function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-3 w-1/2 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </div>
      <div className="h-1.5 w-full animate-pulse rounded-full bg-neutral-100" />
      <div className="flex justify-between border-t border-neutral-100 pt-3">
        <div className="h-8 w-16 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-8 w-20 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-4 w-12 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    </div>
  )
}

export default function DirectoryLoading() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header skeleton */}
      <div className="border-b border-neutral-100 bg-white px-4 sm:px-6 lg:px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 h-4 w-32 animate-pulse rounded-full bg-neutral-100" />
          <div className="mb-2 h-10 w-72 animate-pulse rounded-xl bg-neutral-200" />
          <div className="mb-6 h-4 w-96 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-12 w-full max-w-lg animate-pulse rounded-2xl bg-neutral-100" />
        </div>
      </div>

      {/* Featured skeleton */}
      <div className="border-b border-neutral-100 bg-white px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 h-7 w-48 animate-pulse rounded-xl bg-neutral-200" />
          <div className="h-28 animate-pulse rounded-2xl bg-neutral-100 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          </div>
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          <div className="hidden lg:block w-[240px] shrink-0">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
                  {[1, 2, 3].map(j => <div key={j} className="h-9 animate-pulse rounded-xl bg-neutral-100" />)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-5 h-4 w-32 animate-pulse rounded-full bg-neutral-200" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
