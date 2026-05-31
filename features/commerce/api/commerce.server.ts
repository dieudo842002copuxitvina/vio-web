'use server'

// ── Local Commerce Graph — discovery feeds ────────────────────────────────────
//
// All reads are against pre-aggregated tables populated by pg_cron every 30 min.
// Zero runtime graph traversal — every edge was computed ahead of time.
//
// Cache strategy:
//   Trending / market-gap feeds  — 30 min (matches cron cadence)
//   Merchant similarity          — 30 min
//   Buyer interests              — live (revalidate=0 caller-side) or 5 min
//   Wholesale requests           — 5 min (changes when users post requests)
//   Logistics routes             — 30 min (stable trade patterns)

import { unstable_cache } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrendingRegion {
  province_id:    number
  category_id:    number
  demand_score:   number
  trend_7d:       number        // > 1.0 = accelerating; < 1.0 = cooling
  searches_7d:    number
  inquiries_7d:   number
  views_7d:       number
  updated_at:     string
}

export interface UnderservedMarket {
  province_id:       number
  category_id:       number
  gap_score:         number
  opportunity_score: number
  gap_tier:          'critical' | 'high' | 'medium' | 'low'
  demand_score_7d:   number
  supply_score:      number
  listing_count:     number
  merchant_count:    number
  updated_at:        string
}

export interface RelatedMerchant {
  merchant_id:        string
  similarity_score:   number
  similarity_type:    'competitor' | 'complementary' | 'co_buyer' | 'cross_region'
  shared_provinces:   number
  shared_categories:  number
  shared_buyer_count: number
}

export interface WholesaleRequest {
  id:                   number
  requester_id:         string
  category_id:          number
  province_id:          number | null
  title:                string
  quantity_text:        string | null
  budget_min:           number | null
  budget_max:           number | null
  status:               'open' | 'matched' | 'closed' | 'expired'
  matched_merchant_id:  string | null
  expires_at:           string
  created_at:           string
}

export interface BuyerInterest {
  interest_type:  'province' | 'category'
  interest_key:   string
  decayed_weight: number
  event_count:    number
  last_seen_at:   string
}

export interface MarketGap {
  province_id:       number
  category_id:       number
  gap_score:         number
  opportunity_score: number
  gap_tier:          string
}

export interface LogisticsRoute {
  origin_province_id:      number
  destination_province_id: number
  route_strength:          number
  inquiry_count:           number
  listing_count:           number
  estimated_days:          number | null
  is_active:               boolean
  last_active_at:          string | null
}

export interface MerchantRelationship {
  counterpart_id:       string
  relationship_type:    string
  strength:             number
  shared_province_count: number
  shared_category_count: number
  last_seen_at:         string
}

export interface SupplyDensity {
  province_id:             number
  category_id:             number
  active_listing_count:    number
  merchant_count:          number
  verified_merchant_count: number
  avg_price_amount:        number | null
  supply_score:            number
  saturation_level:        'undersupplied' | 'balanced' | 'oversupplied'
  updated_at:              string
}

// ── getTrendingRegions ────────────────────────────────────────────────────────
// Province × category combos with the highest demand trend vs 30-day baseline.
// trend_7d = searches_7d / (searches_30d / 4) — values > 1 indicate demand spikes.
//
// Use cases: homepage "hot regions" banner, category nav highlights.

const _getTrendingRegions = unstable_cache(
  async (limit: number): Promise<TrendingRegion[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('regional_demand_signals')
      .select(
        'province_id, category_id, demand_score, trend_7d, searches_7d, inquiries_7d, views_7d, updated_at',
      )
      .gt('demand_score', 0)
      .order('trend_7d',     { ascending: false })
      .order('demand_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getTrendingRegions]', error.message)
      return []
    }
    return (data ?? []) as TrendingRegion[]
  },
  ['commerce', 'trending-regions'],
  { revalidate: 1800, tags: ['regional_demand_signals'] },
)

export function getTrendingRegions(limit = 10): Promise<TrendingRegion[]> {
  return _getTrendingRegions(limit)
}

// ── getUnderservedMarkets ─────────────────────────────────────────────────────
// Province × category combos with high demand but low supply.
// Ranked by opportunity_score = LEAST(100, gap_score × 20).
//
// Use cases: merchant onboarding "where to list" suggestion,
//            SEO gap pages (province × category landing pages).

const _getUnderservedMarkets = unstable_cache(
  async (limit: number): Promise<UnderservedMarket[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('market_gap_scores')
      .select(
        'province_id, category_id, gap_score, opportunity_score, gap_tier, demand_score_7d, supply_score, listing_count, merchant_count, updated_at',
      )
      .in('gap_tier', ['critical', 'high'])
      .order('opportunity_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getUnderservedMarkets]', error.message)
      return []
    }
    return (data ?? []) as UnderservedMarket[]
  },
  ['commerce', 'underserved-markets'],
  { revalidate: 1800, tags: ['market_gap_scores'] },
)

