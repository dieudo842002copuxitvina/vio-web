'use server'

import { revalidatePath } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'
import type { SavedSearchFilters, NotificationFrequency, SavedSearch } from '../types'

// ── saveSearch ────────────────────────────────────────────────────────────────

export async function saveSearch(
  label:                   string,
  queryUrl:                string,
  filters:                 SavedSearchFilters,
  notificationEnabled?:    boolean,
  notificationFrequency?:  NotificationFrequency,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'auth' }

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id:                user.id,
      label:                  label.trim().slice(0, 120) || 'Tìm kiếm đất nông nghiệp',
      query_url:              queryUrl,
      filters:                filters as Record<string, unknown>,
      notification_enabled:   notificationEnabled  ?? false,
      notification_frequency: notificationFrequency ?? 'daily',
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/tim-kiem-da-luu')
  return { success: true, id: (data as { id: string }).id }
}

// ── deleteSearch ──────────────────────────────────────────────────────────────

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

// ── updateNotificationSettings ────────────────────────────────────────────────

export async function updateNotificationSettings(
  id:                      string,
  notificationEnabled:     boolean,
  notificationFrequency?:  NotificationFrequency,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'auth' }

  const { error } = await supabase
    .from('saved_searches')
    .update({
      notification_enabled:   notificationEnabled,
      notification_frequency: notificationFrequency ?? 'daily',
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/tim-kiem-da-luu')
  return { success: true }
}

// ── getSavedSearches ──────────────────────────────────────────────────────────

export async function getSavedSearches(): Promise<SavedSearch[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('saved_searches')
    .select('id, user_id, label, query_url, filters, notification_enabled, notification_frequency, last_notified_at, match_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getSavedSearches]', error.message)
    return []
  }

  return (data ?? []) as unknown as SavedSearch[]
}
