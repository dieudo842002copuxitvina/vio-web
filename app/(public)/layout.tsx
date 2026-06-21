import { Suspense }        from 'react'
import type { ReactNode }  from 'react'
import Link                from 'next/link'

import { ShellProvider }   from './_components/ShellProvider'
import { TopNav }          from './_components/TopNav'
import { MobileHeader }    from './_components/MobileHeader'
import { SearchModal }     from './_components/SearchModal'
import { BottomTabBar }    from './_components/bottom-tab-bar'
import { Footer }          from '../_components/Footer'
import {
  UserMenuServer,
  UserMenuSkeleton,
}                          from './_components/UserMenuServer'

// ── Public layout ─────────────────────────────────────────────────────────────
// Wraps all public-facing routes: /dat-nong-nghiep, /tinh, /ban-do,
// /doanh-nghiep, /membership, /dang-nhap, etc.
//
// Shell components:
//   TopNav       — desktop sticky header, 64px
//   MobileHeader — mobile sticky header, 56px
//   MobileDrawer — rendered inside MobileHeader, slide-in from right
//   SearchModal  — full-screen search overlay, opened via ShellProvider context
//   BottomTabBar — mobile quick-nav, 49px + safe area
//   Footer       — full-width footer
//
// authSlot is a Suspense-wrapped server component tree that resolves to either
// a "Đăng nhập" link or a user avatar dropdown. It is constructed once here and
// passed as a ReactNode prop to both nav bars (RSC composition pattern).

export default function PublicLayout({ children }: { children: ReactNode }) {
  const authSlot = (
    <Suspense fallback={<UserMenuSkeleton />}>
      <UserMenuServer />
    </Suspense>
  )

  return (
    <ShellProvider>

      {/* ── Accessibility: skip-to-content ────────────────────────────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4
                   focus:z-[9999] focus:rounded-xl focus:bg-vio-primary focus:px-4
                   focus:py-2 focus:text-sm focus:font-bold focus:text-white
                   focus:no-underline focus:shadow-lg"
      >
        Chuyển đến nội dung chính
      </a>

      {/* ── Desktop navigation: 64px ──────────────────────────────────── */}
      <TopNav authSlot={authSlot} />

      {/* ── Mobile navigation: 56px top bar + slide-in drawer ─────────── */}
      <MobileHeader authSlot={authSlot} />

      {/* ── Global search overlay (portal-style, triggered by context) ── */}
      <SearchModal />

      {/* ── Page content ──────────────────────────────────────────────── */}
      {/* pt-14: clears 56px MobileHeader on mobile                       */}
      {/* md:pt-16: clears 64px TopNav on desktop                         */}
      {/* pb-[calc(3.5rem+env(safe-area-inset-bottom))]: clears BottomTabBar */}
      {/* md:pb-0: no bottom clearance needed on desktop                  */}
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-[#FBFBFD]
                   pt-14 pb-[calc(3.5rem+env(safe-area-inset-bottom))]
                   md:pt-16 md:pb-0
                   focus-visible:outline-none"
      >
        {children}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      {/* pb-[3.5rem]: prevent footer from being hidden behind BottomTabBar */}
      <div className="pb-[3.5rem] md:pb-0">
        <Footer />
      </div>

      {/* ── Floating "Đăng tin" button — mobile only ─────────────────── */}
      {/* Positioned above the BottomTabBar, hidden on desktop           */}
      <div
        className="pointer-events-none fixed inset-x-0 z-30 flex justify-center md:hidden"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 12px)' }}
      >
        <Link
          href="/dang-tin-dat"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#1A4D2E] px-5 py-3 text-[14px] font-bold text-white shadow-[0_4px_20px_rgba(26,77,46,0.35)] no-underline active:scale-[0.97] transition-transform"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Đăng tin
        </Link>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      <BottomTabBar />

    </ShellProvider>
  )
}
