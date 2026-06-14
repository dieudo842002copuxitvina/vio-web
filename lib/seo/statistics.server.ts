'use server'

import { createCachedClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MarketStats {
  listing_count:    number
  avg_price_per_m2: number | null  // VND per m²
  median_price_vnd: number | null  // total asking price
  price_min_vnd:    number | null
  price_max_vnd:    number | null
  new_this_month:   number         // published in the last 30 days
  pct_with_legal:   number         // 0–100: % listings with sổ đỏ / sổ hồng
}

export interface MarketStatsFilters {
  provinceId?: number
  districtId?: number
  landType?:   string   // 'lua' | 'rau_mau' | 'cay_lau_nam' | 'cay_an_trai' | 'lam_nghiep' | 'mat_nuoc' | 'hon_hop'
}

// ── getMarketStats ─────────────────────────────────────────────────────────────
// Returns real market statistics for a given geography × land type combination.
// Consumed by province, district, and province+type SEO pages.

export async function getMarketStats(filters: MarketStatsFilters): Promise<MarketStats> {
  const supabase  = await createCachedClient()
  const monthAgo  = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString()

  // Build base query for approved public listings
  let q = supabase
    .from('listings')
    .select('price_amount, published_at', { count: 'exact' })
    .eq('is_public', true)
    .eq('moderation_status', 'approved')

  if (filters.provinceId) q = q.eq('province_id', filters.provinceId)
  if (filters.districtId) q = q.eq('district_id',  filters.districtId)
  if (filters.landType)   q = q.eq('land_type',     filters.landType)

  const { data: rows, count } = await q.limit(2_000)

  if (!rows || count === 0) {
    return {
      listing_count:    0,
      avg_price_per_m2: null,
      median_price_vnd: null,
      price_min_vnd:    null,
      price_max_vnd:    null,
      new_this_month:   0,
      pct_with_legal:   0,
    }
  }

  const listing_count = count ?? rows.length

  // Prices
  const priced = rows
    .map(r => (r as unknown as { price_amount: number | null }).price_amount)
    .filter((p): p is number => typeof p === 'number' && p > 0)
    .sort((a, b) => a - b)

  const price_min_vnd    = priced.length ? priced[0]                           : null
  const price_max_vnd    = priced.length ? priced[priced.length - 1]           : null
  const median_price_vnd = priced.length
    ? priced[Math.floor(priced.length / 2)]
    : null

  // new this month
  const new_this_month = rows.filter(r => {
    const pub = (r as unknown as { published_at: string | null }).published_at
    return pub && pub >= monthAgo
  }).length

  // avg price per m² — fetch area attributes for the same listings
  // We use a simple heuristic: query listing_attribute_values for area_m2
  // and join with price_amount in JS to compute ratio
  let avg_price_per_m2: number | null = null
  let pct_with_legal = 0

  try {
    // Fetch area_m2 attribute values for the current batch of listings
    // We limit to first 500 to avoid huge joins
    let areaQ = supabase
      .from('listing_attribute_values')
      .select('listing_id, value_numeric')
      .eq('attribute_key', 'area_m2')
      .not('value_numeric', 'is', null)
      .limit(500)

    if (filters.provinceId || filters.districtId || filters.landType) {
      // Build listing IDs from our already-fetched rows (first 500)
      const ids = rows.slice(0, 500).map(r => (r as unknown as { id?: string }).id).filter(Boolean) as string[]
      if (ids.length) areaQ = areaQ.in('listing_id', ids)
    }

    const { data: areaRows } = await areaQ
    if (areaRows?.length) {
      // Build a map: listing_id → area_m2
      const areaMap: Record<string, number> = {}
      for (const ar of areaRows) {
        areaMap[(ar as unknown as { listing_id: string }).listing_id] =
          (ar as unknown as { value_numeric: number }).value_numeric
      }

      // For each listing that has both price and area, compute price/m²
      const ratios: number[] = []
      for (const r of rows.slice(0, 500)) {
        const lr   = r as unknown as { id?: string; price_amount: number | null }
        const area = lr.id ? areaMap[lr.id] : undefined
        if (area && area > 0 && lr.price_amount && lr.price_amount > 0) {
          ratios.push(lr.price_amount / area)
        }
      }
      if (ratios.length) {
        avg_price_per_m2 = Math.round(ratios.reduce((s, v) => s + v, 0) / ratios.length)
      }
    }

    // Legal ratio — listings with so_do / so_hong legal attribute
    let legalQ = supabase
      .from('listing_attribute_values')
      .select('listing_id')
      .eq('attribute_key', 'legal_status')
      .in('value_text', ['Sổ đỏ', 'Sổ hồng', 'so_do', 'so_hong'])
      .limit(2_000)

    if (filters.provinceId || filters.districtId || filters.landType) {
      const ids = rows.slice(0, 500).map(r => (r as unknown as { id?: string }).id).filter(Boolean) as string[]
      if (ids.length) legalQ = legalQ.in('listing_id', ids)
    }

    const { data: legalRows, count: legalCount } = await legalQ
    if (legalCount && listing_count > 0) {
      pct_with_legal = Math.round((legalCount / Math.min(listing_count, 500)) * 100)
    }
    void legalRows // suppress unused warning
  } catch {
    // Non-critical — return base stats without price/m² and legal ratio
  }

  return {
    listing_count,
    avg_price_per_m2,
    median_price_vnd,
    price_min_vnd,
    price_max_vnd,
    new_this_month,
    pct_with_legal,
  }
}
