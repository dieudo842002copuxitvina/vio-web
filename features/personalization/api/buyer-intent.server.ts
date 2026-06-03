'use server'

// ── Buyer Intent Engine ───────────────────────────────────────────────────────
//
// Classifies authenticated users by purchase intent using behavioral signals.
//
// Input sources
// ─────────────
//   listing_events  — per-user: click, save, phone_reveal signals (primary)
//   search_logs     — GLOBAL aggregate only (no profile_id column as of migration 012;
//                     integration deferred until schema adds per-user search tracking)
//
// "Viewed" definition
// ───────────────────
//   event_type = 'click'  (user navigated to the listing detail page).
//   'impression' is excluded — appearing in a feed scroll is too weak a signal.
//
// Detection window: 30-day rolling.
//
// Intent rules (evaluated in order; first match wins)
// ─────────────────────────────────────────────────────
//   HIGH:
//     • Same listing viewed ≥ 3 times  (repeat detail-page visits)
//     • ≥ 5 distinct listings in same category viewed
//     • ≥ 3 distinct listings in same province viewed
//     • ≥ 2 saves
//     • ≥ 1 phone_reveal
//   MEDIUM:
//     • ≥ 2 distinct listings viewed
//     • ≥ 1 save
//   LOW:
//     • Otherwise
//
// favorite_category / favorite_province
// ──────────────────────────────────────
//   category_id / province_id with the highest count of distinct viewed listings.
//
// Performance
// ───────────
//   detectBuyerIntent(profileId)  — 2 queries, cached 5 min
//   detectAllBuyerIntents()       — 2 queries (batch), cached 5 min

import { unstable_cache } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'
import type { BuyerIntent, IntentLevel, BuyerIntentSignals } from '../types'

// ── Internal scoring ──────────────────────────────────────────────────────────

type EventRow = {
  listing_id: string
  event_type: string
  created_at: string
}

type ListingCtx = {
  category_id: number | null
  province_id: number | null
}

interface ScoredIntent {
  intentLevel:      IntentLevel
  favoriteCategory: number | null
  favoriteProvince: number | null
  signals:          BuyerIntentSignals
  lastDetectedAt:   string
}

function applyRules(
  events:         EventRow[],
  listingContext: Map<string, ListingCtx>,
): ScoredIntent {
  const clicks      = events.filter(e => e.event_type === 'click')
  const saves       = events.filter(e => e.event_type === 'save')
  const phoneRevs   = events.filter(e => e.event_type === 'phone_reveal')

  // ── "Same listing viewed ≥ 3 times" ────────────────────────────────────────
  const viewsPerListing = new Map<string, number>()
  for (const ev of clicks) {
    viewsPerListing.set(ev.listing_id, (viewsPerListing.get(ev.listing_id) ?? 0) + 1)
  }
  const maxViewsSameListing = Math.max(0, ...[...viewsPerListing.values()])

  // ── Distinct listing IDs viewed (for category/province counting) ────────────
  const viewedListingIds = [...new Set(clicks.map(e => e.listing_id))]
  const uniqueListingsViewed = viewedListingIds.length

  // ── Category and province buckets ──────────────────────────────────────────
  // Count distinct viewed listing IDs per category / province (not raw clicks)
  const categoryCounts = new Map<number, number>()
  const provinceCounts = new Map<number, number>()

  for (const lid of viewedListingIds) {
    const ctx = listingContext.get(lid)
    if (ctx?.category_id != null) {
      categoryCounts.set(ctx.category_id, (categoryCounts.get(ctx.category_id) ?? 0) + 1)
    }
    if (ctx?.province_id != null) {
      provinceCounts.set(ctx.province_id, (provinceCounts.get(ctx.province_id) ?? 0) + 1)
    }
  }

  const maxListingsSameCategory = categoryCounts.size > 0
    ? Math.max(...[...categoryCounts.values()])
    : 0
  const maxListingsSameProvince = provinceCounts.size > 0
    ? Math.max(...[...provinceCounts.values()])
    : 0

  // ── Intent classification ───────────────────────────────────────────────────
  const isHigh =
    maxViewsSameListing   >= 3 ||
    maxListingsSameCategory >= 5 ||
    maxListingsSameProvince >= 3 ||
    saves.length          >= 2 ||
    phoneRevs.length      >= 1

  const isMedium =
    uniqueListingsViewed  >= 2 ||
    saves.length          >= 1

  const intentLevel: IntentLevel = isHigh ? 'high' : isMedium ? 'medium' : 'low'

  // ── Favorite category and province ─────────────────────────────────────────
  let favoriteCategory: number | null = null
  let favCatCount = 0
  for (const [cid, cnt] of categoryCounts) {
    if (cnt > favCatCount) { favCatCount = cnt; favoriteCategory = cid }
  }

  let favoriteProvince: number | null = null
  let favProvCount = 0
  for (const [pid, cnt] of provinceCounts) {
    if (cnt > favProvCount) { favProvCount = cnt; favoriteProvince = pid }
  }

  // ── Last activity ──────────────────────────────────────────────────────────
  const lastDetectedAt = events.reduce(
    (max, e) => (e.created_at > max ? e.created_at : max),
    events[0]?.created_at ?? new Date().toISOString(),
  )

  return {
    intentLevel,
    favoriteCategory,
    favoriteProvince,
    lastDetectedAt,
    signals: {
      uniqueListingsViewed,
      maxViewsSameListing,
      maxListingsSameCategory,
      maxListingsSameProvince,
      totalSaves:   saves.length,
      phoneReveals: phoneRevs.length,
    },
  }
}

