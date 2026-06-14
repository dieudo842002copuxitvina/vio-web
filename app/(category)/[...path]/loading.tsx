function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-neutral-100" />
      <div className="space-y-2 px-4 pb-4 pt-3.5">
        <div className="h-6 w-1/3 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-neutral-100" />
      </div>
    </div>
  )
}

function MerchantSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-neutral-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-3 w-full animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-1.5 w-2/3 animate-pulse rounded-full bg-neutral-100" />
      </div>
    </div>
  )
}

export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero skeleton */}
      <div className="border-b border-neutral-100 bg-white px-4 sm:px-6 lg:px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="h-3 w-16 animate-pulse rounded-full bg-neutral-100" />)}
          </div>
          <div className="mb-3 flex items-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-100" />
            <div className="h-10 w-56 animate-pulse rounded-xl bg-neutral-100" />
          </div>
          <div className="mb-6 h-4 w-96 animate-pulse rounded-lg bg-neutral-100" />
          {/* Sub-category pills */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-neutral-100" />
            ))}
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Sidebar skeleton */}
          <div className="hidden lg:block w-[270px] shrink-0">
            <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3].map(j => <div key={j} className="h-8 w-20 animate-pulse rounded-xl bg-neutral-100" />)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main content skeleton */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* Merchants */}
            <div>
              <div className="mb-6 h-7 w-56 animate-pulse rounded-xl bg-neutral-200" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map(i => <MerchantSkeleton key={i} />)}
              </div>
            </div>
            {/* Listings */}
            <div>
              <div className="mb-6 h-7 w-44 animate-pulse rounded-xl bg-neutral-200" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
