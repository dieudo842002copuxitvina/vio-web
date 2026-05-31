import { Skeleton } from '@/shared/ui/skeleton'

export default function QuanLyLoading() {
  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-9 w-40 rounded-2xl" />
      </div>

      {/* Content placeholder — 2-col stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]"
          >
            <Skeleton className="mb-3 h-3 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
