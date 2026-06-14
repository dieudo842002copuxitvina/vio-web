'use server'

import { createAdminClient, createCachedClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProvinceLiquidityScore {
  province_id:     number
  province_slug:   string
  province_name:   string
  score:           number
  grade:           'A' | 'B' | 'C' | 'D'
  supply_score:    number
  demand_score:    number
  activity_score:  number
  conversion_score: number
  active_listings: number
  active_sellers:  number
  leads_30d:       number
  saved_searches:  number
  visits_30d:      number
  total_leads:     number
  won_30d:         number
  computed_at:     string
}

export interface FunnelStep {
  label:    string
  count:    number
  pct:      number
}

export interface SupplyDemandStats {
  active_listings:   number
  unique_sellers:    number
  unique_agencies:   number
  leads_30d:         number
  saved_searches:    number
  returning_buyers:  number
  leads_per_listing: number
}

// ── getProvinceLiquidityScores ────────────────────────────────────────────────

export async function getProvinceLiquidityScores(
  limit = 63,
): Promise<ProvinceLiquidityScore[]> {
  const supabase = await createCachedClient()

  const { data, error } = await supabase
    .from('province_liquidity_scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getProvinceLiquidityScores]', error.message)
    return []
  }

  return (data ?? []) as unknown as ProvinceLiquidityScore[]
}

// ── refreshAllScores ──────────────────────────────────────────────────────────

export async function refreshAllLiquidityScores(): Promise<void> {
  const admin = await createAdminClient()
  await (admin.rpc as unknown as (fn: string) => Promise<unknown>)(
    'refresh_all_liquidity_scores',
  )
}

// ── getConversionFunnel ───────────────────────────────────────────────────────
// View → Save → Contact → Visit → Won

export async function getConversionFunnel(
  provinceId?: number,
  days = 30,
): Promise<FunnelStep[]> {
  const supabase = await createCachedClient()
  const since    = new Date(Date.now() - days * 86_400_000).toISOString()

  // Build listing filter
  let listingQuery = supabase.from('listings').select('id').eq('is_public', true)
  if (provinceId) listingQuery = listingQuery.eq('province_id', provinceId)
  const { data: listingRows } = await listingQuery.limit(5000)
  const ids = (listingRows ?? []).map((r: { id: string }) => r.id)

  if (ids.length === 0) {
    return [
      { label: 'Xem tin', count: 0, pct: 100 },
      { label: 'Lưu',     count: 0, pct: 0   },
      { label: 'Liên hệ', count: 0, pct: 0   },
      { label: 'Xem đất', count: 0, pct: 0   },
      { label: 'Thành công', count: 0, pct: 0 },
    ]
  }

  const [viewsRes, savesRes, contactsRes, visitsRes, wonRes] = await Promise.all([
    // Views: lead_events any type (proxy for impressions)
    supabase.from('lead_events').select('id', { count: 'exact', head: true })
      .in('listing_id', ids).gte('created_at', since),
    // Saves
    supabase.from('lead_events').select('id', { count: 'exact', head: true })
      .in('listing_id', ids).eq('event_type', 'save').gte('created_at', since),
    // Contact (chat + call)
    supabase.from('lead_events').select('id', { count: 'exact', head: true })
      .in('listing_id', ids).in('event_type', ['chat_click', 'call_click']).gte('created_at', since),
    // Visit requests
    supabase.from('visit_requests').select('id', { count: 'exact', head: true })
      .in('listing_id', ids).gte('created_at', since),
    // Won deals
    supabase.from('crm_leads').select('id', { count: 'exact', head: true })
      .in('listing_id', ids).eq('stage', 'won').gte('updated_at', since),
  ])

  const steps = [
    { label: 'Xem tin',    count: viewsRes.count   ?? 0 },
    { label: 'Lưu',        count: savesRes.count   ?? 0 },
    { label: 'Liên hệ',    count: contactsRes.count ?? 0 },
    { label: 'Xem đất',    count: visitsRes.count  ?? 0 },
    { label: 'Thành công', count: wonRes.count      ?? 0 },
  ]

  const top = steps[0].count || 1
  return steps.map(s => ({ ...s, pct: Math.round((s.count / top) * 100) }))
}

// ── getMarketplaceSupplyDemand ────────────────────────────────────────────────

export async function getMarketplaceSupplyDemand(): Promise<SupplyDemandStats> {
  const supabase = await createCachedClient()
  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [listingsRes, sellersRes, agenciesRes, leadsRes, savedRes, returningRes] =
    await Promise.all([
      supabase.from('listings').select('id', { count: 'exact', head: true })
        .eq('is_public', true).eq('moderation_status', 'approved'),
      supabase.from('listings').select('owner_id').eq('is_public', true).eq('moderation_status', 'approved'),
      supabase.from('listings').select('agency_id').eq('is_public', true).not('agency_id', 'is', null),
      supabase.from('lead_events').select('id', { count: 'exact', head: true })
        .gte('created_at', since30d),
      supabase.from('saved_searches').select('id', { count: 'exact', head: true }),
      supabase.from('lead_events').select('profile_id').gte('created_at', since30d).not('profile_id', 'is', null),
    ])

  const activeListings  = listingsRes.count ?? 0
  const uniqueSellers   = new Set((sellersRes.data ?? []).map((r: { owner_id: string }) => r.owner_id)).size
  const uniqueAgencies  = new Set((agenciesRes.data ?? []).map((r: { agency_id: string }) => r.agency_id)).size
  const leads30d        = leadsRes.count ?? 0
  const savedSearches   = savedRes.count ?? 0

  // Returning buyers: buyers with >1 event
  const buyerCounts = new Map<string, number>()
  ;(returningRes.data ?? []).forEach((r: { profile_id: string }) => {
    buyerCounts.set(r.profile_id, (buyerCounts.get(r.profile_id) ?? 0) + 1)
  })
  const returningBuyers = [...buyerCounts.values()].filter(c => c > 1).length

  return {
    active_listings:   activeListings,
    unique_sellers:    uniqueSellers,
    unique_agencies:   uniqueAgencies,
    leads_30d:         leads30d,
    saved_searches:    savedSearches,
    returning_buyers:  returningBuyers,
    leads_per_listing: activeListings > 0 ? Math.round((leads30d / activeListings) * 10) / 10 : 0,
  }
}
