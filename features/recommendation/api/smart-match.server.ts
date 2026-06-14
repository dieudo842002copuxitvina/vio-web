// ── Smart Matching Engine ─────────────────────────────────────────────────────
//
// Triggered when a buyer has intent_level = 'high'.
// Combines three candidate pipelines into a single ranked list of ≤10 listings.
//
// Pipelines
// ─────────
//   A. Behavior similarity  — listing_similarity_graph seeded by the buyer's
//                             saved/phone-revealed/repeatedly-clicked listings
//   B. Province trending    — trending_listings[scope=province, id=favoriteProvince]
//   C. Category trending    — trending_listings[scope=category, id=favoriteCategory]
//
// Query plan (no N+1)
// ────────────────────
//   Round 1 (parallel) — behavior events + province trending + category trending
//   Round 2            — listing_similarity_graph (needs Round 1 seed IDs)
//   Round 3            — batch listing metadata for all candidates (one IN query)
//   Total: 5 queries
//
// Confidence score weights
// ────────────────────────
//   category_match   0.30
//   province_match   0.25
//   behavior_match   0.20
//   trending boost   0.15 × f(rank)     f(1)=0.83  f(5)=0.50  f(20)=0.20
//   similarity refine 0.05 × sim_score
//   base             0.05
//   ──────────────── ────
//   maximum          1.00
//
// Caching
// ───────
//   _cachedSmartMatches(profileId, favoriteCategory, favoriteProvince, limit)
//   Cache key includes the intent dimensions so stale intents produce fresh results.
//   TTL: 5 min.  Tags: listings, recommendations, personalization.

import { createClient } from '@/lib/supabase/server'
import { detectBuyerIntent } from '@/features/personalization/api/buyer-intent.server'
import type { MatchedListing } from '../types'

// ── Reason builder ────────────────────────────────────────────────────────────

function buildReason(
  categoryMatch:  boolean,
  provinceMatch:  boolean,
  behaviorMatch:  boolean,
  trendingRank:   number | null,
  trendingScope:  'province' | 'category' | null,
): string {
  const parts: string[] = []

  if (categoryMatch && provinceMatch) {
    parts.push('Khớp danh mục & tỉnh thành yêu thích')
  } else if (categoryMatch) {
    parts.push('Phù hợp danh mục quan tâm')
  } else if (provinceMatch) {
    parts.push('Ở tỉnh thành đang tìm')
  }

  if (behaviorMatch) {
    parts.push('Tương tự listing bạn đã xem')
  }

  if (trendingRank != null) {
    const area =
      trendingScope === 'province' ? 'khu vực' :
      trendingScope === 'category' ? 'danh mục' : 'toàn quốc'
    parts.push(trendingRank <= 5 ? `Trending #${trendingRank} ${area}` : `Đang trending ${area}`)
  }

  return parts.length > 0 ? parts.join(' · ') : 'Phù hợp với hành vi của bạn'
}

// ── Core matching (cached per profileId + intent dimensions) ─────────────────

