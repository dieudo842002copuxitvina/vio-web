'use server'

import { unstable_cache }  from 'next/cache'
import { createClient }    from '@/lib/supabase/server'
import { normalizeVi, parseSearchIntent } from '@/entities/search/model/normalize'
import type { SearchIntent }              from '@/entities/search/model/normalize'
import type {
  SearchRankedHit,
  SearchResult,
  SearchFilters,
  SearchCursor,
} from '@/entities/search/types'

import type {
  SearchHit,
  SearchResponse,
  SearchEntityType,
  DiscoveryItem,
  DiscoveryContext,
} from '../types'

// ── Semantic search types ─────────────────────────────────────────────────────

export interface SemanticSearchOptions {
  type?:          string
  provinceId?:    number
  districtId?:    number
  categoryId?:    number
  priceMin?:      number
  priceMax?:      number
  limit?:         number
  cursorScore?:   number
  cursorUpdatedAt?: string
  cursorId?:      string
}

export type SemanticSearchHit = SearchRankedHit & {
  retrieval_source: 'semantic' | 'hybrid'
}

// Re-export so existing callers don't need to change imports
export { normalizeVi, parseSearchIntent }
export type { SearchIntent }

// ── universalSearch ───────────────────────────────────────────────────────────
// Calls search_listings_hybrid() — one round-trip combining exact match,
// FTS, trigram similarity, geo boosts, feature boosts, and freshness decay.
// Returns SearchResponse grouped by entity type for the SearchOverlay UI.

const TYPE_HREF: Record<string, string> = {
  land:       '/dat-nong-nghiep/chi-tiet',
  product:    '/san-pham',
  service:    '/dich-vu',
  restaurant: '/nha-hang',
  tourism:    '/du-lich',
  rental:     '/cho-thue',
  event:      '/su-kien',
}

const TYPE_LABEL: Record<string, string> = {
  land:       'Đất đai',
  product:    'Sản phẩm',
  service:    'Dịch vụ',
  restaurant: 'Nhà hàng',
  tourism:    'Du lịch',
  rental:     'Cho thuê',
  event:      'Sự kiện',
}

interface UniversalSearchOptions {
  entityTypes?: SearchEntityType[]
  provinceId?:  number
  districtId?:  number
  categoryId?:  number
  limit?:       number
  profileId?:   string
}

export async function universalSearch(
  query: string,
  options: UniversalSearchOptions = {},
): Promise<SearchResponse> {
  const start  = Date.now()
  const intent = parseSearchIntent(query)
  const {
    entityTypes,
    provinceId,
    districtId,
    categoryId,
    limit = 5,
    profileId,
  } = options

  const supabase = await createClient()

  const typeFilter  = entityTypes?.length === 1 ? entityTypes[0] : null
  const listingType = typeFilter === 'land_listing' ? 'land'
    : typeFilter === 'product'    ? 'product'
    : typeFilter === 'service'    ? 'service'
    : typeFilter === 'storefront' ? null  // storefronts are not in listings
    : null

  const { data, error } = await supabase.rpc('search_listings_hybrid', {
    q:             intent.normalized,
    p_type:        listingType        ?? null,
    p_province_id: provinceId         ?? null,
    p_district_id: districtId         ?? null,
    p_category_id: categoryId         ?? null,
    p_price_min:   intent.priceHint?.min ?? null,
    p_price_max:   intent.priceHint?.max ?? null,
    p_area_min:    intent.areaHint?.min  ?? null,
    p_area_max:    intent.areaHint?.max  ?? null,
    p_limit:       limit * (entityTypes?.length ?? 4),
    // Cursor not used for universal search — always returns the top slice
    p_cursor_score:       null,
    p_cursor_updated_at:  null,
    p_cursor_id:          null,
    p_profile_id:         profileId ?? null,
  })

  if (error || !data) {
    console.error('[universalSearch]', error?.message)
    return { query, groups: [], total: 0, duration: Date.now() - start }
  }

  // Omit very low-confidence results (pure noise from the trgm gate)
  const hits = (data as SearchRankedHit[]).filter(h => h.rank_score > 0.05)

  const searchHits: SearchHit[] = hits.map(h => ({
    type:      (h.type === 'land' ? 'land_listing' : h.type) as SearchEntityType,
    id:        h.id,
    slug:      h.slug,
    title:     h.title,
    subtitle:  h.price_text ?? h.location_text ?? null,
    image_url: h.cover_url ?? null,
    href:      `${TYPE_HREF[h.type] ?? '/tim-kiem'}/${h.slug}`,
    score:     h.rank_score,
    badge:     h.is_featured ? 'Nổi bật' : h.is_verified ? 'Xác thực' : undefined,
  }))

  // Group by type
  const grouped = new Map<SearchEntityType, SearchHit[]>()
  for (const hit of searchHits) {
    const arr = grouped.get(hit.type) ?? []
    arr.push(hit)
    grouped.set(hit.type, arr)
  }

  const groups = [...grouped.entries()].map(([type, typeHits]) => ({
    type,
    label: TYPE_LABEL[type === 'land_listing' ? 'land' : type] ?? type,
    hits:  typeHits.slice(0, limit),
  }))

  // Surface the hinted entity type first
  if (intent.entityHint) {
    const hintType = (intent.entityHint === 'land' ? 'land_listing' : intent.entityHint) as SearchEntityType
    groups.sort((a, b) =>
      a.type === hintType ? -1 : b.type === hintType ? 1 : 0,
    )
  }

  return {
    query,
    groups,
    total:    searchHits.length,
    duration: Date.now() - start,
  }
}

