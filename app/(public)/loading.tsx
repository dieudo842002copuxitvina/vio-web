// Skeleton shell shown by Next.js during streaming / slow data fetches.
// Mirrors the grid layout of most public listing pages so the transition
// feels like a native iOS skeleton (no layout shift on content arrival).

export default function Loading() {
  return (
    <div className="animate-pulse mx-auto max-w-6xl px-4 md:px-8 pt-6 pb-20">

      {/* ── Page title skeleton ───────────────────────────────────────────── */}
      <div className="mb-8 space-y-3">
        <div className="h-4 w-24 rounded-full bg-gray-200" />
        <div className="h-9 w-64 rounded-2xl bg-gray-200" />
        <div className="h-4 w-48 rounded-xl bg-gray-200" />
      </div>

      {/* ── Category pills skeleton ───────────────────────────────────────── */}
      <div className="mb-8 flex gap-2 overflow-hidden">
        {[80, 96, 72, 88, 64].map((w, i) => (
          <div
            key={i}
            className="h-9 shrink-0 rounded-full bg-gray-200"
            style={{ width: w }}
          />
        ))}
      </div>

      {/* ── Card grid skeleton ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
            {/* Image placeholder */}
            <div className="h-44 w-full bg-gray-200" />
            {/* Text lines */}
            <div className="space-y-2.5 p-5">
              <div className="h-4 w-3/4 rounded-lg bg-gray-200" />
              <div className="h-3.5 w-1/2 rounded-lg bg-gray-200" />
              <div className="flex gap-2 pt-1">
                <div className="h-6 w-16 rounded-full bg-gray-200" />
                <div className="h-6 w-20 rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
