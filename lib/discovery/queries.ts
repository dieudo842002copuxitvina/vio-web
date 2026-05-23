import type { SupabaseClient } from '@supabase/supabase-js'

export const PAGE_SIZE = 20

export interface DistrictSummary {
  district_id:      number
  province_id:      number
  name:             string
  name_full:        string
  slug:             string
  storefront_count: number
  product_count:    number
  service_count:    number
}

export interface DiscoveryPage<T> {
  items:   T[]
  total:   number
  hasMore: boolean
}

export async function getProvinceStorefronts(
  supabase:   SupabaseClient,
  provinceId: number,
  page = 0,
): Promise<DiscoveryPage<Record<string, unknown>>> {
  const from = page * PAGE_SIZE
  const { data, count, error } = await supabase
    .from('storefronts')
    .select('id, slug, business_name, description, phone, zalo_url, avatar_url, is_verified, district_id', { count: 'exact' })
    .eq('province_id', provinceId)
    .eq('is_public', true)
    .order('is_verified', { ascending: false })
    .order('created_at',  { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (error) throw error
  return { items: data ?? [], total: count ?? 0, hasMore: (count ?? 0) > from + PAGE_SIZE }
}

export async function getProvinceDistrictSummary(
  supabase:   SupabaseClient,
  provinceId: number,
): Promise<DistrictSummary[]> {
  const { data, error } = await supabase
    .from('district_discovery_summary')
    .select('*')
    .eq('province_id', provinceId)
    .gt('storefront_count', 0)
    .order('storefront_count', { ascending: false })

  if (error) throw error
  return (data ?? []) as DistrictSummary[]
}

export async function getDistrictStorefronts(
  supabase:   SupabaseClient,
  districtId: number,
  page = 0,
): Promise<DiscoveryPage<Record<string, unknown>>> {
  const from = page * PAGE_SIZE
  const { data, count, error } = await supabase
    .from('storefronts')
    .select('id, slug, business_name, description, phone, zalo_url, avatar_url, is_verified, district_id', { count: 'exact' })
    .eq('district_id', districtId)
    .eq('is_public', true)
    .order('is_verified', { ascending: false })
    .order('created_at',  { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (error) throw error
  return { items: data ?? [], total: count ?? 0, hasMore: (count ?? 0) > from + PAGE_SIZE }
}
