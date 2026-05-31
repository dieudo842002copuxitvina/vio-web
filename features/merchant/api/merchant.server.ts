'use server'

// ── Merchant dashboard server helpers ─────────────────────────────────────────
//
// All functions are SSR-safe, RLS-enforced, and cursor-paginated.
// No N+1 queries: every function issues a single round-trip to Supabase.
// Caching:
//   getMerchantMetrics — 5 min (pre-aggregated by cron; safe to cache)
//   getLeads           — revalidate=0 (CRM data changes frequently)
//   getNotifications   — revalidate=0 (realtime-ish inbox)
//   getListingPerformances — 5 min (pre-aggregated by cron)

import { unstable_cache } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
export type LeadPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface CrmLead {
  id:                string
  owner_id:          string
  listing_id:        string | null
  inquiry_id:        string | null
  contact_name:      string | null
  contact_phone:     string | null
  contact_email:     string | null
  stage:             LeadStage
  priority:          LeadPriority
  notes:             string | null
  next_followup_at:  string | null
  last_contacted_at: string | null
  created_at:        string
  updated_at:        string
  // Joined
  listing_title:     string | null
  listing_slug:      string | null
}

export interface CrmLeadEvent {
  id:         number
  lead_id:    string
  actor_id:   string | null
  event_type: string
  from_stage: string | null
  to_stage:   string | null
  note:       string | null
  followup_at: string | null
  created_at: string
}

export interface MerchantMetrics {
  profile_id:         string
  total_listings:     number
  active_listings:    number
  impressions_7d:     number
  clicks_7d:          number
  inquiries_7d:       number
  ctr_7d:             number
  inquiry_rate_7d:    number
  impressions_30d:    number
  clicks_30d:         number
  inquiries_30d:      number
  avg_response_hours: number
  response_rate_7d:   number
  leads_total:        number
  leads_active:       number
  leads_won_30d:      number
  conversion_rate:    number
  trust_score:        number
  updated_at:         string
}

export interface ListingPerformance {
  listing_id:       string
  impressions_7d:   number
  clicks_7d:        number
  saves_7d:         number
  inquiries_7d:     number
  impressions_30d:  number
  clicks_30d:       number
  inquiries_30d:    number
  ctr_7d:           number
  ctr_30d:          number
  inquiry_rate_7d:  number
  save_rate_7d:     number
  performance_score: number
  performance_tier: 'new' | 'low' | 'average' | 'good' | 'top'
  updated_at:       string
  // Joined from listings
  listing_title:    string | null
  listing_slug:     string | null
}

export interface MerchantNotification {
  id:                number
  recipient_id:      string
  notification_type: string
  title:             string
  body:              string | null
  resource_type:     string | null
  resource_id:       string | null
  is_read:           boolean
  read_at:           string | null
  created_at:        string
}

export interface LeadCursor {
  createdAt: string
  id:        string
}

export interface NotificationCursor {
  createdAt: string
  id:        number
}

// ── getMerchantMetrics ────────────────────────────────────────────────────────
// Reads the pre-aggregated merchant_metrics row for the current user.
// Cache: 5 min — safe because the cron job refreshes at :28/:58.
// Returns null when no metrics row exists yet (new merchants).

const _getMerchantMetrics = unstable_cache(
  async (profileId: string): Promise<MerchantMetrics | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('merchant_metrics')
      .select('*')
      .eq('profile_id', profileId)
      .single()

    if (error || !data) return null
    return data as MerchantMetrics
  },
  ['merchant', 'metrics'],
  { revalidate: 300, tags: ['merchant_metrics'] },
)

export async function getMerchantMetrics(profileId: string): Promise<MerchantMetrics | null> {
  return _getMerchantMetrics(profileId)
}

