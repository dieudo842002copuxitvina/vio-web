import { Skeleton } from '@/shared/ui/skeleton'

export default function HoSoLoading() {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <Skeleton className="mb-6 h-8 w-48 rounded-2xl" />
      <div className="space-y-5">
        {/* Image card */}
        <div className="overflow-hidden rounded-3xl border border-gray-100/50 bg-white shadow-apple-soft">
          <div className="border-b border-gray-100 px-6 py-5">
            <Skeleton className="h-4 w-20 rounded-lg" />
          </div>
          <div className="p-6 space-y-5">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="flex items-center gap-4">
              <Skeleton circle className="h-20 w-20" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded-lg" />
                <Skeleton className="h-3 w-40 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
        {/* Info card */}
        <div className="overflow-hidden rounded-3xl border border-gray-100/50 bg-white shadow-apple-soft">
          <div className="border-b border-gray-100 px-6 py-5">
            <Skeleton className="h-4 w-32 rounded-lg" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}
          </div>
        </div>
        {/* Social card */}
        <div className="overflow-hidden rounded-3xl border border-gray-100/50 bg-white shadow-apple-soft">
          <div className="border-b border-gray-100 px-6 py-5">
            <Skeleton className="h-4 w-28 rounded-lg" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}
          </div>
        </div>
        {/* Geo card */}
        <div className="overflow-hidden rounded-3xl border border-gray-100/50 bg-white shadow-apple-soft">
          <div className="border-b border-gray-100 px-6 py-5">
            <Skeleton className="h-4 w-36 rounded-lg" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}
          </div>
        </div>
        <Skeleton className="h-14 w-full rounded-full" />
      </div>
    </div>
  )
}
