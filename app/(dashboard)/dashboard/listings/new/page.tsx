import type { Metadata }    from 'next'
import { redirect }          from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { fetchProvinces }    from '@/features/search/api/land-search.server'
import { ListingWizard }     from './_components/ListingWizard'

export const metadata: Metadata = {
  title: 'Đăng tin mới — VIO AGRI',
  robots: { index: false, follow: false },
}

export default async function NewListingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap?next=/dashboard/listings/new')

  const provinces = await fetchProvinces()

  return (
    <ListingWizard
      userId={user.id}
      provinces={provinces}
    />
  )
}
