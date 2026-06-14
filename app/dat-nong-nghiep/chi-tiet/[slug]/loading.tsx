export default function LandDetailLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Gallery */}
      <div className="h-[56vw] max-h-[520px] min-h-[260px] animate-pulse rounded-b-[2rem] bg-neutral-200" />

      {/* Sticky bar */}
      <div className="sticky top-0 z-30 border-b border-neutral-100 bg-white px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-4 py-3">
          <div className="h-6 w-24 animate-pulse rounded-xl bg-neutral-100" />
          <div className="h-4 w-px bg-neutral-200" />
          <div className="h-4 w-20 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          {/* Content */}
          <div className="space-y-8">
            <div className="flex gap-2">
              {[1, 2, 3].map(i => <div key={i} className="h-3 w-16 animate-pulse rounded-full bg-neutral-100" />)}
            </div>
            <div className="space-y-2">
              <div className="h-9 w-5/6 animate-pulse rounded-xl bg-neutral-200" />
              <div className="h-9 w-3/4 animate-pulse rounded-xl bg-neutral-200" />
              <div className="mt-2 h-4 w-48 animate-pulse rounded-lg bg-neutral-100" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />)}
            </div>
            <div className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="animate-pulse rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5">
              <div className="h-9 w-32 rounded-xl bg-neutral-100" />
              <div className="h-4 w-24 rounded-lg bg-neutral-100" />
              <div className="h-px bg-neutral-100" />
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-neutral-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-28 rounded-lg bg-neutral-100" />
                  <div className="h-3 w-20 rounded-lg bg-neutral-100" />
                </div>
              </div>
              <div className="h-px bg-neutral-100" />
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-neutral-100" />)}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile CTA placeholder */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white px-4 py-3 lg:hidden"
           style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />)}
        </div>
      </div>
    </div>
  )
}
