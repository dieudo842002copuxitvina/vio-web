import { unstable_cache }  from 'next/cache'
import { createCachedClient } from '@/lib/supabase/server'

// ── Row shape returned by the listings_featured_by_province MV ────────────────
// Columns mirror migration 009. location_text is included for adapter compat.

export interface SEOFeedRow {
  id:                string
  type:              string
  slug:              string
  title:             string
  short_description: string | null
  cover_url:         string | null
  price_text:        string | null
  price_amount:      number | null
  province_id:       number | null
  district_id:       number | null
  category_id:       number | null
  location_text:     string | null
  is_featured:       boolean
  is_verified:       boolean
  updated_at:        string
  rn:                number
}

const MV_COLS = [
  'id', 'type', 'slug', 'title', 'short_description', 'cover_url',
  'price_text', 'price_amount', 'province_id', 'district_id', 'category_id',
  'is_featured', 'is_verified', 'updated_at', 'rn',
].join(', ')

// Fallback column list for direct listings table queries (no rn, type aliased)
const LISTING_FALLBACK_COLS = [
  'id', 'listing_type:type', 'slug', 'title', 'short_description', 'cover_url',
  'price_text', 'price_amount', 'province_id', 'district_id', 'category_id',
  'is_featured', 'is_verified', 'updated_at',
].join(', ')


// ── getLandListingsSEO ─────────────────────────────────────────────────────────
// National browse page (/dat-nong-nghiep).
// Reads from MV ordered globally by is_featured DESC, updated_at DESC.
// Cache: 5 min (matches pg_cron refresh interval).
// Fallback: search_listings_hybrid() via searchListings() with q=''.

const _cachedNationalFeed = unstable_cache(
  async (limit: number): Promise<SEOFeedRow[]> => {
    const supabase = createCachedClient()
    const { data, error } = await supabase
      .from('listings_featured_by_province')
      .select(MV_COLS)
      .eq('type', 'land')
      .order('is_featured', { ascending: false })
      .order('updated_at',  { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as unknown as SEOFeedRow[]
  },
  ['seo', 'feed', 'national'],
  { revalidate: 300, tags: ['listings'] },
)

export async function getLandListingsSEO(
  limit = 24,
): Promise<{ items: SEOFeedRow[]; total: number }> {
  try {
    const items = await _cachedNationalFeed(limit)
    return { items, total: items.length }
  } catch (err) {
    console.warn('[seo-feed-fallback] national:', (err as Error).message)
    // Fallback: direct public query — no cookie-based client to avoid
    // triggering Next.js cookies()-in-cache-scope detection.
    const supabase = createCachedClient()
    const { data } = await supabase
      .from('listings')
      .select(LISTING_FALLBACK_COLS)
      .eq('listing_type', 'land')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .order('updated_at',  { ascending: false })
      .limit(limit)
    const items = (data ?? []) as unknown as SEOFeedRow[]
    return { items, total: items.length }
  }
}

// ── getLandListingsByProvinceSEO ───────────────────────────────────────────────
// Province browse page (/dat-nong-nghiep/[province]).
// Uses (province_id, type, rn) index — pure index scan, no heap reads needed.
//
// count: 'exact' returns total matching rows BEFORE the LIMIT via PostgREST
// Content-Range header, giving us both page-1 rows and a true total in one
// round-trip without a separate COUNT(*) query.

const _cachedProvinceFeed = unstable_cache(
  async (
    provinceId: number,
    type:       string,
    limit:      number,
  ): Promise<{ items: SEOFeedRow[]; total: number }> => {
    const supabase = createCachedClient()
    const { data, count, error } = await supabase
      .from('listings_featured_by_province')
      .select(MV_COLS, { count: 'exact' })
      .eq('province_id', provinceId)
      .eq('type', type)
      .order('rn', { ascending: true })
      .limit(limit)
    if (error) throw error
    return { items: (data ?? []) as unknown as SEOFeedRow[], total: count ?? 0 }
  },
  ['seo', 'feed', 'province'],
  { revalidate: 300, tags: ['listings'] },
)

export async function getLandListingsByProvinceSEO(
  provinceId: number,
  options: { type?: string; limit?: number } = {},
): Promise<{ items: SEOFeedRow[]; total: number }> {
  const { type = 'land', limit = 20 } = options
  try {
    return await _cachedProvinceFeed(provinceId, type, limit)
  } catch (err) {
    console.warn('[seo-feed-fallback] province:', (err as Error).message)
    const supabase = createCachedClient()
    const { data, count } = await supabase
      .from('listings')
      .select(LISTING_FALLBACK_COLS, { count: 'exact' })
      .eq('listing_type', type)
      .eq('province_id', provinceId)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .order('updated_at',  { ascending: false })
      .limit(limit)
    return {
      items: (data ?? []) as unknown as SEOFeedRow[],
      total: count ?? 0,
    }
  }
}

// ── getLandSitemapFeedSEO ──────────────────────────────────────────────────────
// Sitemap (/sitemap.xml). Only slug, updated_at, is_featured needed.
// Cache: 1 h to match sitemap revalidate. No count required.
// Fallback: direct listings query (search is overkill for slug enumeration).

interface SitemapRow {
  slug:        string
  updated_at:  string
  is_featured: boolean
}

const _cachedSitemapFeed = unstable_cache(
  async (limit: number): Promise<SitemapRow[]> => {
    const supabase = createCachedClient()
    const { data, error } = await supabase
      .from('listings_featured_by_province')
      .select('slug, updated_at, is_featured')
      .eq('type', 'land')
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as SitemapRow[]
  },
  ['seo', 'feed', 'sitemap'],
  { revalidate: 3600, tags: ['listings'] },
)

export async function getLandSitemapFeedSEO(limit = 1_000): Promise<SitemapRow[]> {
  try {
    return await _cachedSitemapFeed(limit)
  } catch (err) {
    console.warn('[seo-feed-fallback] sitemap:', (err as Error).message)
    const supabase = createCachedClient()
    const { data } = await supabase
      .from('listings')
      .select('slug, updated_at, is_featured')
      .eq('listing_type', 'land')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('updated_at', { ascending: false })
      .limit(limit)
    return (data ?? []) as SitemapRow[]
  }
}