// ── searchListings ────────────────────────────────────────────────────────────
// Paginated search for dedicated search/browse pages.
// Uses cursor-based pagination — pass SearchResult.nextCursor fields back as
// cursorScore / cursorUpdatedAt / cursorId for subsequent pages.
//
// Page 1 (no cursor fields set) is cached for 60 s via _cachedSearchPage1.
// Cursor pages (subsequent pages) are never cached — they depend on live state.

interface SearchPage1Params {
  qNorm:        string
  type:         string | null
  provinceId:   number | null
  districtId:   number | null
  categoryId:   number | null
  priceMin:     number | null
  priceMax:     number | null
  areaMin:      number | null
  areaMax:      number | null
  limit:        number
}

const _cachedSearchPage1 = unstable_cache(
  async (p: SearchPage1Params): Promise<SearchRankedHit[]> => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('search_listings_hybrid', {
      q:                   p.qNorm,
      p_type:              p.type,
      p_province_id:       p.provinceId,
      p_district_id:       p.districtId,
      p_category_id:       p.categoryId,
      p_price_min:         p.priceMin,
      p_price_max:         p.priceMax,
      p_area_min:          p.areaMin,
      p_area_max:          p.areaMax,
      p_limit:             p.limit,
      p_cursor_score:      null,
      p_cursor_updated_at: null,
      p_cursor_id:         null,
    })
    if (error) {
      console.error('[searchListings/page1]', error.message)
      return []
    }
    return (data ?? []) as SearchRankedHit[]
  },
  ['search', 'listings', 'page1'],
  { revalidate: 60, tags: ['listings'] },
)

async function _executeSearch(
  qNorm:          string,
  filters:        SearchFilters,
  effectivePriceMin: number | null,
  effectivePriceMax: number | null,
  effectiveAreaMin:  number | null,
  effectiveAreaMax:  number | null,
): Promise<SearchRankedHit[]> {
  const {
    type         = null,
    provinceId   = null,
    districtId   = null,
    categoryId   = null,
    limit        = 20,
    profileId    = null,
    cursorScore,
    cursorUpdatedAt,
    cursorId,
  } = filters

  const hasCursor = cursorScore != null || cursorUpdatedAt != null || cursorId != null

  // Page-1 cache is shared across users — skip it when profileId is set so
  // personalised results are never served from an anonymous cache entry.
  if (!hasCursor && !profileId) {
    return _cachedSearchPage1({
      qNorm,
      type:       type       ?? null,
      provinceId: provinceId ?? null,
      districtId: districtId ?? null,
      categoryId: categoryId ?? null,
      priceMin:   effectivePriceMin,
      priceMax:   effectivePriceMax,
      areaMin:    effectiveAreaMin,
      areaMax:    effectiveAreaMax,
      limit:      limit ?? 20,
    })
  }

  // Personalised page-1 and all cursor pages — always live, never cached
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_listings_hybrid', {
    q:                   qNorm,
    p_type:              type       ?? null,
    p_province_id:       provinceId ?? null,
    p_district_id:       districtId ?? null,
    p_category_id:       categoryId ?? null,
    p_price_min:         effectivePriceMin,
    p_price_max:         effectivePriceMax,
    p_area_min:          effectiveAreaMin,
    p_area_max:          effectiveAreaMax,
    p_limit:             limit ?? 20,
    p_cursor_score:      cursorScore      ?? null,
    p_cursor_updated_at: cursorUpdatedAt  ?? null,
    p_cursor_id:         cursorId         ?? null,
    p_profile_id:        profileId        ?? null,
  })
  if (error) {
    console.error('[searchListings/cursor]', error.message)
    return []
  }
  return (data ?? []) as SearchRankedHit[]
}

