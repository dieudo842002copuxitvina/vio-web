import { Skeleton } from '@/shared/ui/skeleton'

function SkeletonLandCard() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgb(0,0,0,0.07)] dark:bg-[#1C1C1E]">
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4 rounded-lg" />
      <Skeleton className="h-3.5 w-1/2 rounded-lg" />
      <Skeleton className="mt-1 h-5 w-24 rounded-lg" />
    </div>
  )
}

export default function LandIndexLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 md:px-8">

      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-3 w-2 rounded-full" />
        <Skeleton className="h-3 w-28 rounded-full" />
      </div>

      {/* Header */}
      <div className="mb-8 space-y-3">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-10 w-72 rounded-2xl" />
        <Skeleton className="h-4 w-48 rounded-xl" />
      </div>

      {/* Filter pills */}
      <div className="mb-8 flex flex-wrap gap-2">
        {[88, 104, 80, 96, 72].map((w, i) => (
          <Skeleton key={i} className="h-9 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLandCard key={i} />
        ))}
      </div>

    </main>
  )
}
