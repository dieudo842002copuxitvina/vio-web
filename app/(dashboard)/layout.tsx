import { redirect }              from 'next/navigation'
import type { ReactNode }          from 'react'
import { createClient }            from '@/lib/supabase/server'
import { getActiveSubscription }   from '@/features/billing/api/subscription.server'
import { DashboardSidebar }        from './_components/DashboardSidebar'
import { DashboardBottomNav }      from './_components/DashboardBottomNav'

// ── Dashboard layout ──────────────────────────────────────────────────────────
// Server component — fetches auth + subscription once, passes down as props.
// DashboardSidebar and DashboardBottomNav are client components (usePathname).
//
// Routes covered (all inside app/(dashboard)/):
//   /quan-ly, /tin-dang-cua-toi, /tin-da-luu, /tim-kiem-da-luu,
//   /goi-thanh-vien, /ho-so-ca-nhan
//   (legacy: /phan-tich, /quan-ly-leads, /dang-tin, /ho-so, /nang-cap)

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')

  const [subscription] = await Promise.all([
    getActiveSubscription(user.id),
  ])

  const isPro        = subscription?.plan_id === 'pro' && subscription?.status === 'active'
  const displayName  = user.user_metadata?.full_name
    ?? user.email?.split('@')[0]
    ?? 'Bạn'
  const email = user.email ?? ''

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">

      {/* ── Desktop sidebar ───────────────────────────────────────── */}
      <DashboardSidebar
        displayName={displayName}
        email={email}
        isPro={isPro}
      />

      {/* ── Main content ──────────────────────────────────────────── */}
      {/* pb clears bottom nav on mobile */}
      <main className="min-w-0 flex-1 pb-[calc(3.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-[1200px]">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────── */}
      <DashboardBottomNav />

    </div>
  )
}
