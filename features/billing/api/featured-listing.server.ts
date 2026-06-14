// ── Featured Listing query layer ──────────────────────────────────────────────
//
// getActiveFeaturedListings(limit)
//   Returns public featured listings sorted by priority_score DESC.
//   Uses createCachedClient (no auth — RLS allows public read).
//   Cache: 5 min via unstable_cache.
//
// Integration points (add to pages after merge):
//   Homepage    → show featured rail above "Đất Nông Nghiệp Nổi Bật"
//   Province    → boost featured in listing grid
//   Search      → prepend featured to results
//   Rec. rail   → include featured in trending feed

import { unstable_cache }     from 'next/cache'
import { createCachedClient } from '@/lib/supabase/server'
import type { Listing }       from '@/entities/listing'
import type { FeaturedListingCard } from '../types'

// ── Type ─────────────────────────────────────────────────────────────────────

export type { FeaturedListingCard }

// ── Query ─────────────────────────────────────────────────────────────────────

const LISTING_COLS = [
  'id', 'slug', 'title', 'cover_url', 'location_text',
  'price_text', 'is_featured',
].join(', ')

const _cachedFeatured = unstable_cache(
  async (limit: number): Promise<FeaturedListingCard[]> => {
    const supabase = createCachedClient()
    const now      = new Date().toISOString()

    const { data: featuredRows, error } = await supabase
      .from('featured_listings')
      .select('listing_id, priority_score, ends_at')
      .eq('status', 'active')
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order('priority_score', { ascending: false })
      .order('created_at',     { ascending: false })
      .limit(limit)

    if (error || !featuredRows?.length) return []

    const listingIds = (featuredRows as { listing_id: string; priority_score: number; ends_at: string | null }[])
      .map(r => r.listing_id)

    const { data: listingRows } = await supabase
      .from('listings')
      .select(LISTING_COLS)
      .in('id', listingIds)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .eq('status', 'published')

    if (!listingRows?.length) return []

    type FRow = { listing_id: string; priority_score: number; ends_at: string | null }
    const metaMap = new Map<string, { priority: number; endsAt: string | null }>(
      (featuredRows as FRow[]).map(r => [r.listing_id, { priority: r.priority_score, endsAt: r.ends_at }]),
    )

    return (listingRows as unknown as Listing[])
      .sort((a, b) => (metaMap.get(b.id)?.priority ?? 0) - (metaMap.get(a.id)?.priority ?? 0))
      .map(l => ({
        id:            l.id,
        slug:          l.slug,
        title:         l.title,
        priceText:     l.price_text,
        locationText:  l.location_text,
        coverUrl:      l.cover_url,
        isFeatured:    true,
        priorityScore: metaMap.get(l.id)?.priority ?? 0,
        endsAt:        metaMap.get(l.id)?.endsAt   ?? null,
      }))
  },
  ['billing', 'featured-listings'],
  { revalidate: 300, tags: ['billing', 'listings'] },
)

export async function getActiveFeaturedListings(
  limit = 12,
): Promise<FeaturedListingCard[]> {
  try {
    return await _cachedFeatured(limit)
  } catch (err) {
    console.error('[getActiveFeaturedListings]', (err as Error).message)
    return []
  }
}
