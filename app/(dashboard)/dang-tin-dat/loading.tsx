import { Skeleton } from '@/shared/ui/skeleton'

function SkeletonFormCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100/50 bg-white shadow-[0_2px_16px_rgb(0,0,0,0.06)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">
      <div className="border-b border-gray-100 px-6 py-4 dark:border-white/[0.06]">
        <Skeleton className="h-4 w-36 rounded-lg" />
      </div>
      <div className="space-y-4 p-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24 rounded-lg" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DangTinDatLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-9 w-56 rounded-2xl" />
      </div>

      <div className="space-y-5">
        {/* Land info section */}
        <SkeletonFormCard rows={3} />
        {/* Geo section */}
        <SkeletonFormCard rows={3} />
        {/* Pricing section */}
        <SkeletonFormCard rows={2} />
        {/* Description */}
        <div className="overflow-hidden rounded-3xl border border-gray-100/50 bg-white shadow-[0_2px_16px_rgb(0,0,0,0.06)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">
          <div className="border-b border-gray-100 px-6 py-4 dark:border-white/[0.06]">
            <Skeleton className="h-4 w-28 rounded-lg" />
          </div>
          <div className="p-6">
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
        {/* Submit */}
        <Skeleton className="h-14 w-full rounded-full" />
      </div>
    </div>
  )
}
