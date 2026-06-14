'use server'

import { revalidatePath } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'

export async function saveSearch(
  label:    string,
  queryUrl: string,
  filters:  Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'auth' }

  const { error } = await supabase.from('saved_searches').insert({
    user_id:   user.id,
    label:     label.trim().slice(0, 120) || 'Tìm kiếm đất nông nghiệp',
    query_url: queryUrl,
    filters,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/tim-kiem-da-luu')
  return { success: true }
}

export async function deleteSearch(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'auth' }

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/tim-kiem-da-luu')
  return { success: true }
}
