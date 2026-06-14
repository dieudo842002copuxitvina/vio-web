// ── Marketplace analytics — fire-and-forget tracking helpers ─────────────────
//
// These functions insert rows into public.search_queries.  Like the signal
// tracking helpers in features/signals/api/tracking.server.ts, all DB and
// network errors are caught internally and never re-thrown.
//
// Recommended call pattern (from a Server Action or Server Component):
//
//   // Non-blocking — run alongside the main search fetch:
//   const [result] = await Promise.allSettled([
//     searchListings(query, filters),
//     trackSearchQuery(query, 0, { provinceId }),
//   ])
//
//   // After result count is known, update the row count:
//   void trackSearchQuery(query, result.hits.length, { provinceId })

import { createClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchQueryOptions {
  provinceId?:  number
  categoryId?:  number
  sessionId?:   string
  profileId?:   string
}

// ── trackSearchQuery ──────────────────────────────────────────────────────────
// Logs a search event into public.search_queries.
// resultsCount = 0 when called before the search completes (fire-and-forget).
// The refresh_market_demand_signals() function reads this table to derive
// zero-result queries, demand gaps, and trending keywords.
//
// Safe to call without awaiting.

export async function trackSearchQuery(
  query:        string,
  resultsCount: number,
  options:      SearchQueryOptions = {},
): Promise<void> {
  if (!query || query.trim().length < 2) return
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('search_queries').insert({
      query:         query.trim().toLowerCase(),
      results_count: resultsCount,
      province_id:   options.provinceId  ?? null,
      category_id:   options.categoryId  ?? null,
      session_id:    options.sessionId   ?? null,
      profile_id:    options.profileId   ?? null,
    })
    if (error) {
      console.error('[trackSearchQuery]', query, error.message)
    }
  } catch (err) {
    console.error('[trackSearchQuery]', query, err)
  }
}

// ── trackSearchClick ──────────────────────────────────────────────────────────
// Records that the user clicked a listing that appeared in search results.
// Delegates to listing_events with event_type = 'click' and source = 'search'
// in metadata, so the click appears in all CTR/signal pipelines automatically.
//
// The market analytics pipeline uses this to compute which queries drive clicks
// (high-intent queries) by correlating search_queries + listing_events where
// metadata->>'source' = 'search'.

export async function trackSearchClick(
  listingId: string,
  options: {
    query?:      string
    position?:   number
    sessionId?:  string
    profileId?:  string
  } = {},
): Promise<void> {
  try {
    const supabase = await createClient()
    const metadata: Record<string, string | number> = { source: 'search' }
    if (options.query    != null) metadata.query    = options.query
    if (options.position != null) metadata.position = options.position

    const { error } = await supabase.from('listing_events').insert({
      listing_id: listingId,
      event_type: 'click',
      session_id: options.sessionId ?? null,
      profile_id: options.profileId ?? null,
      metadata,
    })
    if (error) {
      console.error('[trackSearchClick]', listingId, error.message)
    }
  } catch (err) {
    console.error('[trackSearchClick]', listingId, err)
  }
}

// ── getMarketDemandSignals ────────────────────────────────────────────────────
// Reads the pre-computed market_demand_signals table.
// Useful for admin dashboards, recommendation surfaces, and SEO gap analysis.

export type SignalType =
  | 'zero_result_query'
  | 'demand_gap'
  | 'trending_keyword'
  | 'trending_province'
  | 'trending_category'

export interface MarketDemandSignal {
  signal_type:  SignalType
  signal_key:   string
  signal_value: number
  metadata:     Record<string, unknown>
  last_seen_at: string
}

export async function getMarketDemandSignals(
  signalType: SignalType,
  limit = 20,
): Promise<MarketDemandSignal[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('market_demand_signals')
      .select('signal_type, signal_key, signal_value, metadata, last_seen_at')
      .eq('signal_type', signalType)
      .order('signal_value', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[getMarketDemandSignals]', signalType, error.message)
      return []
    }
    return (data ?? []) as MarketDemandSignal[]
  } catch (err) {
    console.error('[getMarketDemandSignals]', signalType, err)
    return []
  }
}

// ── getListingHealth ──────────────────────────────────────────────────────────
// Returns the health record for a single listing.
// Returns null when no health data exists yet (first 14 days after publish).

export interface ListingHealth {
  listing_id:       string
  health_score:     number
  issues:           string[]
  impressions_7d:   number
  clicks_7d:        number
  inquiries_7d:     number
  ctr_7d:           number
  inquiry_rate_7d:  number
  days_since_update: number
  is_dead:          boolean
}

export async function getListingHealth(
  listingId: string,
): Promise<ListingHealth | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('listing_health')
      .select('*')
      .eq('listing_id', listingId)
      .single()

    if (error || !data) return null
    return data as ListingHealth
  } catch {
    return null
  }
}