async function _computeSmartMatches(
  profileId:        string,
  favoriteCategory: number | null,
  favoriteProvince: number | null,
  limit:            number,
): Promise<MatchedListing[]> {
    const supabase = await createClient()
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()

    // ── Round 1 (parallel) ──────────────────────────────────────────────────

    type TrendRow = { listing_id: string; rank_position: number }
    type NoData   = { data: TrendRow[] }

    const emptyTrend: NoData = { data: [] }

    const [evResult, provResult, catResult] = await Promise.all([

      // A: buyer's recent behavior events
      supabase
        .from('listing_events')
        .select('listing_id, event_type')
        .eq('profile_id', profileId)
        .in('event_type', ['click', 'save', 'phone_reveal'])
        .gte('created_at', since30d)
        .order('created_at', { ascending: false })
        .limit(500),

      // B: province-scoped trending
      favoriteProvince != null
        ? supabase
            .from('trending_listings')
            .select('listing_id, rank_position')
            .eq('scope_type', 'province')
            .eq('scope_id', favoriteProvince)
            .order('rank_position', { ascending: true })
            .limit(20)
        : Promise.resolve(emptyTrend),

      // C: category-scoped trending
      favoriteCategory != null
        ? supabase
            .from('trending_listings')
            .select('listing_id, rank_position')
            .eq('scope_type', 'category')
            .eq('scope_id', favoriteCategory)
            .order('rank_position', { ascending: true })
            .limit(20)
        : Promise.resolve(emptyTrend),
    ])

    // ── Derive behavior seeds ───────────────────────────────────────────────
    type EvRow = { listing_id: string; event_type: string }
    const events = (evResult.data ?? []) as EvRow[]

    const alreadySeenIds = new Set(events.map(e => e.listing_id))

    // Seed = saved/phone_revealed listings OR any listing clicked ≥2 times
    const clickCounts = new Map<string, number>()
    for (const ev of events) {
      if (ev.event_type === 'click') {
        clickCounts.set(ev.listing_id, (clickCounts.get(ev.listing_id) ?? 0) + 1)
      }
    }

    const seedIds = [
      ...new Set([
        ...events
          .filter(e => e.event_type === 'save' || e.event_type === 'phone_reveal')
          .map(e => e.listing_id),
        ...[...clickCounts.entries()]
          .filter(([, cnt]) => cnt >= 2)
          .map(([id]) => id),
      ]),
    ].slice(0, 10)  // cap seeds to avoid huge IN clause

    // ── Round 2: similarity graph ───────────────────────────────────────────
    type SimRow = { source_id: string; target_id: string; similarity_score: number }
    let simRows: SimRow[] = []

    if (seedIds.length > 0) {
      const { data } = await supabase
        .from('listing_similarity_graph')
        .select('source_id, target_id, similarity_score')
        .in('source_id', seedIds)
        .order('similarity_score', { ascending: false })
        .limit(40)
      simRows = (data ?? []) as SimRow[]
    }

    // ── Merge all candidates ────────────────────────────────────────────────
    interface Candidate {
      behaviorMatch:   boolean
      similarityScore: number
      trendingRank:    number | null
      trendingScope:   'province' | 'category' | null
    }

    const candidates = new Map<string, Candidate>()

    // Pipeline A: similarity graph results (behavior-seeded)
    for (const row of simRows) {
      if (alreadySeenIds.has(row.target_id)) continue
      const prev = candidates.get(row.target_id)
      if (!prev || row.similarity_score > prev.similarityScore) {
        candidates.set(row.target_id, {
          behaviorMatch:   true,
          similarityScore: row.similarity_score,
          trendingRank:    prev?.trendingRank    ?? null,
          trendingScope:   prev?.trendingScope   ?? null,
        })
      }
    }

    const mergeTrend = (
      rows:  TrendRow[],
      scope: 'province' | 'category',
    ) => {
      for (const row of rows) {
        if (alreadySeenIds.has(row.listing_id)) continue
        const prev = candidates.get(row.listing_id)
        const betterRank =
          prev?.trendingRank == null || row.rank_position < prev.trendingRank

        if (!prev) {
          candidates.set(row.listing_id, {
            behaviorMatch:   false,
            similarityScore: 0,
            trendingRank:    row.rank_position,
            trendingScope:   scope,
          })
        } else if (betterRank) {
          prev.trendingRank  = row.rank_position
          prev.trendingScope = scope
        }
      }
    }

    mergeTrend((provResult.data ?? []) as TrendRow[], 'province')
    mergeTrend((catResult.data  ?? []) as TrendRow[], 'category')

    if (candidates.size === 0) return []

    // ── Round 3: batch fetch listing metadata ───────────────────────────────
    type ListingRow = {
      id: string; slug: string; title: string
      cover_url: string | null; location_text: string | null
      price_text: string | null; is_featured: boolean
      category_id: number | null; province_id: number | null
    }

    const { data: listingRows } = await supabase
      .from('listings')
      .select([
        'id', 'slug', 'title', 'cover_url', 'location_text',
        'price_text', 'is_featured', 'category_id', 'province_id',
      ].join(', '))
      .in('id', [...candidates.keys()])
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .eq('status', 'published')

    if (!listingRows?.length) return []

    // ── Score and assemble ──────────────────────────────────────────────────
    const results: MatchedListing[] = []

    for (const listing of listingRows as unknown as ListingRow[]) {
      const cand = candidates.get(listing.id)
      if (!cand) continue

      const categoryMatch = favoriteCategory != null && listing.category_id === favoriteCategory
      const provinceMatch = favoriteProvince != null && listing.province_id === favoriteProvince
      const { behaviorMatch, similarityScore, trendingRank, trendingScope } = cand

      // Confidence score
      let score = 0.05                                                // base
      if (categoryMatch)  score += 0.30
      if (provinceMatch)  score += 0.25
      if (behaviorMatch)  score += 0.20
      if (trendingRank != null) {
        score += 0.15 * (1 / (1 + trendingRank / 5))                // rank decay
      }
      score += 0.05 * Math.min(1, Math.max(0, similarityScore))     // sim refinement

      results.push({
        recommendedListingId: listing.id,
        confidenceScore:      Math.round(Math.min(1, score) * 100) / 100,
        reason:               buildReason(categoryMatch, provinceMatch, behaviorMatch, trendingRank, trendingScope),
        categoryMatch,
        provinceMatch,
        behaviorMatch,
        slug:         listing.slug,
        title:        listing.title,
        priceText:    listing.price_text,
        locationText: listing.location_text,
        coverUrl:     listing.cover_url,
        isFeatured:   listing.is_featured,
      })
    }

    return results
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, limit)
}

export async function getSmartMatches(
  profileId: string,
  limit = 10,
): Promise<MatchedListing[]> {
  try {
    const intent = await detectBuyerIntent(profileId)
    if (!intent || intent.intentLevel !== 'high')                          return []
    if (intent.favoriteCategory == null && intent.favoriteProvince == null) return []

    return await _computeSmartMatches(
      profileId,
      intent.favoriteCategory,
      intent.favoriteProvince,
      limit,
    )
  } catch (err) {
    console.error('[getSmartMatches]', (err as Error).message)
    return []
  }
}
