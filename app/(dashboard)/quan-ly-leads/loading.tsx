function CardSkeleton() {
  return (
    <div className="rounded-xl bg-white p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.07)] space-y-2.5 dark:bg-[#2C2C2E]">
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 w-28 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.06]" />
        <div className="h-3 w-8  animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.06]" />
      </div>
      <div className="h-3.5 w-32 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.06]" />
      <div className="h-3   w-40 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.06]" />
      <div className="flex gap-1.5 border-t border-gray-100 pt-2.5 dark:border-white/[0.06]">
        <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-white/[0.06]" />
      </div>
    </div>
  )
}

function ColumnSkeleton({ n }: { n: number }) {
  return (
    <div className="flex w-[272px] shrink-0 flex-col rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gray-200 dark:bg-white/[0.1]" />
          <div className="h-3.5 w-20 animate-pulse rounded-lg bg-gray-200 dark:bg-white/[0.1]" />
        </div>
        <div className="h-5 w-7 animate-pulse rounded-full bg-gray-200 dark:bg-white/[0.1]" />
      </div>
      <div className="flex flex-col gap-2 px-3 pb-3">
        {Array.from({ length: n }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  )
}

export default function QuanLyLeadsLoading() {
  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <div className="h-3 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-white/[0.06]" />
        <div className="h-9 w-52 animate-pulse rounded-xl bg-gray-200 dark:bg-white/[0.06]" />
      </div>

      {/* Pipeline strip */}
      <div className="mb-5 flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-28 animate-pulse rounded-full bg-gray-200 dark:bg-white/[0.06]" />
        ))}
      </div>

      {/* Kanban columns */}
      <div className="-mx-6 overflow-x-hidden md:-mx-10">
        <div className="flex gap-3 px-6 pb-6 md:px-10">
          <ColumnSkeleton n={3} />
          <ColumnSkeleton n={2} />
          <ColumnSkeleton n={1} />
          <ColumnSkeleton n={2} />
          <ColumnSkeleton n={1} />
        </div>
      </div>
    </div>
  )
}