// ── detectBuyerIntent — single profile ───────────────────────────────────────
// 2 queries (events + listing context). Cached 5 min per profileId.

const _cachedBuyerIntent = unstable_cache(
  async (profileId: string): Promise<BuyerIntent | null> => {
    const supabase = await createClient()
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()

    const { data: events, error: evErr } = await supabase
      .from('listing_events')
      .select('listing_id, event_type, created_at')
      .eq('profile_id', profileId)
      .in('event_type', ['click', 'save', 'phone_reveal'])
      .gte('created_at', since30d)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (evErr || !events?.length) return null

    const listingIds = [...new Set((events as EventRow[]).map(e => e.listing_id))]

    const { data: listingRows, error: lErr } = await supabase
      .from('listings')
      .select('id, category_id, province_id')
      .in('id', listingIds)

    if (lErr) console.warn('[detectBuyerIntent] listing context:', lErr.message)

    type LRow = { id: string; category_id: number | null; province_id: number | null }
    const listingContext = new Map<string, ListingCtx>(
      ((listingRows ?? []) as LRow[]).map(l => [l.id, {
        category_id: l.category_id,
        province_id: l.province_id,
      }]),
    )

    const { intentLevel, favoriteCategory, favoriteProvince, lastDetectedAt } =
      applyRules(events as EventRow[], listingContext)

    return { profileId, intentLevel, favoriteCategory, favoriteProvince, lastDetectedAt }
  },
  ['personalization', 'buyer-intent', 'profile'],
  { revalidate: 300, tags: ['personalization', 'listings'] },
)

export async function detectBuyerIntent(
  profileId: string,
): Promise<BuyerIntent | null> {
  try {
    return await _cachedBuyerIntent(profileId)
  } catch (err) {
    console.error('[detectBuyerIntent]', (err as Error).message)
    return null
  }
}

// ── detectAllBuyerIntents — batch ─────────────────────────────────────────────
// Computes intent for all authenticated users with recent activity.
// 2 queries regardless of user count: no N+1.
//   Query 1 — listing_events (all profiles, last 30 days, ≤50 000 rows)
//   Query 2 — listings context (all unique listing IDs touched, one IN query)

const _cachedAllBuyerIntents = unstable_cache(
  async (limit: number): Promise<BuyerIntent[]> => {
    const supabase = await createClient()
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()

    const { data: events, error: evErr } = await supabase
      .from('listing_events')
      .select('profile_id, listing_id, event_type, created_at')
      .not('profile_id', 'is', null)
      .in('event_type', ['click', 'save', 'phone_reveal'])
      .gte('created_at', since30d)
      .order('created_at', { ascending: false })
      .limit(50_000)

    if (evErr || !events?.length) return []

    type RawEvent = {
      profile_id: string
      listing_id: string
      event_type: string
      created_at: string
    }
    const typedEvents = events as RawEvent[]

    const allListingIds = [...new Set(typedEvents.map(e => e.listing_id))]

    const { data: listingRows, error: lErr } = await supabase
      .from('listings')
      .select('id, category_id, province_id')
      .in('id', allListingIds)

    if (lErr) console.warn('[detectAllBuyerIntents] listing context:', lErr.message)

    type LRow = { id: string; category_id: number | null; province_id: number | null }
    const listingContext = new Map<string, ListingCtx>(
      ((listingRows ?? []) as LRow[]).map(l => [l.id, {
        category_id: l.category_id,
        province_id: l.province_id,
      }]),
    )

    // Group events by profile_id
    const byProfile = new Map<string, EventRow[]>()
    for (const ev of typedEvents) {
      const arr = byProfile.get(ev.profile_id) ?? []
      arr.push({ listing_id: ev.listing_id, event_type: ev.event_type, created_at: ev.created_at })
      byProfile.set(ev.profile_id, arr)
    }

    const results: BuyerIntent[] = []

    for (const [profileId, profileEvents] of byProfile) {
      const { intentLevel, favoriteCategory, favoriteProvince, lastDetectedAt } =
        applyRules(profileEvents, listingContext)

      results.push({ profileId, intentLevel, favoriteCategory, favoriteProvince, lastDetectedAt })
    }

    // Sort: high → medium → low, then most recent activity first
    results.sort((a, b) => {
      const INTENT_ORDER: Record<IntentLevel, number> = { high: 3, medium: 2, low: 1 }
      const d = INTENT_ORDER[b.intentLevel] - INTENT_ORDER[a.intentLevel]
      return d !== 0 ? d : b.lastDetectedAt.localeCompare(a.lastDetectedAt)
    })

    return results.slice(0, limit)
  },
  ['personalization', 'buyer-intent', 'all'],
  { revalidate: 300, tags: ['personalization', 'listings'] },
)

export async function detectAllBuyerIntents(limit = 500): Promise<BuyerIntent[]> {
  try {
    return await _cachedAllBuyerIntents(limit)
  } catch (err) {
    console.error('[detectAllBuyerIntents]', (err as Error).message)
    return []
  }
}
