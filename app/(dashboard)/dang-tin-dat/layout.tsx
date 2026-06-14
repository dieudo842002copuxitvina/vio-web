import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getSubscriptionFeatures,
  getListingCount,
}                        from '@/features/billing/api/subscription.server'

export default async function DangTinDatLayout({
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
