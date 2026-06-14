// ── Regional Operating System — discovery feeds ───────────────────────────────
//
// Discovery Feeds V3: reads against pre-aggregated tables populated every 30 min
// by the pg_cron pipeline in supabase/migrations/018_regional_ops.sql.
//
// Cache strategy (all 1800s — matches cron cadence):
//   Market heatmaps / summaries / price / pressure / routes  — 30 min
//   Market events                                            — 10 min (events can be urgent)
//   Economic telemetry                                       — 30 min
//   Trusted merchant feed                                    — 30 min

import { unstable_cache }    from 'next/cache'
import { createCachedClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type HeatTier = 'hot' | 'warm' | 'cool' | 'cold'
export type MarketStatus =
  | 'hot_shortage' | 'hot_stable' | 'growing' | 'stable'
  | 'oversupplied' | 'declining'  | 'cold'
export type MarketEventType =
  | 'demand_spike' | 'shortage_alert' | 'oversupply_warning'
  | 'new_market_opened' | 'seasonal_peak' | 'price_anomaly'
  | 'high_liquidity' | 'trust_drop'
export type EventSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface HotMarket {
  province_id:         number
  category_id:         number
  heat_index:          number
  heat_tier:           HeatTier
  demand_score:        number
  liquidity_score:     number
  avg_trust_score:     number | null
  pressure_score:      number | null
  demand_component:    number
  scarcity_component:  number
  liquidity_component: number
  trust_component:     number
  updated_at:          string
}

export interface ShortageRegion {
  province_id:          number
  category_id:          number
  pressure_score:       number
  demand_score:         number
  supply_score:         number
  active_listing_count: number
  inquiries_7d:         number
  days_supply:          number | null
  shortage_flag:        boolean
  oversupply_flag:      boolean
  updated_at:           string
}

export interface HighLiquidityRegion {
  province_id:     number
  category_id:     number
  liquidity_score: number
  heat_index:      number
  heat_tier:       HeatTier
  demand_score:    number
  updated_at:      string
}

export interface TrustedMerchant {
  profile_id:          string
  trust_score:         number
  identity_verified:   boolean
  active_listings:     number
  avg_response_hours:  number
  updated_at:          string
}

export interface MarketEvent {
  id:             number
  event_type:     MarketEventType
  province_id:    number | null
  category_id:    number | null
  severity:       EventSeverity
  trigger_value:  number | null
  baseline_value: number | null
  metadata:       Record<string, unknown>
  detected_at:    string
  expires_at:     string
}

export interface RegionalSummary {
  province_id:         number
  category_id:         number
  heat_index:          number
  heat_tier:           HeatTier
  demand_score:        number
  trend_7d:            number
  searches_7d:         number
  inquiries_7d:        number
  supply_score:        number
  active_listings:     number
  merchant_count:      number
  median_price:        number | null
  price_trend_7d:      number
  pressure_score:      number
  shortage_flag:       boolean
  days_supply:         number | null
  opportunity_score:   number
  gap_tier:            string
  seasonal_multiplier: number
  market_status:       MarketStatus
  updated_at:          string
}

export interface EconomicTelemetryRow {
  province_id:      number
  telemetry_date:   string
  active_listings:  number
  new_listings:     number
  active_merchants: number
  searches:         number
  inquiries:        number
  inquiry_velocity: number
  liquidity_index:  number
  avg_trust_score:  number | null
  updated_at:       string
}

export interface PriceBenchmark {
  province_id:    number
  category_id:    number
  price_count:    number
  avg_price:      number | null
  median_price:   number | null
  p25_price:      number | null
  p75_price:      number | null
  fence_low:      number | null
  fence_high:     number | null
  avg_price_7d:   number | null
  avg_price_30d:  number | null
  price_trend_7d: number
  updated_at:     string
}

export interface InventoryPressure {
  province_id:          number
  category_id:          number
  demand_score:         number
  supply_score:         number
  pressure_score:       number
  active_listing_count: number
  inquiries_7d:         number
  days_supply:          number | null
  shortage_flag:        boolean
  oversupply_flag:      boolean
  updated_at:           string
}

export interface SupplyRoute {
  source_province_id:      number
  destination_province_id: number
  category_id:             number
  source_supply_score:     number
  source_active_listings:  number
  source_merchant_count:   number
  dest_demand_score:       number
  flow_strength:           number
  is_deficit_route:        boolean
  is_surplus_route:        boolean
  updated_at:              string
}

// ── getHotMarkets ─────────────────────────────────────────────────────────────
// Province × category combos with heat_tier = 'hot' (heat_index ≥ 70).
// Four-component heat: demand×30 + scarcity×25 + liquidity×30 + trust×15.
//
// Use cases: homepage "hot markets" banner, category attention signals.

const _getHotMarkets = unstable_cache(
  async (limit: number): Promise<HotMarket[]> => {
    const supabase = createCachedClient()
    const { data, error } = await supabase
      .from('regional_market_heatmaps')
      .select(
        'province_id, category_id, heat_index, heat_tier, demand_score, liquidity_score, avg_trust_score, pressure_score, demand_component, scarcity_component, liquidity_component, trust_component, updated_at',
      )
      .eq('heat_tier', 'hot')
      .order('heat_index', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getHotMarkets]', error.message)
      return []
    }
    return (data ?? []) as unknown as HotMarket[]
  },
  ['regional-ops', 'hot-markets'],
  { revalidate: 1800, tags: ['regional_market_heatmaps'] },
)

