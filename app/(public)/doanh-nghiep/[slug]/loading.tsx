// Skeleton shell matching the exact layout of the Business Profile page.
// Rendered by Next.js during streaming before the Server Component resolves.

export default function BusinessProfileLoading() {
  return (
    <div className="animate-pulse">

      {/* ── Hero ── */}
      <div className="h-64 w-full bg-gray-200 md:h-80" />

      <div className="mx-auto max-w-4xl px-4 pb-24 md:px-8">

        {/* Breadcrumb skeleton */}
        <div className="mb-6 flex items-center gap-2 pt-4">
          <div className="h-3 w-16 rounded-full bg-gray-200" />
          <div className="h-3 w-2 rounded-full bg-gray-200" />
          <div className="h-3 w-20 rounded-full bg-gray-200" />
          <div className="h-3 w-2 rounded-full bg-gray-200" />
          <div className="h-3 w-32 rounded-full bg-gray-200" />
        </div>

        {/* ── Avatar ── */}
        <div className="-mt-20 mb-4 pl-1">
          <div className="h-24 w-24 rounded-full bg-gray-300 ring-4 ring-white" />
        </div>

        {/* ── Name + badge ── */}
        <div className="mb-6 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-56 rounded-2xl bg-gray-200" />
            <div className="h-5 w-20 rounded-full bg-gray-200" />
          </div>
          <div className="h-4 w-40 rounded-xl bg-gray-200" />
        </div>

        {/* ── Description card ── */}
        <div className="mb-4 overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="h-4 w-24 rounded-lg bg-gray-200" />
          </div>
          <div className="space-y-2.5 p-6">
            <div className="h-3.5 w-full rounded-lg bg-gray-200" />
            <div className="h-3.5 w-full rounded-lg bg-gray-200" />
            <div className="h-3.5 w-3/4 rounded-lg bg-gray-200" />
          </div>
        </div>

        {/* ── Contact card ── */}
        <div className="mb-4 overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="h-4 w-16 rounded-lg bg-gray-200" />
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="h-3 w-16 rounded-full bg-gray-200" />
                <div className="h-5 w-32 rounded-lg bg-gray-200" />
              </div>
              {/* Call Now button skeleton */}
              <div className="h-11 w-28 rounded-xl bg-gray-200" />
            </div>
          </div>
        </div>

        {/* ── Address card ── */}
        <div className="mb-8 overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="h-4 w-16 rounded-lg bg-gray-200" />
          </div>
          <div className="p-6">
            <div className="h-4 w-64 rounded-lg bg-gray-200" />
          </div>
        </div>

        {/* ── Products grid skeleton ── */}
        <div className="mb-2 flex items-center gap-3">
          <div className="h-4 w-20 rounded-lg bg-gray-200" />
          <div className="h-px flex-1 bg-gray-100" />
        </div>
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-200" />
          ))}
        </div>

      </div>
    </div>
  )
}
