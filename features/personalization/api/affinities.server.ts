'use server'

// ── User & session affinity helpers ───────────────────────────────────────────
//
// Two distinct data sources:
//
//   getUserAffinities(profileId)
//     — reads public.user_affinities (pre-computed by refresh_user_affinities())
//     — for authenticated users only
//     — cached 5 min; invalidated by 'affinities' tag
//
//   getSessionAffinities(sessionId)
//     — reads public.listing_events for the session (last 24 h, max 100 rows)
//     — for anon users; always live (sessions are ephemeral, no cache useful)
//     — joins to listings to resolve province/district/category context
//
// Both functions return AffinityRecord[] sorted by score DESC, highest first.
// Scores are normalised to [0, 1]; see migration 012 for the formula.
//
// Usage in search: pass getUserAffinities results to searchListings() via
// the profileId field in SearchFilters, which maps to p_profile_id in the
// search_listings_hybrid() RPC.  Session affinities are used client-side for
// UI hints (pre-filling location filters, personalising discovery feeds) and
// are NOT forwarded to the search RPC.

import { unstable_cache }  from 'next/cache'
import { createClient }    from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AffinityRecord {
  affinity_type: 'province' | 'district' | 'category' | 'keyword'
  affinity_key:  string
  score:         number
}

// Convenience: top affinity per type as a flat lookup
export interface AffinitySummary {
  topProvince: AffinityRecord | null
  topDistrict: AffinityRecord | null
  topCategory: AffinityRecord | null
  all:         AffinityRecord[]
}

// ── Event weights (must match migration 012) ──────────────────────────────────

const EVENT_WEIGHTS: Record<string, number> = {
  impression:   0.2,
  click:        1.0,
  save:         4.0,
  phone_reveal: 5.0,
  inquiry:      8.0,
}

// Log-normalised score ceiling (must match migration 012 decay_constant)
const SCORE_CEILING = 20.0

function normaliseScore(raw: number): number {
  return Math.min(1.0, Math.log(1 + raw) / Math.log(1 + SCORE_CEILING))
}

// ── getUserAffinities ─────────────────────────────────────────────────────────
// Reads pre-computed affinities for an authenticated user.
// Cache: 5 min TTL (matches pg_cron refresh interval).

const _getUserAffinities = unstable_cache(
  async (profileId: string): Promise<AffinityRecord[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_affinities')
      .select('affinity_type, affinity_key, score')
      .eq('profile_id', profileId)
      .order('score', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[getUserAffinities]', error.message)
      return []
    }
    return (data ?? []) as AffinityRecord[]
  },
  ['personalization', 'affinities', 'user'],
  { revalidate: 300, tags: ['affinities'] },
)

export function getUserAffinities(profileId: string): Promise<AffinityRecord[]> {
  return _getUserAffinities(profileId)
}

// ── getSessionAffinities ──────────────────────────────────────────────────────
// Computes on-the-fly affinities from the last 24 h of listing_events for a
// given session_id.  Used for anon personalisation (pre-filling filters, etc.).
// Results are NOT cached — sessions are short-lived and state changes rapidly.
//
// Returns an empty array on any error (fire-and-forget safety contract).

export async function getSessionAffinities(
  sessionId: string,
): Promise<AffinityRecord[]> {
  try {
    const supabase = await createClient()

    // Fetch recent events for this session
    const { data: events, error: eventsError } = await supabase
      .from('listing_events')
      .select('listing_id, event_type')
      .eq('session_id', sessionId)
      .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
      .limit(100)

    if (eventsError || !events?.length) return []

    // Resolve geo/category context from listings
    const listingIds = [...new Set(events.map(e => (e as { listing_id: string }).listing_id))]
    const { data: listings } = await supabase
      .from('listings')
      .select('id, province_id, district_id, category_id')
      .in('id', listingIds)

    if (!listings?.length) return []

    type ListingRow = { id: string; province_id: number | null; district_id: number | null; category_id: number | null }
    const listingMap = new Map<string, ListingRow>(
      (listings as ListingRow[]).map(l => [l.id, l]),
    )

    // Accumulate decayed weights by affinity key
    const rawScores = new Map<string, number>()

    for (const event of events as { listing_id: string; event_type: string }[]) {
      const listing = listingMap.get(event.listing_id)
      if (!listing) continue
      const w = EVENT_WEIGHTS[event.event_type] ?? 0
      if (w === 0) continue

      if (listing.province_id != null) {
        const k = `province:${listing.province_id}`
        rawScores.set(k, (rawScores.get(k) ?? 0) + w)
      }
      if (listing.district_id != null) {
        const k = `district:${listing.district_id}`
        rawScores.set(k, (rawScores.get(k) ?? 0) + w)
      }
      if (listing.category_id != null) {
        const k = `category:${listing.category_id}`
        rawScores.set(k, (rawScores.get(k) ?? 0) + w)
      }
    }

    return [...rawScores.entries()]
      .map(([key, raw]) => {
        const colonIdx = key.indexOf(':')
        return {
          affinity_type: key.slice(0, colonIdx) as AffinityRecord['affinity_type'],
          affinity_key:  key.slice(colonIdx + 1),
          score:         normaliseScore(raw),
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
  } catch (err) {
    console.error('[getSessionAffinities]', sessionId, err)
    return []
  }
}

// ── summariseAffinities ───────────────────────────────────────────────────────
// Convenience helper: extracts the top affinity per dimension from a flat list.

export function summariseAffinities(affinities: AffinityRecord[]): AffinitySummary {
  return {
    topProvince: affinities.find(a => a.affinity_type === 'province') ?? null,
    topDistrict: affinities.find(a => a.affinity_type === 'district') ?? null,
    topCategory: affinities.find(a => a.affinity_type === 'category') ?? null,
    all:         affinities,
  }
}
