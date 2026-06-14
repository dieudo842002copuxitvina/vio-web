// Server-only. Import only from Server Components, Server Actions, or Route Handlers.
// Do NOT import this file in 'use client' components.

import { createClient }   from '@/lib/supabase/server'
import { publicApproved } from '@/lib/supabase/query-helpers'
import type { Listing, ListingType } from '../model/types'
import type {
  ListingInfrastructure,
  ListingAgriculture,
  ListingLegal,
  ListingCompleteness,
} from '../model/normalized-types'

// ── Shared detail types ───────────────────────────────────────────────────────

export interface ListingGeoDetail {
  province: { id: number; name: string; name_full: string; slug: string } | null
  district: { id: number; name: string; name_full: string; slug: string } | null
  ward:     { id: number; name: string; name_full: string; slug: string } | null
}

export interface ListingSellerProfile {
  full_name:   string | null
  avatar_url:  string | null
  phone:       string | null
  is_verified: boolean
}

export interface ListingMediaItem {
  id:         string
  url:        string
  alt:        string | null
  type:       string
  sort_order: number
}

export interface ListingDetailResult {
  listing:    Listing
  media:      ListingMediaItem[]
  coverImage: string | null
  geo:        ListingGeoDetail
  nearby:     Listing[]
  profile:    ListingSellerProfile | null
  // Display-ready attribute values keyed by schema key, resolved from listing_attribute_values.
  // e.g. { area_m2: '1.200 m²', legal_status: 'Sổ đỏ', soil_type: 'Đất thịt' }
  attrs:      Record<string, string | null>
  // Normalized sub-entities (null for listings created before migration 030)
  infrastructure: ListingInfrastructure | null
  agriculture:    ListingAgriculture    | null
  legal:          ListingLegal          | null
  completeness:   ListingCompleteness   | null
}

// Explicit column list — excludes search_vector (tsvector, not useful to callers).
// The DB column is `listing_type`; aliased to `type` so the Listing TS type is unchanged.
const COLS = [
  'id', 'listing_type:type', 'slug', 'title', 'short_description', 'description',
  'cover_url', 'province_id', 'district_id', 'location_text',
  'price_amount', 'price_unit', 'price_text', 'price_type',
  'status', 'moderation_status', 'is_public', 'is_featured', 'is_verified',
  'category_id', 'owner_id', 'storefront_id',
  'contact_phone', 'contact_zalo', 'contact_email',
  'published_at', 'expires_at', 'created_at', 'updated_at',
].join(', ')

export interface ListingFilters {
  type?:        ListingType
  province_id?: number
  category_id?: number
  limit?:       number
  offset?:      number
}

// Cast to any before passing to publicApproved — Supabase's deep generic chain
// triggers TS2589 "type instantiation is excessively deep" otherwise.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function approved(q: any): any { return publicApproved(q) }

// ── getListingBySlug ──────────────────────────────────────────────────────────

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const supabase = await createClient()

  const { data, error } = await approved(
    supabase.from('listings').select(COLS).eq('slug', slug)
  ).maybeSingle()

  if (error) {
    console.error('[getListingBySlug]', error.message)
    return null
  }

  return data as Listing | null
}

// ── getListings ───────────────────────────────────────────────────────────────

export async function getListings(
  filters: ListingFilters = {}
): Promise<{ items: Listing[]; total: number }> {
  const { type, province_id, category_id, limit = 20, offset = 0 } = filters
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = approved(
    supabase.from('listings').select(COLS, { count: 'exact' })
  )
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type)        query = query.eq('listing_type', type)
  if (province_id) query = query.eq('province_id', province_id)
  if (category_id) query = query.eq('category_id', category_id)

  const { data, count, error } = await query

  if (error) {
    console.error('[getListings]', error.message)
    return { items: [], total: 0 }
  }

  return { items: (data ?? []) as Listing[], total: count ?? 0 }
}

// ── getFeaturedListings ───────────────────────────────────────────────────────

