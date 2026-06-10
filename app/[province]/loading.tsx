export default function ProvinceLoading() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero skeleton */}
      <div className="bg-[#0D2E1A] px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 h-3 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="mb-4 h-14 w-64 animate-pulse rounded-2xl bg-white/10" />
          <div className="mb-2 h-4 w-48 animate-pulse rounded-lg bg-white/10" />
          <div className="mb-8 h-3 w-56 animate-pulse rounded-lg bg-white/10" />
          <div className="flex gap-3">
            <div className="h-12 w-48 animate-pulse rounded-xl bg-white/10" />
            <div className="h-12 w-36 animate-pulse rounded-xl bg-white/10" />
          </div>
        </div>
      </div>

      {/* Snapshot skeleton */}
      <div className="border-y border-neutral-100 bg-white px-4 sm:px-6 lg:px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 h-8 w-56 animate-pulse rounded-xl bg-neutral-100" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="mb-2 h-9 w-20 animate-pulse rounded-xl bg-neutral-100" />
                <div className="h-3 w-28 animate-pulse rounded-lg bg-neutral-100" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories skeleton */}
      <div className="bg-neutral-50 px-4 sm:px-6 lg:px-8 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 h-8 w-72 animate-pulse rounded-xl bg-neutral-200" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl bg-neutral-200" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="bg-white px-4 sm:px-6 lg:px-8 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 h-8 w-48 animate-pulse rounded-xl bg-neutral-100" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
