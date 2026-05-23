import type { SupabaseClient } from '@supabase/supabase-js'
import type { LandListing, LandDiscoveryPage } from '../types'

export const LAND_PAGE_SIZE = 20

export async function getLandListingsByProvince(
  supabase:   SupabaseClient,
  provinceId: number,
  page = 0,
): Promise<LandDiscoveryPage> {
  const from = page * LAND_PAGE_SIZE
  const { data, count, error } = await supabase
    .from('land_listings')
    .select('*', { count: 'exact' })
    .eq('province_id', provinceId)
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .order('is_featured', { ascending: false })
    .order('created_at',  { ascending: false })
    .range(from, from + LAND_PAGE_SIZE - 1)

  if (error) throw error
  return { items: (data ?? []) as LandListing[], total: count ?? 0, hasMore: (count ?? 0) > from + LAND_PAGE_SIZE }
}

export async function getLandListingImages(
  supabase:  SupabaseClient,
  listingId: string,
) {
  const { data, error } = await supabase
    .from('land_listing_images')
    .select('id, land_listing_id, image_url, sort_order, created_at')
    .eq('land_listing_id', listingId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getNearbyLandListings(
  supabase: SupabaseClient,
  origin: { id: string; ward_id: number | null; district_id: number | null; province_id: number | null },
  limit = 6,
): Promise<LandListing[]> {
  const results:    LandListing[] = []
  const excludeIds = new Set([origin.id])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publicApproved = (query: any) =>
    query
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .not('id', 'in', `(${[...excludeIds].join(',')})`)
      .order('is_featured', { ascending: false })

  if (origin.ward_id && results.length < limit) {
    const { data } = await publicApproved(
      supabase.from('land_listings').select('*').eq('ward_id', origin.ward_id)
    ).limit(limit - results.length)
    for (const row of data ?? []) { results.push(row as LandListing); excludeIds.add(row.id) }
  }

  if (origin.district_id && results.length < limit) {
    const { data } = await publicApproved(
      supabase.from('land_listings').select('*').eq('district_id', origin.district_id)
    ).limit(limit - results.length)
    for (const row of data ?? []) { results.push(row as LandListing); excludeIds.add(row.id) }
  }

  if (origin.province_id && results.length < limit) {
    const { data } = await publicApproved(
      supabase.from('land_listings').select('*').eq('province_id', origin.province_id)
    ).limit(limit - results.length)
    for (const row of data ?? []) { results.push(row as LandListing); excludeIds.add(row.id) }
  }

  return results.slice(0, limit)
}
