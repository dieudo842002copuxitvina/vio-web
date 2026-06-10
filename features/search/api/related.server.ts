import { unstable_cache }    from 'next/cache'
import { createCachedClient } from '@/lib/supabase/server'
import type { Listing }      from '@/entities/listing'
import { listingToLandCard } from '@/entities/listing'
import type { LandListingCardProps } from '@/entities/listing'

// Shared column list (mirrors listing.server.ts COLS — no search_vector).
// listing_type is the actual DB column; aliased to type for TS compatibility.
const COLS = [
  'id', 'listing_type:type', 'slug', 'title', 'short_description', 'description',
  'cover_url', 'province_id', 'district_id', 'location_text',
  'price_amount', 'price_unit', 'price_text', 'price_type',
  'status', 'moderation_status', 'is_public', 'is_featured', 'is_verified',
  'category_id', 'owner_id', 'storefront_id',
  'contact_phone', 'contact_zalo', 'contact_email',
  'published_at', 'expires_at', 'created_at', 'updated_at',
].join(', ')

// ── getRelatedListings ────────────────────────────────────────────────────────
// Returns listings related to a given listing.
//
// Strategy (graph-first, geo fallback):
//   1. Graph: query listing_relationships by co-occurrence strength (migration 013).
//      Requires ≥ 2 results from graph to prefer it; otherwise falls through.
//   2. District fallback: same type + same district, ordered by featured → recency.
//   3. Province backfill: same type + same province to reach the limit.
//
// Graph results interleave with geo fallback so the response always reaches
// `limit` even when the graph has sparse data (early cold start).
//
// Cached 30 min per (listingId, provinceId, districtId).

const _getRelatedListings = unstable_cache(
  async (
    listingId:   string,
    listingType: string,
    provinceId:  number | null,
    districtId:  number | null,
    limit:       number,
  ): Promise<LandListingCardProps[]> => {
    const supabase = createCachedClient()
    const seen     = new Set([listingId])
    const results: Listing[] = []

    // ── Pass 1: graph-based (co-occurrence) ──
    const { data: graphRows } = await supabase
      .from('listing_relationships')
      .select('target_listing_id, strength')
      .eq('source_listing_id', listingId)
      .gt('strength', 0.0)
      .order('strength', { ascending: false })
      .limit(limit * 2)  // over-fetch so we can filter deleted/unpublished

    if (graphRows?.length) {
      const targetIds = graphRows
        .map((r: { target_listing_id: string }) => r.target_listing_id)
        .filter(id => !seen.has(id))

      if (targetIds.length > 0) {
        const { data: graphListings } = await supabase
          .from('listings')
          .select(COLS)
          .in('id', targetIds)
          .eq('is_public', true)
          .eq('moderation_status', 'approved')
          .eq('status', 'published')

        // Restore graph order (supabase .in() does not preserve order)
        const listingById = new Map(
          ((graphListings ?? []) as unknown as Listing[]).map(l => [l.id, l]),
        )
        for (const row of graphRows as { target_listing_id: string }[]) {
          const l = listingById.get(row.target_listing_id)
          if (l && !seen.has(l.id) && results.length < limit) {
            seen.add(l.id)
            results.push(l)
          }
        }
      }
    }

    // ── Pass 2: same-district geo fallback ──
    if (districtId && results.length < limit) {
      const { data } = await supabase
        .from('listings')
        .select(COLS)
        .eq('listing_type', listingType)
        .eq('is_public', true)
        .eq('moderation_status', 'approved')
        .eq('status', 'published')
        .eq('district_id', districtId)
        .neq('id', listingId)
        .order('is_featured', { ascending: false })
        .order('updated_at',  { ascending: false })
        .limit(limit)

      for (const row of (data ?? []) as unknown as Listing[]) {
        if (!seen.has(row.id) && results.length < limit) {
          seen.add(row.id)
          results.push(row)
        }
      }
    }

    // ── Pass 3: same-province backfill ──
    if (provinceId && results.length < limit) {
      const remaining    = limit - results.length
      const excludeList  = [...seen].join(',')

      const { data } = await supabase
        .from('listings')
        .select(COLS)
        .eq('listing_type', listingType)
        .eq('is_public', true)
        .eq('moderation_status', 'approved')
        .eq('status', 'published')
        .eq('province_id', provinceId)
        .not('id', 'in', `(${excludeList})`)
        .order('is_featured', { ascending: false })
        .order('updated_at',  { ascending: false })
        .limit(remaining)

      for (const row of (data ?? []) as unknown as Listing[]) {
        if (!seen.has(row.id) && results.length < limit) {
          seen.add(row.id)
          results.push(row)
        }
      }
    }

    return results.slice(0, limit).map(l => listingToLandCard(l))
  },
  ['search', 'related'],
  { revalidate: 1800, tags: ['listings', 'search'] },
)

export function getRelatedListings(
  listingId:   string,
  listingType: string,
  provinceId:  number | null,
  districtId:  number | null,
  limit = 4,
): Promise<LandListingCardProps[]> {
  return _getRelatedListings(listingId, listingType, provinceId, districtId, limit)
}

// ── getSameCategoryListings ───────────────────────────────────────────────────
// Variation: same category + same province, used for category page sidebars.
// Separate function so its cache key is distinct.

const _getSameCategoryListings = unstable_cache(
  async (
    listingId:  string,
    categoryId: number,
    provinceId: number | null,
    limit:      number,
  ): Promise<LandListingCardProps[]> => {
    const supabase = createCachedClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('listings')
      .select(COLS)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .eq('status', 'published')
      .eq('category_id', categoryId)
      .neq('id', listingId)
      .order('is_featured', { ascending: false })
      .order('updated_at',  { ascending: false })
      .limit(limit)

    if (provinceId) q = q.eq('province_id', provinceId)

    const { data } = await q
    return ((data ?? []) as Listing[]).map(l => listingToLandCard(l))
  },
  ['search', 'category-related'],
  { revalidate: 1800, tags: ['listings', 'search'] },
)

export function getSameCategoryListings(
  listingId:  string,
  categoryId: number,
  provinceId: number | null,
  limit = 6,
): Promise<LandListingCardProps[]> {
  return _getSameCategoryListings(listingId, categoryId, provinceId, limit)
}