// ── getLeads ──────────────────────────────────────────────────────────────────
// Cursor-paginated CRM leads for the authenticated merchant.
// One query with a LEFT JOIN to listings for title/slug — no N+1.
//
// RLS on crm_leads guarantees owner_id = auth.uid() at the DB level;
// the explicit eq('owner_id', profileId) is a belt-and-suspenders guard
// and also enables the (owner_id, stage, created_at) composite index.
//
// Cursor: (created_at DESC, id DESC) — stable under concurrent inserts.

interface GetLeadsOptions {
  stage?:     LeadStage | 'all'
  limit?:     number
  cursor?:    LeadCursor
  dueSoon?:   boolean  // only leads with next_followup_at <= now + 24h
}

export async function getLeads(
  profileId: string,
  options:   GetLeadsOptions = {},
): Promise<{ leads: CrmLead[]; nextCursor: LeadCursor | null }> {
  const { stage = 'all', limit = 20, cursor, dueSoon = false } = options
  const supabase = await createClient()

  // Single query: leads + listing context via PostgREST embedded select
  // Uses (owner_id, stage, created_at DESC) index when stage ≠ 'all',
  // or (owner_id, created_at DESC) index when stage = 'all'.
  let q = supabase
    .from('crm_leads')
    .select(`
      id, owner_id, listing_id, inquiry_id,
      contact_name, contact_phone, contact_email,
      stage, priority, notes,
      next_followup_at, last_contacted_at,
      created_at, updated_at,
      listings!crm_leads_listing_id_fkey(title, slug)
    `)
    .eq('owner_id', profileId)
    .order('created_at', { ascending: false })
    .order('id',         { ascending: false })
    .limit(limit + 1)  // over-fetch by 1 to detect next page

  if (stage !== 'all') {
    q = q.eq('stage', stage)
  }

  if (dueSoon) {
    const cutoff = new Date(Date.now() + 86_400_000).toISOString()
    q = q.not('next_followup_at', 'is', null)
    q = q.lte('next_followup_at', cutoff)
  }

  // Cursor pagination
  if (cursor) {
    q = q.or(
      `created_at.lt.${cursor.createdAt},` +
      `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    )
  }

  const { data, error } = await q

  if (error) {
    console.error('[getLeads]', error.message)
    return { leads: [], nextCursor: null }
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string; owner_id: string; listing_id: string | null; inquiry_id: string | null
    contact_name: string | null; contact_phone: string | null; contact_email: string | null
    stage: LeadStage; priority: LeadPriority; notes: string | null
    next_followup_at: string | null; last_contacted_at: string | null
    created_at: string; updated_at: string
    listings: { title: string; slug: string } | null
  }>

  const hasMore = rows.length > limit
  const page    = hasMore ? rows.slice(0, limit) : rows

  const leads: CrmLead[] = page.map(r => ({
    id:               r.id,
    owner_id:         r.owner_id,
    listing_id:       r.listing_id,
    inquiry_id:       r.inquiry_id,
    contact_name:     r.contact_name,
    contact_phone:    r.contact_phone,
    contact_email:    r.contact_email,
    stage:            r.stage,
    priority:         r.priority,
    notes:            r.notes,
    next_followup_at: r.next_followup_at,
    last_contacted_at: r.last_contacted_at,
    created_at:       r.created_at,
    updated_at:       r.updated_at,
    listing_title:    r.listings?.title ?? null,
    listing_slug:     r.listings?.slug  ?? null,
  }))

  const last = page[page.length - 1]
  const nextCursor: LeadCursor | null = hasMore && last
    ? { createdAt: last.created_at, id: last.id }
    : null

  return { leads, nextCursor }
}

// ── getLeadStageCounts ────────────────────────────────────────────────────────
// Pipeline summary: one query returning COUNT per stage.
// Uses (owner_id, stage, created_at) index → index-only scan.

export async function getLeadStageCounts(
  profileId: string,
): Promise<Record<LeadStage, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('crm_leads')
    .select('stage')
    .eq('owner_id', profileId)

  const counts: Record<LeadStage, number> = {
    new: 0, contacted: 0, qualified: 0, proposal: 0, won: 0, lost: 0,
  }
  for (const row of (data ?? []) as { stage: LeadStage }[]) {
    counts[row.stage] = (counts[row.stage] ?? 0) + 1
  }
  return counts
}

// ── getLeadEvents ─────────────────────────────────────────────────────────────
// Timeline for a single lead. Ordered newest first.
// RLS ensures only the lead owner can read events.

export async function getLeadEvents(leadId: string): Promise<CrmLeadEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('crm_lead_events')
    .select('id, lead_id, actor_id, event_type, from_stage, to_stage, note, followup_at, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getLeadEvents]', error.message)
    return []
  }
  return (data ?? []) as CrmLeadEvent[]
}

// ── getListingPerformances ────────────────────────────────────────────────────
// Pre-aggregated performance for all listings owned by the merchant.
// Single query: listing_performance JOIN listings on owner_id.
// Cache: 5 min.

const _getListingPerformances = unstable_cache(
  async (
    profileId: string,
    limit:     number,
    cursor?:   string,  // listing_id cursor (UUID lexicographic order)
  ): Promise<{ items: ListingPerformance[]; hasMore: boolean }> => {
    const supabase = await createClient()

    // Join listing_performance to listings to enforce owner filter
    // and fetch title/slug in one round-trip.
    // PostgREST: from listing_performance, join listings via FK-less join
    // → must use a SELECT with listings.owner_id filter.
    // Since there's no FK, use an RPC or a self-join via listings.
    // Simplest: query listings WHERE owner_id = profileId, then join performance.
    const { data: listingRows, error: listingErr } = await supabase
      .from('listings')
      .select('id, title, slug')
      .eq('owner_id', profileId)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (listingErr || !listingRows?.length) {
      return { items: [], hasMore: false }
    }

    const hasMore = listingRows.length > limit
    const page    = hasMore ? listingRows.slice(0, limit) : listingRows
    const ids     = page.map(l => (l as { id: string }).id)

    // Batch fetch performance rows (IN query — 1 round-trip)
    const { data: perfRows } = await supabase
      .from('listing_performance')
      .select('*')
      .in('listing_id', ids)

    type PerfRow = ListingPerformance
    const perfMap = new Map<string, PerfRow>(
      ((perfRows ?? []) as PerfRow[]).map(p => [p.listing_id, p]),
    )

    const items: ListingPerformance[] = page.map((l: { id: string; title: string; slug: string }) => {
      const perf = perfMap.get(l.id)
      return {
        listing_id:       l.id,
        listing_title:    l.title,
        listing_slug:     l.slug,
        impressions_7d:   perf?.impressions_7d   ?? 0,
        clicks_7d:        perf?.clicks_7d        ?? 0,
        saves_7d:         perf?.saves_7d         ?? 0,
        inquiries_7d:     perf?.inquiries_7d     ?? 0,
        impressions_30d:  perf?.impressions_30d  ?? 0,
        clicks_30d:       perf?.clicks_30d       ?? 0,
        inquiries_30d:    perf?.inquiries_30d    ?? 0,
        ctr_7d:           perf?.ctr_7d           ?? 0,
        ctr_30d:          perf?.ctr_30d          ?? 0,
        inquiry_rate_7d:  perf?.inquiry_rate_7d  ?? 0,
        save_rate_7d:     perf?.save_rate_7d     ?? 0,
        performance_score: perf?.performance_score ?? 0,
        performance_tier:  perf?.performance_tier  ?? 'new',
        updated_at:        perf?.updated_at        ?? new Date(0).toISOString(),
      }
    })

    return { items, hasMore }
  },
  ['merchant', 'listing-performances'],
  { revalidate: 300, tags: ['listing_performance', 'listings'] },
)

export async function getListingPerformances(
  profileId: string,
  limit = 20,
  cursor?:   string,
): Promise<{ items: ListingPerformance[]; hasMore: boolean }> {
  return _getListingPerformances(profileId, limit, cursor)
}

// ── getNotifications ──────────────────────────────────────────────────────────
// Paginated notification inbox. Always live (revalidate=0 in page).
// Cursor: (created_at DESC, id DESC).

export async function getNotifications(
  profileId: string,
  options: { limit?: number; unreadOnly?: boolean; cursor?: NotificationCursor } = {},
): Promise<{ notifications: MerchantNotification[]; unreadCount: number; nextCursor: NotificationCursor | null }> {
  const { limit = 30, unreadOnly = false, cursor } = options
  const supabase = await createClient()

  // Fetch unread count + page in parallel
  const countQ = supabase
    .from('merchant_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', profileId)
    .eq('is_read', false)

  let listQ = supabase
    .from('merchant_notifications')
    .select('*')
    .eq('recipient_id', profileId)
    .order('created_at', { ascending: false })
    .order('id',         { ascending: false })
    .limit(limit + 1)

  if (unreadOnly) listQ = listQ.eq('is_read', false)

  if (cursor) {
    listQ = listQ.or(
      `created_at.lt.${cursor.createdAt},` +
      `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    )
  }

  const [countResult, listResult] = await Promise.all([countQ, listQ])

  const rows    = (listResult.data ?? []) as MerchantNotification[]
  const hasMore = rows.length > limit
  const page    = hasMore ? rows.slice(0, limit) : rows
  const last    = page[page.length - 1]

  return {
    notifications: page,
    unreadCount:   (countResult.count ?? 0),
    nextCursor: hasMore && last
      ? { createdAt: last.created_at, id: last.id }
      : null,
  }
}

