'use server'

import { createCachedClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EcosystemStats {
  total_local_clicks:  number
  total_export_clicks: number
  top_provinces:       Array<{ province_slug: string; province_name: string; clicks: number }>
  top_listings:        Array<{ listing_id: string; title: string | null; slug: string | null; clicks: number }>
  period_days:         number
}

// ── getEcosystemClickStats ────────────────────────────────────────────────────

export async function getEcosystemClickStats(days = 30): Promise<EcosystemStats> {
  const supabase = await createCachedClient()
  const since    = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data: events, error } = await supabase
    .from('lead_events')
    .select('event_type, listing_id, created_at')
    .in('event_type', ['ecosystem_local_click', 'ecosystem_export_click'])
    .gte('created_at', since)
    .limit(5000)

  if (error) {
    console.error('[getEcosystemClickStats]', error.message)
    return {
      total_local_clicks: 0, total_export_clicks: 0,
      top_provinces: [], top_listings: [], period_days: days,
    }
  }

  const rows = (events ?? []) as Array<{ event_type: string; listing_id: string }>

  const totalLocal  = rows.filter(r => r.event_type === 'ecosystem_local_click').length
  const totalExport = rows.filter(r => r.event_type === 'ecosystem_export_click').length

  // Top listings by click count
  const listingCounts = new Map<string, number>()
  rows.forEach(r => listingCounts.set(r.listing_id, (listingCounts.get(r.listing_id) ?? 0) + 1))

  const topListingIds = [...listingCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  let topListings: EcosystemStats['top_listings'] = []
  if (topListingIds.length > 0) {
    const { data: listingRows } = await supabase
      .from('listings')
      .select('id, title, slug, province_id')
      .in('id', topListingIds)

    topListings = (listingRows ?? []).map((l: { id: string; title: string | null; slug: string | null }) => ({
      listing_id: l.id,
      title:      l.title,
      slug:       l.slug,
      clicks:     listingCounts.get(l.id) ?? 0,
    })).sort((a, b) => b.clicks - a.clicks)
  }

  // Top provinces from liquidity scores (as proxy — ecosystem events don't store province directly)
  const { data: provinceRows } = await supabase
    .from('province_liquidity_scores')
    .select('province_slug, province_name, leads_30d')
    .order('leads_30d', { ascending: false })
    .limit(5)

  const topProvinces = (provinceRows ?? []).map((p: {
    province_slug: string; province_name: string; leads_30d: number
  }) => ({
    province_slug: p.province_slug,
    province_name: p.province_name,
    clicks:        p.leads_30d,
  }))

  return {
    total_local_clicks:  totalLocal,
    total_export_clicks: totalExport,
    top_provinces:       topProvinces,
    top_listings:        topListings,
    period_days:         days,
  }
}
