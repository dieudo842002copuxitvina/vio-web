'use server'

// ── Admin billing actions ─────────────────────────────────────────────────────
//
// All functions use createAdminClient() (service role key) to bypass RLS.
// NEVER import this file in client components.
//
// grantPro              — upsert active Pro subscription for a profile
// revokePro             — cancel Pro → downgrade to Free
// activateFeaturedListing   — create/activate a featured slot for a listing
// deactivateFeaturedListing — cancel a featured slot

import { revalidateTag }     from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ── grantPro ──────────────────────────────────────────────────────────────────

export async function grantPro(
  profileId:    string,
  adminId:      string,
  durationDays?: number,  // undefined = no expiry
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient()
    const endsAt   = durationDays
      ? new Date(Date.now() + durationDays * 86_400_000).toISOString()
      : null

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          profile_id:           profileId,
          plan_id:              'pro',
          status:               'active',
          current_period_start: new Date().toISOString(),
          current_period_end:   endsAt,
          cancelled_at:         null,
          granted_by:           adminId,
          updated_at:           new Date().toISOString(),
        },
        { onConflict: 'profile_id' },
      )

    if (error) return { ok: false, error: error.message }
    revalidateTag('billing')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ── revokePro ─────────────────────────────────────────────────────────────────

export async function revokePro(
  profileId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_id:      'free',
        status:       'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .eq('profile_id', profileId)
      .eq('plan_id',    'pro')
      .eq('status',     'active')

    if (error) return { ok: false, error: error.message }
    revalidateTag('billing')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ── activateFeaturedListing ───────────────────────────────────────────────────

export async function activateFeaturedListing(
  listingId:     string,
  merchantId:    string,
  priorityScore: number,
  durationDays?: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient()
    const endsAt   = durationDays
      ? new Date(Date.now() + durationDays * 86_400_000).toISOString()
      : null

    const { error } = await supabase
      .from('featured_listings')
      .upsert(
        {
          listing_id:     listingId,
          merchant_id:    merchantId,
          starts_at:      new Date().toISOString(),
          ends_at:        endsAt,
          priority_score: priorityScore,
          status:         'active',
        },
        { onConflict: 'listing_id' },
      )

    if (error) return { ok: false, error: error.message }
    revalidateTag('billing')
    revalidateTag('listings')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ── deactivateFeaturedListing ─────────────────────────────────────────────────

export async function deactivateFeaturedListing(
  listingId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('featured_listings')
      .update({ status: 'cancelled' })
      .eq('listing_id', listingId)
      .eq('status', 'active')

    if (error) return { ok: false, error: error.message }
    revalidateTag('billing')
    revalidateTag('listings')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
