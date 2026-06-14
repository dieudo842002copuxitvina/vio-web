import { Skeleton } from '@/shared/ui/skeleton'

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.07)] dark:bg-[#1C1C1E]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-28 rounded-lg" />
      </div>
      <Skeleton className="mb-1 h-5 w-36 rounded-lg" />
      <Skeleton className="mb-3 h-4 w-28 rounded-lg" />
      <Skeleton className="mb-3 h-9 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-14 rounded-xl" />
      </div>
    </div>
  )
}

export default function QuanLyLichHenLoading() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-9 w-56 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map(col => (
          <div key={col}>
            <Skeleton className="mb-3 h-12 w-full rounded-2xl" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: col === 1 ? 3 : col === 2 ? 2 : 1 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