export async function getFeaturedListings(
  filters: Pick<ListingFilters, 'type' | 'limit'> = {}
): Promise<Listing[]> {
  const { type, limit = 6 } = filters
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = approved(supabase.from('listings').select(COLS))
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('listing_type', type)

  const { data, error } = await query

  if (error) {
    console.error('[getFeaturedListings]', error.message)
    return []
  }

  return (data ?? []) as Listing[]
}

// ── getListingsByProvince ─────────────────────────────────────────────────────

export async function getListingsByProvince(
  provinceId: number,
  filters: Pick<ListingFilters, 'type' | 'limit' | 'offset'> = {}
): Promise<{ items: Listing[]; total: number }> {
  const { type, limit = 20, offset = 0 } = filters
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = approved(
    supabase.from('listings').select(COLS, { count: 'exact' })
  )
    .eq('province_id', provinceId)
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('listing_type', type)

  const { data, count, error } = await query

  if (error) {
    console.error('[getListingsByProvince]', error.message)
    return { items: [], total: 0 }
  }

  return { items: (data ?? []) as Listing[], total: count ?? 0 }
}

// ── searchListings ────────────────────────────────────────────────────────────

export async function searchListings(
  q: string,
  filters: ListingFilters = {}
): Promise<Listing[]> {
  const { type, province_id, limit = 20, offset = 0 } = filters
  const supabase = await createClient()

  // Uses the tsvector column populated by the listings_search_vector_trigger.
  // websearch mode supports quoted phrases and - exclusions naturally.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = approved(supabase.from('listings').select(COLS))
    .textSearch('search_vector', q, { type: 'websearch', config: 'simple' })
    .order('is_featured', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type)        query = query.eq('listing_type', type)
  if (province_id) query = query.eq('province_id', province_id)

  const { data, error } = await query

  if (error) {
    console.error('[searchListings]', error.message)
    return []
  }

  return (data ?? []) as Listing[]
}

// ── getNearbyListings ─────────────────────────────────────────────────────────
// Geo-aware fallback: district first, then province.
// Uses district_id / province_id from the listings table (no ward_id column).

export async function getNearbyListings(
  origin: { id: string; district_id: number | null; province_id: number | null },
  type:   ListingType,
  limit = 4,
): Promise<Listing[]> {
  const supabase = await createClient()
  const results:    Listing[] = []
  const excludeIds = new Set([origin.id])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function nearbyQ(q: any): any {
    return approved(q)
      .not('id', 'in', `(${[...excludeIds].join(',')})`)
      .eq('listing_type', type)
      .order('is_featured', { ascending: false })
  }

  if (origin.district_id && results.length < limit) {
    const { data } = await nearbyQ(
      supabase.from('listings').select(COLS).eq('district_id', origin.district_id)
    ).limit(limit - results.length)
    for (const row of (data ?? [])) { results.push(row as Listing); excludeIds.add((row as Listing).id) }
  }

  if (origin.province_id && results.length < limit) {
    const { data } = await nearbyQ(
      supabase.from('listings').select(COLS).eq('province_id', origin.province_id)
    ).limit(limit - results.length)
    for (const row of (data ?? [])) { results.push(row as Listing); excludeIds.add((row as Listing).id) }
  }

  return results.slice(0, limit)
}

// ── getListingDetail ──────────────────────────────────────────────────────────
// Full detail fetch: listing + media + resolved attributes + geo + profile + nearby.
// Does NOT use publicApproved — RLS handles owner-vs-public visibility.

