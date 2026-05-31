import { Skeleton } from '@/shared/ui/skeleton'

function SkeletonLeadRow() {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgb(0,0,0,0.06)] dark:bg-[#1C1C1E]">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-28 rounded-lg" />
        <Skeleton className="h-3 w-40 rounded-lg" />
        <Skeleton className="h-3 w-24 rounded-lg" />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Skeleton className="h-3 w-16 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  )
}

export default function QuanLyLeadsLoading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-9 w-44 rounded-2xl" />
      </div>

      {/* Lead rows */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLeadRow key={i} />
        ))}
      </div>
    </div>
  )
}
