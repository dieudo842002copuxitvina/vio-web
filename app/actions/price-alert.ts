'use server'

import { createClient } from '@/lib/supabase/server'

export type PriceAlertResult =
  | { success: true }
  | { success: false; error: string; requiresLogin?: boolean }

// ── createPriceAlert ──────────────────────────────────────────────────────────
// Saves a price-alert saved-search for the authenticated user.
// Returns requiresLogin=true when called unauthenticated.

export async function createPriceAlert(listingId: string): Promise<PriceAlertResult> {
  if (!listingId?.trim()) return { success: false, error: 'Thiếu ID tin đăng.' }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Vui lòng đăng nhập để theo dõi giá.', requiresLogin: true }
    }

    // Check for duplicate alert
    const { data: existing } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', user.id)
      .contains('filters_json', { listing_id: listingId, price_alert: true })
      .maybeSingle()

    if (existing) return { success: true }

    const { error } = await supabase.from('saved_searches').insert({
      user_id:      user.id,
      name:         `Theo dõi giá — ${listingId}`,
      filters_json: { listing_id: listingId, price_alert: true },
    })

    if (error) {
      console.error('[createPriceAlert]', error.message)
      return { success: false, error: 'Không thể lưu thông báo. Vui lòng thử lại.' }
    }

    return { success: true }
  } catch (err) {
    console.error('[createPriceAlert]', err)
    return { success: false, error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' }
  }
}