export function getHotMarkets(limit = 10): Promise<HotMarket[]> {
  return _getHotMarkets(limit)
}

// ── getShortageRegions ────────────────────────────────────────────────────────
// Province × category combos with active shortage (pressure_score < −0.30).
// Ordered by pressure_score ascending (most severe shortage first).
//
// Use cases: merchant "where to list" onboarding hint, supply gap alerts.

const _getShortageRegions = unstable_cache(
  async (limit: number): Promise<ShortageRegion[]> => {
    const supabase = createCachedClient()
    const { data, error } = await supabase
      .from('inventory_pressure_scores')
      .select(
        'province_id, category_id, pressure_score, demand_score, supply_score, active_listing_count, inquiries_7d, days_supply, shortage_flag, oversupply_flag, updated_at',
      )
      .eq('shortage_flag', true)
      .order('pressure_score', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[getShortageRegions]', error.message)
      return []
    }
    return (data ?? []) as unknown as ShortageRegion[]
  },
  ['regional-ops', 'shortage-regions'],
  { revalidate: 1800, tags: ['inventory_pressure_scores'] },
)

export function getShortageRegions(limit = 10): Promise<ShortageRegion[]> {
  return _getShortageRegions(limit)
}

// ── getHighLiquidityRegions ───────────────────────────────────────────────────
// Province × category combos with the highest inquiry-per-listing ratio.
// liquidity_score = inquiries_7d / GREATEST(1, active_listing_count).
//
// Use cases: "most active regions" widget, seller opportunity signal.

const _getHighLiquidityRegions = unstable_cache(
  async (limit: number): Promise<HighLiquidityRegion[]> => {
    const supabase = createCachedClient()
    const { data, error } = await supabase
      .from('regional_market_heatmaps')
      .select('province_id, category_id, liquidity_score, heat_index, heat_tier, demand_score, updated_at')
      .in('heat_tier', ['hot', 'warm'])
      .order('liquidity_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getHighLiquidityRegions]', error.message)
      return []
    }
    return (data ?? []) as unknown as HighLiquidityRegion[]
  },
  ['regional-ops', 'high-liquidity'],
  { revalidate: 1800, tags: ['regional_market_heatmaps'] },
)

export function getHighLiquidityRegions(limit = 10): Promise<HighLiquidityRegion[]> {
  return _getHighLiquidityRegions(limit)
}

// ── getTrustedMerchantFeed ────────────────────────────────────────────────────
// High-trust merchants (trust_score ≥ 60, not fraud-flagged), ordered by trust.
//
// Province filtering is available via get_trusted_merchants_by_province() RPC
// (migration 019_trust_quality.sql).  This function returns the global feed.
//
// Use cases: "verified sellers" widget, trust-first browse mode.

const _getTrustedMerchantFeed = unstable_cache(
  async (provinceId: number | null, limit: number): Promise<TrustedMerchant[]> => {
    const supabase = createCachedClient()

    if (provinceId !== null) {
      const { data, error } = await supabase.rpc('get_trusted_merchants_by_province', {
        p_province_id: provinceId,
        p_limit:       limit,
      })
      if (error) {
        console.error('[getTrustedMerchantFeed rpc]', provinceId, error.message)
        return []
      }
      return (data ?? []) as TrustedMerchant[]
    }

    const { data, error } = await supabase
      .from('merchant_trust_scores')
      .select('profile_id, trust_score, identity_verified, active_listings, avg_response_hours, updated_at')
      .eq('fraud_flag', false)
      .gte('trust_score', 60)
      .order('trust_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getTrustedMerchantFeed]', error.message)
      return []
    }
    return (data ?? []) as unknown as TrustedMerchant[]
  },
  ['regional-ops', 'trusted-merchants'],
  { revalidate: 1800, tags: ['merchant_trust_scores'] },
)

