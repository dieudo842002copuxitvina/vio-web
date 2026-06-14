'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { writeAuditLog }     from './audit.server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FraudSignal {
  id:          number
  signal_type: string
  entity_type: string
  entity_id:   string
  metadata:    Record<string, unknown> | null
  status:      string
  created_at:  string
}

export interface DuplicatePhoneSignal {
  contact_phone: string
  listing_ids:   string[]
  owner_ids:     string[]
  listing_count: number
}

export interface PriceOutlierSignal {
  listing_id:     string
  slug:           string
  title:          string
  price_amount:   number
  province_id:    number | null
  land_type:      string | null
  province_median: number
  deviation_pct:  number
}

export interface VelocitySignal {
  owner_id:       string
  owner_name:     string | null
  listing_count:  number
  window_hours:   number
}

// ── detectDuplicatePhones ─────────────────────────────────────────────────────

export async function detectDuplicatePhones(): Promise<DuplicatePhoneSignal[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('listings')
    .select('id, owner_id, contact_phone')
    .not('contact_phone', 'is', null)
    .in('status', ['published', 'draft'])
    .eq('is_public', true)

  const rows = (data ?? []) as { id: string; owner_id: string; contact_phone: string }[]

  // Group by phone
  const phoneMap = new Map<string, { listing_ids: string[]; owner_ids: string[] }>()
  for (const r of rows) {
    const phone = r.contact_phone.replace(/\s/g, '')
    if (!phoneMap.has(phone)) phoneMap.set(phone, { listing_ids: [], owner_ids: [] })
    const entry = phoneMap.get(phone)!
    entry.listing_ids.push(r.id)
    if (!entry.owner_ids.includes(r.owner_id)) entry.owner_ids.push(r.owner_id)
  }

  // Only flag when multiple distinct owners share the same phone
  return Array.from(phoneMap.entries())
    .filter(([, v]) => v.owner_ids.length > 1)
    .map(([phone, v]) => ({
      contact_phone: phone,
      listing_ids:   v.listing_ids,
      owner_ids:     v.owner_ids,
      listing_count: v.listing_ids.length,
    }))
    .slice(0, 50)
}

// ── detectPriceOutliers ────────────────────────────────────────────────────────

export async function detectPriceOutliers(): Promise<PriceOutlierSignal[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('listings')
    .select('id, slug, title, price_amount, province_id, type')
    .not('price_amount', 'is', null)
    .eq('moderation_status', 'approved')
    .eq('is_public', true)
    .order('price_amount', { ascending: false })
    .limit(500)

  const rows = (data ?? []) as {
    id: string; slug: string; title: string
    price_amount: number; province_id: number | null; type: string
  }[]

  // Compute median per (province_id, type) group
  const groups = new Map<string, number[]>()
  for (const r of rows) {
    const key = `${r.province_id ?? 0}_${r.type}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r.price_amount)
  }

  function median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
  }

  const outliers: PriceOutlierSignal[] = []
  for (const r of rows) {
    const key = `${r.province_id ?? 0}_${r.type}`
    const groupPrices = groups.get(key) ?? []
    if (groupPrices.length < 5) continue  // not enough data

    const med = median(groupPrices)
    const deviationPct = Math.abs((r.price_amount - med) / med) * 100

    if (deviationPct > 300) {  // flag if > 3× deviation from median
      outliers.push({
        listing_id:      r.id,
        slug:            r.slug,
        title:           r.title,
        price_amount:    r.price_amount,
        province_id:     r.province_id,
        land_type:       r.type,
        province_median: Math.round(med),
        deviation_pct:   Math.round(deviationPct),
      })
    }
  }

  return outliers.sort((a, b) => b.deviation_pct - a.deviation_pct).slice(0, 30)
}

// ── detectVelocityAbuse ────────────────────────────────────────────────────────

export async function detectVelocityAbuse(
  windowHours = 24,
  threshold   = 20,
): Promise<VelocitySignal[]> {
  const supabase = await createAdminClient()
  const since = new Date(Date.now() - windowHours * 3_600_000).toISOString()

  const { data } = await supabase
    .from('listings')
    .select('owner_id, id')
    .gte('created_at', since)

  const rows = (data ?? []) as { owner_id: string; id: string }[]

  // Count per owner
  const ownerCounts = new Map<string, number>()
  for (const r of rows) {
    ownerCounts.set(r.owner_id, (ownerCounts.get(r.owner_id) ?? 0) + 1)
  }

  const abusers = Array.from(ownerCounts.entries())
    .filter(([, count]) => count >= threshold)
    .map(([ownerId, count]) => ({ owner_id: ownerId, count }))

  if (abusers.length === 0) return []

  // Fetch owner names
  const ownerIds = abusers.map(a => a.owner_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ownerIds)

  const nameMap = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name]),
  )

  return abusers.map(a => ({
    owner_id:      a.owner_id,
    owner_name:    nameMap.get(a.owner_id) ?? null,
    listing_count: a.count,
    window_hours:  windowHours,
  }))
}

// ── getFraudSignals ────────────────────────────────────────────────────────────

export async function getFraudSignals(
  status = 'open',
  limit  = 50,
): Promise<FraudSignal[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('fraud_signals')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as unknown as FraudSignal[]
}

// ── dismissFraudSignal ─────────────────────────────────────────────────────────

export async function dismissFraudSignal(
  signalId: string,
  adminId:  string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('fraud_signals')
    .update({
      status:       'dismissed',
      dismissed_by: adminId,
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', signalId)

  if (error) return { ok: false, error: error.message }
  await writeAuditLog('fraud.dismiss', 'fraud_signal', signalId, adminId)
  return { ok: true }
}

// ── recordFraudSignal ──────────────────────────────────────────────────────────

export async function recordFraudSignal(
  signalType: string,
  entityType: string,
  entityId:   string,
  metadata?:  Record<string, unknown>,
): Promise<void> {
  const supabase = await createAdminClient()

  // Dedup: don't insert if an open signal of same type+entity already exists
  const { data: existing } = await supabase
    .from('fraud_signals')
    .select('id')
    .eq('signal_type',  signalType)
    .eq('entity_type',  entityType)
    .eq('entity_id',    entityId)
    .eq('status',       'open')
    .single()

  if (existing) return

  await supabase.from('fraud_signals').insert({
    signal_type: signalType,
    entity_type: entityType,
    entity_id:   entityId,
    metadata:    metadata ?? null,
  })
}