function resolveAttrDisplay(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  val: any,
): string | null {
  const { field_type, options } = schema
  switch (field_type) {
    case 'number':
      if (val.value_number == null) return null
      return val.value_number.toLocaleString('vi-VN')
    case 'currency': {
      if (val.value_number == null) return null
      const n = val.value_number as number
      if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Tỷ`
      if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)} Triệu`
      return n.toLocaleString('vi-VN') + ' đ'
    }
    case 'checkbox':
      if (val.value_json == null) return null
      return val.value_json ? 'Có' : 'Không'
    case 'multiselect': {
      const arr = Array.isArray(val.value_json) ? (val.value_json as string[]) : []
      if (arr.length === 0) return null
      if (options) {
        const optMap = new Map((options as { value: string; label: string }[]).map(o => [o.value, o.label]))
        return arr.map((v: string) => optMap.get(v) ?? v).join(', ')
      }
      return arr.join(', ')
    }
    case 'select':
    case 'radio': {
      if (!val.value_text) return null
      if (options) {
        const opt = (options as { value: string; label: string }[]).find(o => o.value === val.value_text)
        return opt?.label ?? val.value_text
      }
      return val.value_text
    }
    case 'date': {
      if (!val.value_text) return null
      try {
        return new Date(val.value_text).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      } catch {
        return val.value_text
      }
    }
    default:
      return val.value_text ?? null
  }
}

export async function getListingDetail(slug: string): Promise<ListingDetailResult | null> {
  const supabase = await createClient()

  const { data: listingRaw } = await supabase
    .from('listings')
    .select(COLS)
    .eq('slug', slug)
    .maybeSingle()

  if (!listingRaw) return null
  const listing = listingRaw as unknown as Listing

  const [
    mediaRes, attrRes, provinceRes, districtRes, profileRes, nearby,
    infraRes, agriRes, legalRes, completenessRes,
  ] = await Promise.all([
    supabase
      .from('listing_media')
      .select('id, url, alt, type, sort_order')
      .eq('listing_id', listing.id)
      .order('sort_order', { ascending: true }),

    supabase
      .from('listing_attribute_values')
      .select('value_text, value_number, value_json, listing_attribute_schemas!inner(key, field_type, options)')
      .eq('listing_id', listing.id),

    listing.province_id
      ? supabase.from('provinces').select('id, name, name_full, slug').eq('id', listing.province_id).maybeSingle()
      : Promise.resolve({ data: null }),

    listing.district_id
      ? supabase.from('districts').select('id, name, name_full, slug').eq('id', listing.district_id).maybeSingle()
      : Promise.resolve({ data: null }),

    listing.owner_id
      ? supabase.from('profiles').select('full_name, avatar_url, phone, is_verified').eq('id', listing.owner_id).maybeSingle()
      : Promise.resolve({ data: null }),

    getNearbyListings(
      { id: listing.id, district_id: listing.district_id, province_id: listing.province_id },
      listing.type,
      4,
    ),

    // Normalized sub-entities (may be null for listings pre-migration 030)
    supabase.from('listing_infrastructure').select('*').eq('listing_id', listing.id).maybeSingle(),
    supabase.from('listing_agriculture').select('*').eq('listing_id', listing.id).maybeSingle(),
    supabase.from('listing_legal_metadata').select('*').eq('listing_id', listing.id).maybeSingle(),
    supabase.from('listing_completeness').select('*').eq('listing_id', listing.id).maybeSingle(),
  ])

  const media = ((mediaRes.data ?? []) as ListingMediaItem[])
  const coverImage = listing.cover_url ?? media[0]?.url ?? null

  const attrs: Record<string, string | null> = {}
  for (const row of (attrRes.data ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = (row as any).listing_attribute_schemas
    const key    = schema?.key as string | undefined
    if (!key) continue
    const display = resolveAttrDisplay(schema, row)
    attrs[key] = display
  }

  return {
    listing,
    media,
    coverImage,
    geo: {
      province: provinceRes.data as ListingGeoDetail['province'],
      district: districtRes.data as ListingGeoDetail['district'],
      ward:     null,
    },
    nearby,
    profile:        profileRes.data as ListingSellerProfile | null,
    attrs,
    infrastructure: infraRes.data        as unknown as ListingInfrastructure | null,
    agriculture:    agriRes.data         as unknown as ListingAgriculture    | null,
    legal:          legalRes.data        as unknown as ListingLegal          | null,
    completeness:   completenessRes.data as unknown as ListingCompleteness   | null,
  }
}