export function getTrustedMerchantFeed(provinceId: number | null = null, limit = 10): Promise<TrustedMerchant[]> {
  return _getTrustedMerchantFeed(provinceId, limit)
}

// ── getMarketEvents ───────────────────────────────────────────────────────────
// Active (non-expired) market events, filterable by type / severity / region.
// Events expire after 14 days and are pruned on each detect_market_events() run.
//
// Use cases: admin alerts dashboard, merchant notification feed.

interface MarketEventOptions {
  eventType?:  string
  severity?:   EventSeverity
  provinceId?: number
  categoryId?: number
  limit?:      number
}

const _getMarketEvents = unstable_cache(
  async (
    eventType: string | null,
    severity:  string | null,
    provinceId: number | null,
    categoryId: number | null,
    limit:      number,
  ): Promise<MarketEvent[]> => {
    const supabase = createCachedClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('market_events')
      .select('id, event_type, province_id, category_id, severity, trigger_value, baseline_value, metadata, detected_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (eventType  !== null) q = q.eq('event_type', eventType)
    if (severity   !== null) q = q.eq('severity',   severity)
    if (provinceId !== null) q = q.eq('province_id', provinceId)
    if (categoryId !== null) q = q.eq('category_id', categoryId)

    const { data, error } = await q
    if (error) {
      console.error('[getMarketEvents]', error.message)
      return []
    }
    return (data ?? []) as unknown as MarketEvent[]
  },
  ['regional-ops', 'market-events'],
  { revalidate: 600, tags: ['market_events'] },  // 10 min — events can be time-sensitive
)

export function getMarketEvents(opts: MarketEventOptions = {}): Promise<MarketEvent[]> {
  const { eventType = null, severity = null, provinceId = null, categoryId = null, limit = 20 } = opts
  return _getMarketEvents(eventType, severity as string | null, provinceId, categoryId, limit)
}

// ── getRegionalMarketSummary ──────────────────────────────────────────────────
// Denormalised per-(province, category) market intelligence row.
// Joins heatmap + price + pressure + demand + supply + gap into one read.
//
// Use cases: province landing pages, category drill-down panels.

const _getRegionalMarketSummary = unstable_cache(
  async (provinceId: number, limit: number): Promise<RegionalSummary[]> => {
    const supabase = createCachedClient()
    const { data, error } = await supabase
      .from('regional_market_summary')
      .select(`
        province_id, category_id, heat_index, heat_tier,
        demand_score, trend_7d, searches_7d, inquiries_7d,
        supply_score, active_listings, merchant_count,
        median_price, price_trend_7d,
        pressure_score, shortage_flag, days_supply,
        opportunity_score, gap_tier, seasonal_multiplier,
        market_status, updated_at
      `)
      .eq('province_id', provinceId)
      .order('heat_index', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getRegionalMarketSummary]', provinceId, error.message)
      return []
    }
    return (data ?? []) as unknown as RegionalSummary[]
  },
  ['regional-ops', 'market-summary'],
  { revalidate: 1800, tags: ['regional_market_summary'] },
)

export function getRegionalMarketSummary(provinceId: number, limit = 20): Promise<RegionalSummary[]> {
  return _getRegionalMarketSummary(provinceId, limit)
}

// ── getEconomicTelemetry ──────────────────────────────────────────────────────
// Daily commerce pulse for a province — 90-day rolling window.
// Ordered by telemetry_date DESC (most recent first).
//
// Use cases: province commerce charts, liquidity trend sparklines.

const _getEconomicTelemetry = unstable_cache(
  async (provinceId: number, days: number): Promise<EconomicTelemetryRow[]> => {
    const supabase = createCachedClient()
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('economic_telemetry')
      .select(
        'province_id, telemetry_date, active_listings, new_listings, active_merchants, searches, inquiries, inquiry_velocity, liquidity_index, avg_trust_score, updated_at',
      )
      .eq('province_id', provinceId)
      .gte('telemetry_date', cutoff)
      .order('telemetry_date', { ascending: false })
      .limit(days)

    if (error) {
      console.error('[getEconomicTelemetry]', provinceId, error.message)
      return []
    }
    return (data ?? []) as unknown as EconomicTelemetryRow[]
  },
  ['regional-ops', 'economic-telemetry'],
  { revalidate: 1800, tags: ['economic_telemetry'] },
)

