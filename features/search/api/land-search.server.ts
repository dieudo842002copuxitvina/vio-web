// Server-only. Import only from Server Components, Route Handlers, or Server Actions.
import { createCachedClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LandSortOption = 'newest' | 'price_asc' | 'price_desc'

export interface LandBrowseParams {
  q?:          string
  provinceId?: number
  landTypes?:  string[]     // e.g. ['lua', 'an_trai']
  legals?:     string[]     // e.g. ['so_do', 'so_hong']
  priceMin?:   number       // VND
  priceMax?:   number       // VND
  sort?:       LandSortOption
  page?:       number
}

export interface LandListingHit {
  id:            string
  slug:          string
  title:         string
  cover_url:     string | null
  location_text: string | null
  price_text:    string | null
  price_amount:  number | null
  is_featured:   boolean
  is_verified:   boolean
  province_id:   number | null
  contact_phone: string | null
  updated_at:    string
}

export interface LandBrowseResult {
  listings:   LandListingHit[]
  total:      number
  page:       number
  totalPages: number
}

export const PAGE_SIZE = 20

// ── fetchLandListings ─────────────────────────────────────────────────────────
// Direct DB query — no FTS ranking. Used for the /tim-kiem browse/filter page.
// Attribute filters (land_type, legal_status) are resolved via a two-step query
// to listing_attribute_values before the main listings query.

export async function fetchLandListings(params: LandBrowseParams): Promise<LandBrowseResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createCachedClient()
  const page   = Math.max(1, params.page ?? 1)
  const offset = (page - 1) * PAGE_SIZE

  // ── Step 1: attribute pre-filter ───────────────────────────────────────────
  // Resolve land_type + legal_status to listing IDs via listing_attribute_values.
  // If both are set, compute the intersection (AND semantics).

  let attrIds: Set<string> | null = null

  const attrFilters: Array<{ key: string; values: string[] }> = []
  if (params.landTypes?.length)  attrFilters.push({ key: 'land_type',    values: params.landTypes })
  if (params.legals?.length)     attrFilters.push({ key: 'legal_status', values: params.legals   })

  if (attrFilters.length > 0) {
    const attrSets = await Promise.all(
      attrFilters.map(async (f) => {
        const { data } = await supabase
          .from('listing_attribute_values')
          .select('listing_id')
          .eq('key', f.key)
          .in('value_text', f.values)
        return new Set<string>(((data ?? []) as { listing_id: string }[]).map(r => r.listing_id))
      }),
    )

    // Intersection: listing must satisfy ALL active attribute filters
    attrIds = attrSets[0]!
    for (let i = 1; i < attrSets.length; i++) {
      const s = attrSets[i]!
      attrIds = new Set([...attrIds].filter(id => s.has(id)))
    }

    if (attrIds.size === 0) {
      return { listings: [], total: 0, page, totalPages: 0 }
    }
  }

  // ── Step 2: main listings query ────────────────────────────────────────────

  let q = supabase
    .from('listings')
    .select(
      'id, slug, title, cover_url, location_text, price_text, price_amount, ' +
      'is_featured, is_verified, province_id, contact_phone, updated_at',
      { count: 'exact' },
    )
    .eq('listing_type', 'land')
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .eq('status', 'published')

  if (params.q?.trim())  q = q.textSearch('search_vector', params.q.trim(), { type: 'websearch', config: 'vietnamese' })
  if (params.provinceId) q = q.eq('province_id', params.provinceId)
  if (params.priceMin)   q = q.gte('price_amount', params.priceMin)
  if (params.priceMax)   q = q.lte('price_amount', params.priceMax)
  if (attrIds !== null)  q = q.in('id', [...attrIds])

  switch (params.sort) {
    case 'price_asc':  q = q.order('price_amount', { ascending: true,  nullsFirst: false }); break
    case 'price_desc': q = q.order('price_amount', { ascending: false, nullsFirst: false }); break
    default:
      q = q.order('is_featured', { ascending: false })
           .order('updated_at',  { ascending: false })
  }

  q = q.range(offset, offset + PAGE_SIZE - 1)

  const { data, count, error } = await q

  if (error) {
    console.error('[fetchLandListings]', error.message)
    return { listings: [], total: 0, page, totalPages: 0 }
  }

  const total      = (count as number) ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    listings:   (data ?? []) as LandListingHit[],
    total,
    page,
    totalPages,
  }
}

// ── fetchProvinces ────────────────────────────────────────────────────────────

export interface ProvinceOption {
  id:   number
  name: string
  slug: string
}

export async function fetchProvinces(): Promise<ProvinceOption[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createCachedClient()
  const { data } = await supabase
    .from('provinces')
    .select('id, name, slug')
    .order('name', { ascending: true })
  return (data ?? []) as ProvinceOption[]
}
