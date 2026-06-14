import { Skeleton } from '@/shared/ui/skeleton'

export default function BusinessProfileLoading() {
  return (
    <div>
      {/* Cover */}
      <Skeleton className="h-56 w-full rounded-none md:h-72" />

      <div className="mx-auto max-w-4xl px-4 pb-24 md:px-8">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 pt-4">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-3 w-2 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>

        {/* Avatar */}
        <div className="-mt-16 mb-4 pl-1">
          <Skeleton circle className="h-24 w-24 ring-4 ring-white" />
        </div>

        {/* Identity */}
        <div className="mb-5 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-52 rounded-2xl" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40 rounded-xl" />
          <Skeleton className="h-4 w-28 rounded-xl" />
        </div>

        {/* Contact bar */}
        <div className="mb-6 flex gap-3">
          <Skeleton className="h-11 flex-1 rounded-2xl" />
          <Skeleton className="h-11 flex-1 rounded-2xl" />
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-4 border-b border-gray-100 pb-3">
          {['Tổng quan', 'Dịch vụ', 'Đánh giá'].map(t => (
            <Skeleton key={t} className="h-4 w-20 rounded-full" />
          ))}
        </div>

        {/* Content skeletons */}
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
