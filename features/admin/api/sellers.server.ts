'use server'

import { revalidatePath }    from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { writeAuditLog }     from './audit.server'
import {
  refreshSellerTrustScore,
}                            from '@/features/merchant/api/seller-trust.server'
import { grantPro, revokePro } from '@/features/billing/api/admin.server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminSellerRow {
  id:            string
  full_name:     string | null
  email:         string | null
  is_verified:   boolean
  is_admin:      boolean
  created_at:    string
  listing_count: number
  plan_id:       string | null
  trust_tier:    string | null
  total_score:   number | null
}

// ── listSellers ───────────────────────────────────────────────────────────────

export async function listSellers(
  page   = 1,
  search = '',
): Promise<{ items: AdminSellerRow[]; total: number }> {
  const supabase = await createAdminClient()
  const limit = 30
  const from  = (page - 1) * limit

  let q = supabase
    .from('profiles')
    .select('id, full_name, email, is_verified, is_admin, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (search) {
    q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data, count } = await q
  const profiles = (data ?? []) as unknown as {
    id: string; full_name: string | null; email: string | null
    is_verified: boolean; is_admin: boolean; created_at: string
  }[]

  const ids = profiles.map(p => p.id)
  if (ids.length === 0) return { items: [], total: 0 }

  const [listingCounts, subscriptions, trustScores] = await Promise.all([
    // Active listing count per seller
    supabase
      .from('listings')
      .select('owner_id')
      .in('owner_id', ids)
      .in('status', ['published', 'draft']),
    // Subscription plan
    supabase
      .from('subscriptions')
      .select('profile_id, plan_id')
      .in('profile_id', ids)
      .eq('status', 'active'),
    // Trust scores
    supabase
      .from('seller_trust_scores')
      .select('user_id, tier, total_score')
      .in('user_id', ids),
  ])

  const listingCountMap = new Map<string, number>()
  for (const r of (listingCounts.data ?? []) as { owner_id: string }[]) {
    listingCountMap.set(r.owner_id, (listingCountMap.get(r.owner_id) ?? 0) + 1)
  }

  const subMap = new Map(
    ((subscriptions.data ?? []) as { profile_id: string; plan_id: string }[])
      .map(s => [s.profile_id, s.plan_id]),
  )

  const trustMap = new Map(
    ((trustScores.data ?? []) as { user_id: string; tier: string; total_score: number }[])
      .map(t => [t.user_id, t]),
  )

  const items: AdminSellerRow[] = profiles.map(p => ({
    ...p,
    listing_count: listingCountMap.get(p.id) ?? 0,
    plan_id:       subMap.get(p.id) ?? null,
    trust_tier:    trustMap.get(p.id)?.tier ?? null,
    total_score:   trustMap.get(p.id)?.total_score ?? null,
  }))

  return { items, total: count ?? 0 }
}

// ── verifySeller ───────────────────────────────────────────────────────────────

export async function verifySeller(
  userId:  string,
  adminId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return { ok: false, error: error.message }

  // Refresh trust score in background (non-blocking)
  void refreshSellerTrustScore(userId)
  await writeAuditLog('seller.verify', 'seller', userId, adminId)
  revalidatePath('/admin/sellers')
  return { ok: true }
}

// ── suspendSeller ──────────────────────────────────────────────────────────────

export async function suspendSeller(
  userId:  string,
  adminId: string,
  reason:  string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient()

  // Hide all published listings
  const { error } = await supabase
    .from('listings')
    .update({ is_public: false, moderation_status: 'hidden', updated_at: new Date().toISOString() })
    .eq('owner_id', userId)
    .eq('is_public', true)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('seller.suspend', 'seller', userId, adminId, { reason })
  revalidatePath('/admin/sellers')
  return { ok: true }
}

// ── adminGrantPro ──────────────────────────────────────────────────────────────

export async function adminGrantPro(
  profileId: string,
  adminId:   string,
  days?:     number,
): Promise<{ ok: boolean; error?: string }> {
  const result = await grantPro(profileId, adminId, days)
  if (result.ok) {
    await writeAuditLog('seller.grant_pro', 'seller', profileId, adminId, { days })
  }
  return result
}

// ── adminRevokePro ─────────────────────────────────────────────────────────────

export async function adminRevokePro(
  profileId: string,
  adminId:   string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await revokePro(profileId)
  if (result.ok) {
    await writeAuditLog('seller.revoke_pro', 'seller', profileId, adminId)
  }
  return result
}
