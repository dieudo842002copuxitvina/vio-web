import { Skeleton } from '@/shared/ui/skeleton'

export default function DashboardLoading() {
  return (
    <main className="page-wrap py-10">

      {/* Welcome header */}
      <div className="mb-10 space-y-2">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-8 w-56 rounded-2xl" />
        <Skeleton className="h-3 w-44 rounded-lg" />
      </div>

      {/* Section label */}
      <Skeleton className="mb-4 h-3 w-28 rounded-full" />

      {/* Quick action cards — 1col / 2col */}
      <div className="grid grid-cols-1 gap-4 max-w-lg sm:grid-cols-2">
        {[0, 1].map(i => (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]"
          >
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 rounded-lg" />
              <Skeleton className="h-3 w-44 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-10 h-px bg-gray-100 dark:bg-white/[0.06]" />

      {/* Account section */}
      <Skeleton className="mb-4 h-3 w-20 rounded-full" />
      <div className="flex max-w-lg items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-40 rounded-lg" />
          <Skeleton className="h-3 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

    </main>
  )
}