export function getUnderservedMarkets(limit = 10): Promise<UnderservedMarket[]> {
  return _getUnderservedMarkets(limit)
}

// ── getMarketGapsByProvince ───────────────────────────────────────────────────
// Category-level gap analysis for a single province.
// Used on province landing pages to surface which categories are undersupplied.

const _getMarketGapsByProvince = unstable_cache(
  async (provinceId: number, limit: number): Promise<MarketGap[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('market_gap_scores')
      .select('province_id, category_id, gap_score, opportunity_score, gap_tier')
      .eq('province_id', provinceId)
      .in('gap_tier', ['critical', 'high', 'medium'])
      .order('opportunity_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getMarketGapsByProvince]', provinceId, error.message)
      return []
    }
    return (data ?? []) as MarketGap[]
  },
  ['commerce', 'gaps-by-province'],
  { revalidate: 1800, tags: ['market_gap_scores'] },
)

export function getMarketGapsByProvince(provinceId: number, limit = 10): Promise<MarketGap[]> {
  return _getMarketGapsByProvince(provinceId, limit)
}

// ── getRelatedMerchants ───────────────────────────────────────────────────────
// Merchants similar to a given merchant — competitor / complementary / partner.
// Derived from category Jaccard + province Jaccard + co-buyer sessions.
//
// Use cases: merchant profile "similar sellers", partnership suggestions,
//            competitor intelligence panel.

const _getRelatedMerchants = unstable_cache(
  async (merchantId: string, limit: number): Promise<RelatedMerchant[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('merchant_similarity')
      .select(
        'merchant_a_id, merchant_b_id, similarity_score, similarity_type, shared_provinces, shared_categories, shared_buyer_count',
      )
      .or(`merchant_a_id.eq.${merchantId},merchant_b_id.eq.${merchantId}`)
      .order('similarity_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getRelatedMerchants]', merchantId, error.message)
      return []
    }

    return ((data ?? []) as {
      merchant_a_id:      string
      merchant_b_id:      string
      similarity_score:   number
      similarity_type:    'competitor' | 'complementary' | 'co_buyer' | 'cross_region'
      shared_provinces:   number
      shared_categories:  number
      shared_buyer_count: number
    }[]).map(r => ({
      merchant_id:        r.merchant_a_id === merchantId ? r.merchant_b_id : r.merchant_a_id,
      similarity_score:   r.similarity_score,
      similarity_type:    r.similarity_type,
      shared_provinces:   r.shared_provinces,
      shared_categories:  r.shared_categories,
      shared_buyer_count: r.shared_buyer_count,
    }))
  },
  ['commerce', 'related-merchants'],
  { revalidate: 1800, tags: ['merchant_similarity'] },
)

export function getRelatedMerchants(merchantId: string, limit = 6): Promise<RelatedMerchant[]> {
  return _getRelatedMerchants(merchantId, limit)
}

// ── getMerchantRelationships ──────────────────────────────────────────────────
// All relationship edges for a merchant — structured graph view.
// Includes relationship type metadata for rendering partner/competitor labels.

const _getMerchantRelationships = unstable_cache(
  async (merchantId: string, limit: number): Promise<MerchantRelationship[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('merchant_relationships')
      .select(
        'merchant_a_id, merchant_b_id, relationship_type, strength, shared_province_count, shared_category_count, last_seen_at',
      )
      .or(`merchant_a_id.eq.${merchantId},merchant_b_id.eq.${merchantId}`)
      .order('strength', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getMerchantRelationships]', merchantId, error.message)
      return []
    }

    return ((data ?? []) as {
      merchant_a_id:         string
      merchant_b_id:         string
      relationship_type:     string
      strength:              number
      shared_province_count: number
      shared_category_count: number
      last_seen_at:          string
    }[]).map(r => ({
      counterpart_id:        r.merchant_a_id === merchantId ? r.merchant_b_id : r.merchant_a_id,
      relationship_type:     r.relationship_type,
      strength:              r.strength,
      shared_province_count: r.shared_province_count,
      shared_category_count: r.shared_category_count,
      last_seen_at:          r.last_seen_at,
    }))
  },
  ['commerce', 'merchant-relationships'],
  { revalidate: 1800, tags: ['merchant_relationships'] },
)

export function getMerchantRelationships(merchantId: string, limit = 20): Promise<MerchantRelationship[]> {
  return _getMerchantRelationships(merchantId, limit)
}

// ── getWholesaleOpportunities ─────────────────────────────────────────────────
// Open wholesale/bulk requests — B2B marketplace feed.
// Optionally filtered by category and/or province.
// Cache 5 min — requests can change when users post new ones.

interface WholesaleOptions {
  categoryId?: number
  provinceId?: number
  limit?:      number
}