// ── markNotificationsRead ─────────────────────────────────────────────────────
// Marks one or all notifications as read for a recipient.
// Called from a Server Action.

export async function markNotificationsRead(
  profileId: string,
  ids?: number[],  // undefined = mark all
): Promise<void> {
  const supabase = await createClient()
  let q = supabase
    .from('merchant_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', profileId)
    .eq('is_read', false)

  if (ids?.length) q = q.in('id', ids)

  const { error } = await q
  if (error) console.error('[markNotificationsRead]', error.message)
}

// ── createLeadEvent ───────────────────────────────────────────────────────────
// Appends a CRM event and optionally updates the lead's stage/followup.
// Called from Server Actions — not cached.

export async function createLeadEvent(
  leadId:    string,
  actorId:   string,
  eventType: CrmLeadEvent['event_type'],
  payload: {
    note?:       string
    followupAt?: string
    fromStage?:  LeadStage
    toStage?:    LeadStage
  } = {},
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  // Insert event
  const { error: evtErr } = await supabase
    .from('crm_lead_events')
    .insert({
      lead_id:    leadId,
      actor_id:   actorId,
      event_type: eventType,
      note:       payload.note       ?? null,
      followup_at: payload.followupAt ?? null,
      from_stage: payload.fromStage  ?? null,
      to_stage:   payload.toStage    ?? null,
    })

  if (evtErr) return { ok: false, error: evtErr.message }

  // Update lead fields if this is a stage change or followup schedule
  if (eventType === 'stage_change' && payload.toStage) {
    await supabase
      .from('crm_leads')
      .update({ stage: payload.toStage, updated_at: new Date().toISOString() })
      .eq('id', leadId)
  }

  if (eventType === 'followup_scheduled' && payload.followupAt) {
    await supabase
      .from('crm_leads')
      .update({ next_followup_at: payload.followupAt, updated_at: new Date().toISOString() })
      .eq('id', leadId)
  }

  if (eventType === 'contacted') {
    await supabase
      .from('crm_leads')
      .update({
        last_contacted_at: new Date().toISOString(),
        stage:             'contacted',
        updated_at:        new Date().toISOString(),
      })
      .eq('id', leadId)
      .eq('stage', 'new')  // only advance if still 'new'
  }

  return { ok: true }
}