export async function searchListings(
  query:   string,
  filters: SearchFilters = {},
): Promise<SearchResult> {
  const start  = Date.now()
  const intent = parseSearchIntent(query)
  const limit  = filters.limit ?? 20

  const effectivePriceMin = filters.priceMin ?? intent.priceHint?.min ?? null
  const effectivePriceMax = filters.priceMax ?? intent.priceHint?.max ?? null
  const effectiveAreaMin  = filters.areaMin  ?? intent.areaHint?.min  ?? null
  const effectiveAreaMax  = filters.areaMax  ?? intent.areaHint?.max  ?? null

  const hits = await _executeSearch(
    intent.normalized,
    filters,
    effectivePriceMin,
    effectivePriceMax,
    effectiveAreaMin,
    effectiveAreaMax,
  )

  // Provide cursor only when we received a full page; null = last page.
  const lastHit = hits.length === limit ? hits[hits.length - 1] : null
  const nextCursor: SearchCursor | null = lastHit
    ? { score: lastHit.rank_score, updatedAt: lastHit.updated_at, id: lastHit.id }
    : null

  return {
    hits,
    total:    hits.length,
    query,
    filters,
    duration: Date.now() - start,
    nextCursor,
  }
}

// ── Discovery feed ────────────────────────────────────────────────────────────
// Trending land listings and new storefronts shown in the empty search state.

const _getDiscoveryItems = unstable_cache(
  async (context: DiscoveryContext, provinceId?: number): Promise<DiscoveryItem[]> => {
    const supabase = await createClient()

    if (context === 'trending' || context === 'popular') {
      // Try MV first — pre-filtered, no moderation conditions needed at query time.
      const { data: mvData, error: mvError } = await supabase
        .from('listings_featured_by_province')
        .select('id, slug, title, price_text, cover_url, province_id')
        .eq('type', 'land')
        .order('is_featured', { ascending: false })
        .order('updated_at',  { ascending: false })
        .limit(8)

      if (mvError) console.warn('[seo-feed-fallback] discovery:', mvError.message)

      const raw: Record<string, unknown>[] = mvError
        ? await supabase
            .from('listings')
            .select('id, slug, title, price_text, cover_url, province_id')
            .eq('type', 'land')
            .eq('is_public', true)
            .eq('moderation_status', 'approved')
            .eq('status', 'published')
            .order('is_featured', { ascending: false })
            .order('updated_at',  { ascending: false })
            .limit(8)
            .then(r => (r.data ?? []) as Record<string, unknown>[])
        : (mvData ?? []) as Record<string, unknown>[]

      return raw.map(r => ({
        type:      'land_listing' as SearchEntityType,
        id:        String(r.id),
        slug:      String(r.slug),
        title:     String(r.title),
        subtitle:  r.price_text ? String(r.price_text) : null,
        image_url: r.cover_url  ? String(r.cover_url)  : null,
        href:      `/dat-nong-nghiep/chi-tiet/${r.slug}`,
        score:     1,
        context,
      }))
    }

    if (context === 'new') {
      const { data } = await supabase
        .from('storefronts')
        .select('id, slug, business_name, avatar_url, is_verified')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(6)

      return ((data ?? []) as Record<string, unknown>[]).map(r => ({
        type:      'storefront' as SearchEntityType,
        id:        String(r.id),
        slug:      String(r.slug),
        title:     String(r.business_name),
        subtitle:  r.is_verified ? 'Đã xác thực' : null,
        image_url: r.avatar_url ? String(r.avatar_url) : null,
        href:      `/doanh-nghiep/${r.slug}`,
        score:     1,
        context,
        badge:     r.is_verified ? 'Xác thực' : undefined,
      }))
    }

    return []
  },
  ['search', 'discovery'],
  { revalidate: 900, tags: ['search'] },
)

export async function getDiscoveryItems(
  context:     DiscoveryContext,
  provinceId?: number,
): Promise<DiscoveryItem[]> {
  return _getDiscoveryItems(context, provinceId)
}

// ── Trending searches ─────────────────────────────────────────────────────────