const _getWholesaleOpportunities = unstable_cache(
  async (categoryId: number | null, provinceId: number | null, limit: number): Promise<WholesaleRequest[]> => {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('wholesale_requests')
      .select('*')
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (categoryId !== null) q = q.eq('category_id', categoryId)
    if (provinceId !== null) q = q.eq('province_id', provinceId)

    const { data, error } = await q
    if (error) {
      console.error('[getWholesaleOpportunities]', error.message)
      return []
    }
    return (data ?? []) as WholesaleRequest[]
  },
  ['commerce', 'wholesale'],
  { revalidate: 300, tags: ['wholesale_requests'] },
)

export function getWholesaleOpportunities(opts: WholesaleOptions = {}): Promise<WholesaleRequest[]> {
  const { categoryId = null, provinceId = null, limit = 20 } = opts
  return _getWholesaleOpportunities(categoryId, provinceId, limit)
}

// ── createWholesaleRequest ────────────────────────────────────────────────────
// Posts a new bulk/wholesale request. Called from a Server Action.

export async function createWholesaleRequest(data: {
  requesterId:    string
  categoryId:     number
  provinceId?:    number
  title:          string
  quantityText?:  string
  budgetMin?:     number
  budgetMax?:     number
  expiresAt?:     string
}): Promise<{ ok: boolean; id?: number; error?: string }> {
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('wholesale_requests')
    .insert({
      requester_id:  data.requesterId,
      category_id:   data.categoryId,
      province_id:   data.provinceId   ?? null,
      title:         data.title,
      quantity_text: data.quantityText ?? null,
      budget_min:    data.budgetMin    ?? null,
      budget_max:    data.budgetMax    ?? null,
      expires_at:    data.expiresAt
                     ?? new Date(Date.now() + 30 * 86_400_000).toISOString(),
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: (row as { id: number }).id }
}

// ── getBuyerInterests ─────────────────────────────────────────────────────────
// Top decayed-weight interest edges for a buyer.
// Used in personalised discovery and recommendation layers.
//
// buyerType 'profile' — authenticated user, stable key across sessions.
// buyerType 'session' — anonymous, key = session_id.
//
// Note: no unstable_cache here — buyer interests should always be fresh.

export async function getBuyerInterests(
  buyerId:   string,
  buyerType: 'profile' | 'session',
  limit = 10,
): Promise<BuyerInterest[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('buyer_interest_edges')
    .select('interest_type, interest_key, decayed_weight, event_count, last_seen_at')
    .eq('buyer_id',   buyerId)
    .eq('buyer_type', buyerType)
    .gt('decayed_weight', 0.01)
    .order('decayed_weight', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getBuyerInterests]', buyerId, error.message)
    return []
  }
  return (data ?? []) as BuyerInterest[]
}

// ── getLogisticsRoutes ────────────────────────────────────────────────────────
// Active trade routes from or to a province.
// route_strength reflects both volume (inquiry count) and recency (90-day decay).
//
// Use cases: province commerce page "top trade partners",
//            merchant delivery radius hints.

const _getLogisticsRoutes = unstable_cache(
  async (provinceId: number): Promise<LogisticsRoute[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('logistics_routes')
      .select(
        'origin_province_id, destination_province_id, route_strength, inquiry_count, listing_count, estimated_days, is_active, last_active_at',
      )
      .or(`origin_province_id.eq.${provinceId},destination_province_id.eq.${provinceId}`)
      .eq('is_active', true)
      .order('route_strength', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[getLogisticsRoutes]', provinceId, error.message)
      return []
    }
    return (data ?? []) as LogisticsRoute[]
  },
  ['commerce', 'logistics-routes'],
  { revalidate: 1800, tags: ['logistics_routes'] },
)

export function getLogisticsRoutes(provinceId: number): Promise<LogisticsRoute[]> {
  return _getLogisticsRoutes(provinceId)
}

// ── getSupplyDensityByProvince ────────────────────────────────────────────────
// Per-category supply breakdown for a province.
// Used to annotate province pages with saturation levels.

const _getSupplyDensityByProvince = unstable_cache(
  async (provinceId: number, limit: number): Promise<SupplyDensity[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('regional_supply_density')
      .select(
        'province_id, category_id, active_listing_count, merchant_count, verified_merchant_count, avg_price_amount, supply_score, saturation_level, updated_at',
      )
      .eq('province_id', provinceId)
      .order('supply_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getSupplyDensityByProvince]', provinceId, error.message)
      return []
    }
    return (data ?? []) as SupplyDensity[]
  },
  ['commerce', 'supply-density-by-province'],
  { revalidate: 1800, tags: ['regional_supply_density'] },
)

export function getSupplyDensityByProvince(provinceId: number, limit = 20): Promise<SupplyDensity[]> {
  return _getSupplyDensityByProvince(provinceId, limit)
}
