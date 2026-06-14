'use server'

import { createClient } from '@/lib/supabase/server'

export async function archiveListing(listingId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Không xác thực' }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'archived' })
    .eq('id', listingId)
    .eq('owner_id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
