import Link           from 'next/link'
import { BottomTabBar } from './_components/bottom-tab-bar'

// ── Public Layout ─────────────────────────────────────────────────────────────
// Wraps all public SEO pages: landing, listing index, listing detail, etc.
// Desktop: sticky TopNav at top
// Mobile:  fixed BottomTabBar at bottom

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* ── TopNav (desktop only) ─────────────────────────────────────────── */}
      <header
        className={[
          // Visibility
          'hidden md:flex',
          // Positioning
          'fixed top-0 inset-x-0 z-40',
          // Height
          'h-16',
          // Surface — glassmorphism
          'bg-white/80 backdrop-blur-md',
          // Bottom border hairline
          'border-b border-gray-100/60',
          // Layout
          'items-center',
        ].join(' ')}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6">

          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 text-lg font-bold tracking-tight text-gray-900 no-underline"
          >
            VIO LOCAL
          </Link>

          {/* Search bar placeholder */}
          <div className="flex flex-1 items-center">
            <div
              className={[
                'flex h-9 w-full max-w-md items-center gap-2',
                'rounded-xl bg-gray-100 px-3',
                'text-sm text-gray-400',
              ].join(' ')}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" aria-hidden="true"
                className="shrink-0 text-gray-400"
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
                <path
                  d="M16.5 16.5 21 21"
                  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
                />
              </svg>
              Tìm kiếm đất, khu vực...
            </div>
          </div>

          {/* Right actions */}
          <nav className="flex shrink-0 items-center gap-1">
            <Link
              href="/dat-nong-nghiep"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 no-underline transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Khám phá
            </Link>
            <Link
              href="/dang-tin"
              className={[
                'rounded-xl px-4 py-2',
                'bg-vio-primary text-white',
                'text-sm font-semibold no-underline',
                'transition-opacity hover:opacity-90',
              ].join(' ')}
            >
              Đăng tin
            </Link>
          </nav>

        </div>
      </header>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      {/* pt-16/20: clears TopNav on desktop  */}
      {/* pb-20:     clears BottomTabBar on mobile */}
      <main className="min-h-screen pt-0 pb-20 md:pt-16 md:pb-0">
        {children}
      </main>

      {/* ── BottomTabBar (mobile only) ────────────────────────────────────── */}
      <BottomTabBar />
    </>
  )
}