export function getEconomicTelemetry(provinceId: number, days = 30): Promise<EconomicTelemetryRow[]> {
  return _getEconomicTelemetry(provinceId, days)
}

// ── getPriceBenchmarks ────────────────────────────────────────────────────────
// Tukey-fenced price distribution per (province × category).
// Optionally scoped to a single category.
//
// Use cases: listing "is this price reasonable?" indicator,
//            seller pricing recommendation widget.

const _getPriceBenchmarks = unstable_cache(
  async (provinceId: number, categoryId: number | null): Promise<PriceBenchmark[]> => {
    const supabase = createCachedClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('regional_price_benchmarks')
      .select(
        'province_id, category_id, price_count, avg_price, median_price, p25_price, p75_price, fence_low, fence_high, avg_price_7d, avg_price_30d, price_trend_7d, updated_at',
      )
      .eq('province_id', provinceId)
      .gte('price_count', 3)
      .order('price_count', { ascending: false })

    if (categoryId !== null) q = q.eq('category_id', categoryId)

    const { data, error } = await q
    if (error) {
      console.error('[getPriceBenchmarks]', provinceId, error.message)
      return []
    }
    return (data ?? []) as unknown as PriceBenchmark[]
  },
  ['regional-ops', 'price-benchmarks'],
  { revalidate: 1800, tags: ['regional_price_benchmarks'] },
)

export function getPriceBenchmarks(provinceId: number, categoryId?: number): Promise<PriceBenchmark[]> {
  return _getPriceBenchmarks(provinceId, categoryId ?? null)
}

// ── getInventoryPressure ──────────────────────────────────────────────────────
// Inventory pressure scores for all categories in a province.
// Ordered by pressure_score ASC (shortages first).
//
// Use cases: province inventory health dashboard, shortage/oversupply labels.

const _getInventoryPressure = unstable_cache(
  async (provinceId: number, limit: number): Promise<InventoryPressure[]> => {
    const supabase = createCachedClient()
    const { data, error } = await supabase
      .from('inventory_pressure_scores')
      .select(
        'province_id, category_id, demand_score, supply_score, pressure_score, active_listing_count, inquiries_7d, days_supply, shortage_flag, oversupply_flag, updated_at',
      )
      .eq('province_id', provinceId)
      .order('pressure_score', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[getInventoryPressure]', provinceId, error.message)
      return []
    }
    return (data ?? []) as unknown as InventoryPressure[]
  },
  ['regional-ops', 'inventory-pressure'],
  { revalidate: 1800, tags: ['inventory_pressure_scores'] },
)

export function getInventoryPressure(provinceId: number, limit = 20): Promise<InventoryPressure[]> {
  return _getInventoryPressure(provinceId, limit)
}

// ── getSupplyRoutes ───────────────────────────────────────────────────────────
// Suggested supply routing edges for a destination province.
// Returns surplus-province sources that can fill local demand gaps.
// Optionally filtered to a single category.
//
// Use cases: inter-province trade partner suggestions,
//            "available suppliers in nearby provinces" panel.

const _getSupplyRoutes = unstable_cache(
  async (destinationProvinceId: number, categoryId: number | null): Promise<SupplyRoute[]> => {
    const supabase = createCachedClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('supply_routing_edges')
      .select(
        'source_province_id, destination_province_id, category_id, source_supply_score, source_active_listings, source_merchant_count, dest_demand_score, flow_strength, is_deficit_route, is_surplus_route, updated_at',
      )
      .eq('destination_province_id', destinationProvinceId)
      .eq('is_deficit_route', true)
      .order('flow_strength', { ascending: false })
      .limit(20)

    if (categoryId !== null) q = q.eq('category_id', categoryId)

    const { data, error } = await q
    if (error) {
      console.error('[getSupplyRoutes]', destinationProvinceId, error.message)
      return []
    }
    return (data ?? []) as unknown as SupplyRoute[]
  },
  ['regional-ops', 'supply-routes'],
  { revalidate: 1800, tags: ['supply_routing_edges'] },
)

export function getSupplyRoutes(destinationProvinceId: number, categoryId?: number): Promise<SupplyRoute[]> {
  return _getSupplyRoutes(destinationProvinceId, categoryId ?? null)
}