const _getTrendingSearches = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('search_logs')
      .select('query')
      .gte('last_searched_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order('count', { ascending: false })
      .limit(8)
    return (data ?? []).map(r => (r as { query: string }).query)
  },
  ['search', 'trending'],
  { revalidate: 3600, tags: ['search'] },
)

export async function getTrendingSearches(): Promise<string[]> {
  return _getTrendingSearches()
}

// ── searchListingsCandidates ──────────────────────────────────────────────────
// Semantic search with automatic hybrid fallback for geographic queries.
//
// Flow:
//   1. Call search_listings_semantic() — ANN retrieval with ef_search=200 and
//      dynamic k_candidates (p_limit×20 when province filter is active).
//   2. If fewer than 3 results are returned AND a province was requested,
//      fall back to search_listings_hybrid() with the same parameters.
//      The hybrid path uses FTS + trigram which is not recall-bound by ANN.
//   3. Tag each result with retrieval_source so callers can log/monitor fallback rate.
//
// Intended consumer: AI reranking pipeline and semantic browse pages.
// NOT cached — results depend on the query embedding (live, per-request).

export async function searchListingsCandidates(
  queryEmbedding: number[],
  fallbackQuery:  string,
  options: SemanticSearchOptions = {},
): Promise<SemanticSearchHit[]> {
  const {
    type          = null,
    provinceId    = null,
    districtId    = null,
    categoryId    = null,
    priceMin      = null,
    priceMax      = null,
    limit         = 20,
    cursorScore     = null,
    cursorUpdatedAt = null,
    cursorId        = null,
  } = options as {
    type?:          string | null
    provinceId?:    number | null
    districtId?:    number | null
    categoryId?:    number | null
    priceMin?:      number | null
    priceMax?:      number | null
    limit?:         number
    cursorScore?:   number | null
    cursorUpdatedAt?: string | null
    cursorId?:      string | null
  }

  const supabase = await createClient()

  const { data: semanticData, error: semanticError } = await supabase.rpc(
    'search_listings_semantic',
    {
      query_embedding:     queryEmbedding,
      p_type:              type,
      p_province_id:       provinceId,
      p_district_id:       districtId,
      p_category_id:       categoryId,
      p_price_min:         priceMin,
      p_price_max:         priceMax,
      p_limit:             limit,
      p_cursor_score:      cursorScore,
      p_cursor_updated_at: cursorUpdatedAt,
      p_cursor_id:         cursorId,
    },
  )

  if (semanticError) {
    console.error('[searchListingsCandidates/semantic]', semanticError.message)
  }

  const semanticHits = (semanticData ?? []) as SearchRankedHit[]

  // Hybrid fallback: fires when province is set but semantic recall is too low.
  // A geographic query covering <5% of the index can produce 0-2 ANN hits even
  // with k×20 candidates; the hybrid path is recall-stable for this case.
  if (semanticHits.length < 3 && provinceId !== null) {
    const intent = parseSearchIntent(fallbackQuery)
    const { data: hybridData, error: hybridError } = await supabase.rpc(
      'search_listings_hybrid',
      {
        q:                   intent.normalized,
        p_type:              type,
        p_province_id:       provinceId,
        p_district_id:       districtId,
        p_category_id:       categoryId,
        p_price_min:         priceMin,
        p_price_max:         priceMax,
        p_area_min:          null,
        p_area_max:          null,
        p_limit:             limit,
        p_cursor_score:      cursorScore,
        p_cursor_updated_at: cursorUpdatedAt,
        p_cursor_id:         cursorId,
        p_profile_id:        null,
      },
    )

    if (hybridError) {
      console.error('[searchListingsCandidates/hybrid-fallback]', hybridError.message)
    }

    return ((hybridData ?? []) as SearchRankedHit[]).map(h => ({
      ...h,
      retrieval_source: 'hybrid' as const,
    }))
  }

  return semanticHits.map(h => ({
    ...h,
    retrieval_source: 'semantic' as const,
  }))
}

// ── Log search (fire-and-forget) ──────────────────────────────────────────────

export async function logSearch(query: string, resultCount: number): Promise<void> {
  if (query.trim().length < 2) return
  const supabase = await createClient()
  await supabase.from('search_logs').upsert(
    {
      query:            normalizeVi(query.trim()),
      count:            resultCount,
      last_searched_at: new Date().toISOString(),
    },
    { onConflict: 'query', ignoreDuplicates: false },
  )
}
