import { Skeleton } from '@/shared/ui/skeleton'

export default function LandDetailLoading() {
  return (
    <>
      <main className="min-h-screen">
        {/* Gallery grid */}
        <div className="grid h-[55vw] max-h-[480px] min-h-[260px] grid-cols-3 grid-rows-2 gap-1 overflow-hidden rounded-b-[2rem] bg-gray-100">
          <Skeleton className="col-span-2 row-span-2 rounded-none rounded-bl-[2rem]" />
          <Skeleton className="rounded-none" />
          <Skeleton className="rounded-none rounded-br-[2rem]" />
        </div>

        {/* Metrics bar */}
        <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-xl">
          <Skeleton className="h-8 w-32 rounded-xl" />
          <div className="h-5 w-px bg-gray-200" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>

        <div className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5">
            {[16, 20, 24, 40].map((w, i) => (
              <Skeleton key={i} className={`h-3 w-${w} rounded-full`} />
            ))}
          </div>

          {/* Title block */}
          <div className="space-y-3">
            <Skeleton className="h-7 w-full rounded-xl" />
            <Skeleton className="h-7 w-3/4 rounded-xl" />
            <Skeleton className="h-4 w-40 rounded-lg" />
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>

          {/* Seller card */}
          <Skeleton className="h-24 w-full rounded-3xl" />

          {/* Attributes grid */}
          <div className="space-y-3">
            <Skeleton className="h-3 w-24 rounded-full" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          </div>

          {/* Map */}
          <Skeleton className="h-64 w-full rounded-3xl" />

          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-full" />
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-4 w-full rounded-lg" />)}
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
        </div>
      </main>

      {/* Sticky bar placeholder */}
      <div className="fixed bottom-0 z-50 w-full border-t border-gray-200 bg-white/80 p-4 backdrop-blur-xl">
        <Skeleton className="h-14 w-full rounded-full" />
      </div>
    </>
  )
}
