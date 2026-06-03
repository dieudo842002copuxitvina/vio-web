'use server'

// ── Lead Intelligence scoring engine ─────────────────────────────────────────
//
// All scoring is done in the query layer — no SQL views or migrations needed.
//
// Data flow for getLeadScores(merchantId):
//   1. Fetch merchant's listing IDs (1 query)
//   2. Fetch listing_events for those IDs, last 30 days, authenticated only (1 query)
//   3. Compute (profile_id × listing_id) scores in JavaScript
//   4. Take top 100 by score
//   5. Batch-fetch profile names/avatars (1 query)
//   Total: 3 queries, no N+1, cached 5 min.
//
// getLeadTimeline(merchantId, profileId):
//   Same listing fetch + filtered events for one profile (2 queries, no cache).

import { unstable_cache } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'
import type {
  BehavioralLead,
  LeadTemperature,
  LeadTimelineEvent,
} from '../types'
import { EVENT_WEIGHT } from '../types'

// ── Scoring helpers ───────────────────────────────────────────────────────────

function recencyMultiplier(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000
  if (ageDays <= 1)  return 1.0
  if (ageDays <= 3)  return 0.8
  if (ageDays <= 7)  return 0.5
  if (ageDays <= 30) return 0.2
  return 0
}

function scoreToTemperature(score: number): LeadTemperature {
  if (score > 100) return 'very_hot'
  if (score > 50)  return 'hot'
  if (score > 20)  return 'warm'
  return 'cold'
}

// ── getLeadScores ─────────────────────────────────────────────────────────────
// Top 100 behavioral leads for the authenticated merchant.
// Cache: 5 min per merchantId.

const _cachedLeadScores = unstable_cache(
  async (merchantId: string): Promise<BehavioralLead[]> => {
    const supabase = await createClient()

    // 1. Merchant's published listings
    const { data: listingRows, error: listingErr } = await supabase
      .from('listings')
      .select('id, title, slug')
      .eq('owner_id', merchantId)
      .eq('status', 'published')
      .eq('is_public', true)

    if (listingErr || !listingRows?.length) return []

    type LRow = { id: string; title: string; slug: string }
    const listingMap = new Map<string, LRow>(
      (listingRows as LRow[]).map(l => [l.id, l]),
    )
    const listingIds = (listingRows as LRow[]).map(l => l.id)

    // 2. Listing events — last 30 days, authenticated users only
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()

    const { data: events, error: eventsErr } = await supabase
      .from('listing_events')
      .select('profile_id, listing_id, event_type, created_at')
      .in('listing_id', listingIds)
      .not('profile_id', 'is', null)
      .gte('created_at', since30d)
      .order('created_at', { ascending: false })
      .limit(5000)

    if (eventsErr || !events?.length) return []

    // 3. Compute (profile_id, listing_id) scores
    interface Acc {
      score:          number
      lastActivityAt: string
      profileId:      string
      listingId:      string
    }

    const scoreMap = new Map<string, Acc>()

    for (const ev of events as {
      profile_id: string; listing_id: string; event_type: string; created_at: string
    }[]) {
      const weight = EVENT_WEIGHT[ev.event_type] ?? 0
      if (weight === 0) continue
      const mult = recencyMultiplier(ev.created_at)
      if (mult === 0) continue

      const k = `${ev.profile_id}|${ev.listing_id}`
      const existing = scoreMap.get(k)
      if (existing) {
        existing.score += weight * mult
        if (ev.created_at > existing.lastActivityAt) {
          existing.lastActivityAt = ev.created_at
        }
      } else {
        scoreMap.set(k, {
          score:          weight * mult,
          lastActivityAt: ev.created_at,
          profileId:      ev.profile_id,
          listingId:      ev.listing_id,
        })
      }
    }

    // 4. Sort desc, take top 100
    const ranked = [...scoreMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)

    if (!ranked.length) return []

    // 5. Batch-fetch profile names/avatars
    const profileIds = [...new Set(ranked.map(r => r.profileId))]
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, phone')
      .in('id', profileIds)

    type PRow = { id: string; full_name: string | null; avatar_url: string | null; phone: string | null }
    const profileMap = new Map<string, PRow>(
      ((profileRows ?? []) as PRow[]).map(p => [p.id, p]),
    )

    // 6. Assemble
    return ranked.map(r => {
      const listing = listingMap.get(r.listingId)
      const profile = profileMap.get(r.profileId)
      return {
        profileId:      r.profileId,
        listingId:      r.listingId,
        score:          Math.round(r.score * 10) / 10,
        temperature:    scoreToTemperature(r.score),
        lastActivityAt: r.lastActivityAt,
        profileName:    profile?.full_name  ?? null,
        profileAvatar:  profile?.avatar_url ?? null,
        profilePhone:   profile?.phone      ?? null,
        listingTitle:   listing?.title      ?? null,
        listingSlug:    listing?.slug       ?? null,
      }
    })
  },
  ['leads', 'behavioral'],
  { revalidate: 300, tags: ['leads', 'listings'] },
)

export async function getLeadScores(merchantId: string): Promise<BehavioralLead[]> {
  try {
    return await _cachedLeadScores(merchantId)
  } catch (err) {
    console.error('[getLeadScores]', (err as Error).message)
    return []
  }
}

// ── getLeadTimeline ───────────────────────────────────────────────────────────
// All events for a specific profile across the merchant's listings.
// Last 90 days, ordered newest first. Not cached — per-profile live view.

export async function getLeadTimeline(
  merchantId: string,
  profileId:  string,
): Promise<LeadTimelineEvent[]> {
  try {
    const supabase = await createClient()

    // Merchant's listings
    const { data: listingRows, error: listingErr } = await supabase
      .from('listings')
      .select('id, title, slug')
      .eq('owner_id', merchantId)
      .eq('status', 'published')
      .eq('is_public', true)

    if (listingErr || !listingRows?.length) return []

    type LRow = { id: string; title: string; slug: string }
    const listingMap = new Map<string, LRow>(
      (listingRows as LRow[]).map(l => [l.id, l]),
    )
    const listingIds = (listingRows as LRow[]).map(l => l.id)

    // Events for this profile on merchant's listings (90 day window)
    const since90d = new Date(Date.now() - 90 * 86_400_000).toISOString()

    const { data: events, error: eventsErr } = await supabase
      .from('listing_events')
      .select('id, listing_id, event_type, created_at')
      .eq('profile_id', profileId)
      .in('listing_id', listingIds)
      .gte('created_at', since90d)
      .order('created_at', { ascending: false })
      .limit(200)

    if (eventsErr || !events?.length) return []

    return (events as {
      id: number; listing_id: string; event_type: string; created_at: string
    }[]).map(ev => {
      const listing = listingMap.get(ev.listing_id)
      return {
        id:           ev.id,
        eventType:    ev.event_type,
        createdAt:    ev.created_at,
        listingId:    ev.listing_id,
        listingTitle: listing?.title ?? null,
        listingSlug:  listing?.slug  ?? null,
      }
    })
  } catch (err) {
    console.error('[getLeadTimeline]', (err as Error).message)
    return []
  }
}
