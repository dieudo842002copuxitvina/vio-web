'use server'

import { revalidatePath }    from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { writeAuditLog }     from './audit.server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PendingListing {
  id:               string
  slug:             string
  title:            string
  province_id:      number | null
  location_text:    string | null
  price_text:       string | null
  contact_phone:    string | null
  moderation_status: string
  created_at:       string
  owner_id:         string | null
  completeness_tier: string | null
  owner_name:       string | null
  owner_email:      string | null
}

// ── getPendingListings ─────────────────────────────────────────────────────────

export async function getPendingListings(
  page  = 1,
  limit = 20,
): Promise<{ items: PendingListing[]; total: number }> {
  const supabase = await createAdminClient()
  const from = (page - 1) * limit

  const { data, count } = await supabase
    .from('listings')
    .select(
      'id, slug, title, province_id, location_text, price_text, contact_phone, moderation_status, created_at, owner_id',
      { count: 'exact' },
    )
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: true })
    .range(from, from + limit - 1)

  const rows = (data ?? []) as unknown as PendingListing[]

  // Attach completeness tier and owner info
  const ownerIds   = [...new Set(rows.map(r => r.owner_id).filter(Boolean))] as string[]
  const listingIds = rows.map(r => r.id)

  const [profilesRes, completenessRes] = await Promise.all([
    ownerIds.length > 0
      ? supabase.from('profiles').select('id, full_name, email').in('id', ownerIds)
      : Promise.resolve({ data: [] }),
    supabase.from('listing_completeness').select('listing_id, tier').in('listing_id', listingIds),
  ])

  const profileMap = new Map(
    ((profilesRes.data ?? []) as { id: string; full_name: string | null; email: string | null }[])
      .map(p => [p.id, p]),
  )
  const tierMap = new Map(
    ((completenessRes.data ?? []) as { listing_id: string; tier: string }[])
      .map(c => [c.listing_id, c.tier]),
  )

  const items = rows.map(r => ({
    ...r,
    completeness_tier: tierMap.get(r.id) ?? null,
    owner_name:        profileMap.get(r.owner_id ?? '')?.full_name ?? null,
    owner_email:       profileMap.get(r.owner_id ?? '')?.email ?? null,
  }))

  return { items, total: count ?? 0 }
}

// ── approveListing ─────────────────────────────────────────────────────────────

export async function approveListing(
  listingId: string,
  adminId:   string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('listings')
    .update({
      moderation_status: 'approved',
      is_public:         true,
      published_at:      new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    })
    .eq('id', listingId)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('listing.approve', 'listing', listingId, adminId)
  revalidatePath('/admin/moderation')
  revalidatePath('/')
  return { ok: true }
}

// ── rejectListing ──────────────────────────────────────────────────────────────

export async function rejectListing(
  listingId: string,
  adminId:   string,
  reason:    string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('listings')
    .update({
      moderation_status: 'rejected',
      is_public:         false,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', listingId)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('listing.reject', 'listing', listingId, adminId, { reason })
  revalidatePath('/admin/moderation')
  return { ok: true }
}

// ── hideListing ────────────────────────────────────────────────────────────────

export async function hideListing(
  listingId: string,
  adminId:   string,
  reason:    string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('listings')
    .update({
      moderation_status: 'hidden',
      is_public:         false,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', listingId)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('listing.hide', 'listing', listingId, adminId, { reason })
  revalidatePath('/admin/moderation')
  return { ok: true }
}

// ── getModerationStats ─────────────────────────────────────────────────────────

export async function getModerationStats(): Promise<{
  pending:  number
  approved: number
  rejected: number
  hidden:   number
}> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('listings')
    .select('moderation_status')
    .in('moderation_status', ['pending', 'approved', 'rejected', 'hidden'])

  const rows = (data ?? []) as { moderation_status: string }[]
  const counts = { pending: 0, approved: 0, rejected: 0, hidden: 0 }
  for (const r of rows) {
    const k = r.moderation_status as keyof typeof counts
    if (k in counts) counts[k]++
  }
  return counts
}
