import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getSubscriptionFeatures,
  getListingCount,
}                        from '@/features/billing/api/subscription.server'

// ── Listing creation quota gate ───────────────────────────────────────────────
// Server component — runs before the client-side listing form is rendered.
// If the user has reached their plan limit, they are redirected to the
// upgrade page instead of seeing the creation form.

export default async function DangTinLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')

  const [features, count] = await Promise.all([
    getSubscriptionFeatures(user.id),
    getListingCount(user.id),
  ])

  if (count >= features.maxListings) {
    redirect(`/nang-cap?reason=listing_limit&current=${count}&max=${features.maxListings}`)
  }

  return <>{children}</>
}
