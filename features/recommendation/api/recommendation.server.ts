'use server'

import { unstable_cache }     from 'next/cache'
import { createCachedClient } from '@/lib/supabase/server'
import { listingToLandCard }  from '@/entities/listing'
import type { Listing }       from '@/entities/listing'
import type { TrendingScope, RecommendedListing } from '../types'

// Columns needed for LandListingCard + the UUID required for click tracking.
const LISTING_COLS = [
  'id', 'slug', 'title', 'cover_url', 'location_text',
  'price_text', 'is_featured',
].join(', ')

function toRecommended(l: Listing): RecommendedListing {
  return { id: l.id, ...listingToLandCard(l) }
}

// ── getSimilarListings ─────────────────────────────────────────────────────────
// Two-query join: fetch ranked target_ids from the similarity graph,
// then batch-fetch those listings in one IN() query. Not N+1.

const _cachedSimilarListings = unstable_cache(
  async (listingId: string, limit: number): Promise<RecommendedListing[]> => {
    const supabase = createCachedClient()

    const { data: graphRows, error: graphErr } = await supabase
      .from('listing_similarity_graph')
      .select('target_id, similarity_score')
      .eq('source_id', listingId)
      .order('similarity_score', { ascending: false })
      .limit(limit)

    if (graphErr || !graphRows?.length) return []

    const targetIds = graphRows.map(r => r.target_id as string)

    const { data: listingRows } = await supabase
      .from('listings')
      .select(LISTING_COLS)
      .in('id', targetIds)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .eq('status', 'published')

    if (!listingRows?.length) return []

    const scoreMap = new Map(
      graphRows.map(r => [r.target_id as string, r.similarity_score as number]),
    )

    return (listingRows as unknown as Listing[])
      .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
      .map(toRecommended)
  },
  ['rec', 'similar'],
  { revalidate: 300, tags: ['listings', 'recommendations'] },
)

export async function getSimilarListings(
  listingId: string,
  limit = 8,
): Promise<RecommendedListing[]> {
  try {
    return await _cachedSimilarListings(listingId, limit)
  } catch (err) {
    console.warn('[rec-similar]', (err as Error).message)
    return []
  }
}

// ── getTrendingListings ────────────────────────────────────────────────────────
// Two-query join: fetch ranked listing_ids from trending table, then batch-fetch.

const _cachedTrendingListings = unstable_cache(
  async (
    scope:   TrendingScope,
    scopeId: number,
    limit:   number,
  ): Promise<RecommendedListing[]> => {
    const supabase = createCachedClient()

    const { data: trendingRows, error: trendErr } = await supabase
      .from('trending_listings')
      .select('listing_id, rank_position')
      .eq('scope_type', scope)
      .eq('scope_id', scopeId)
      .order('rank_position', { ascending: true })
      .limit(limit)

    if (trendErr || !trendingRows?.length) return []

    const listingIds = trendingRows.map(r => r.listing_id as string)

    const { data: listingRows } = await supabase
      .from('listings')
      .select(LISTING_COLS)
      .in('id', listingIds)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .eq('status', 'published')

    if (!listingRows?.length) return []

    const rankMap = new Map(
      trendingRows.map(r => [r.listing_id as string, r.rank_position as number]),
    )

    return (listingRows as unknown as Listing[])
      .sort((a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999))
      .map(toRecommended)
  },
  ['rec', 'trending'],
  { revalidate: 300, tags: ['listings', 'recommendations'] },
)

export async function getTrendingListings(
  scope:    TrendingScope,
  scopeId?: number,
  limit  = 12,
): Promise<RecommendedListing[]> {
  try {
    return await _cachedTrendingListings(scope, scopeId ?? 0, limit)
  } catch (err) {
    console.warn('[rec-trending]', (err as Error).message)
    return []
  }
}

// ── getTrendingKeywords ────────────────────────────────────────────────────────
// National keywords: province_id = 0 (default scope in the schema).

const _cachedTrendingKeywords = unstable_cache(
  async (limit: number): Promise<string[]> => {
    const supabase = createCachedClient()

    const { data, error } = await supabase
      .from('trending_keywords')
      .select('keyword, rank_position')
      .eq('province_id', 0)
      .order('rank_position', { ascending: true })
      .limit(limit)

    if (error || !data) return []
    return data.map(r => r.keyword as string)
  },
  ['rec', 'keywords'],
  { revalidate: 300, tags: ['recommendations'] },
)

export async function getTrendingKeywords(limit = 20): Promise<string[]> {
  try {
    return await _cachedTrendingKeywords(limit)
  } catch (err) {
    console.warn('[rec-keywords]', (err as Error).message)
    return []
  }
}
