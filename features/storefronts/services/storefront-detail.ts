import type { SupabaseClient } from '@supabase/supabase-js'

export interface StorefrontDetail {
  id:              string
  slug:            string
  business_name:   string
  description:     string | null
  phone:           string | null
  zalo_url:        string | null
  facebook_url:    string | null
  tiktok_url:      string | null
  avatar_url:      string | null
  cover_image_url: string | null
  is_verified:     boolean
  province_id:     number | null
  district_id:     number | null
  ward_id:         number | null
}

export interface GeoRef    { id: number; name: string; name_full: string; slug: string }
export interface ProductRef { id: string; slug: string; title: string; price_text: string | null; is_featured: boolean }
export interface ServiceRef { id: string; slug: string; title: string; service_area_text: string | null }
export interface NearbyRef  { id: string; slug: string; business_name: string; avatar_url: string | null; is_verified: boolean }

export interface StorefrontDetailResult {
  storefront: StorefrontDetail
  province:   GeoRef | null
  district:   GeoRef | null
  ward:       GeoRef | null
  products:   ProductRef[]
  services:   ServiceRef[]
  nearby:     NearbyRef[]
}

const SF_COLS  = 'id, slug, business_name, description, phone, zalo_url, facebook_url, tiktok_url, avatar_url, cover_image_url, is_verified, province_id, district_id, ward_id'
const GEO_COLS = 'id, name, name_full, slug'

export async function getStorefrontDetail(
  supabase: SupabaseClient,
  slug:     string,
): Promise<StorefrontDetailResult | null> {
  const { data: raw, error } = await supabase
    .from('storefronts')
    .select(SF_COLS)
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle()

  if (error) throw error
  if (!raw) return null

  const sf = raw as StorefrontDetail

  const [provRes, distRes, wardRes, prodRes, svcRes, nearbyRes] = await Promise.all([
    sf.province_id
      ? supabase.from('provinces').select(GEO_COLS).eq('id', sf.province_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    sf.district_id
      ? supabase.from('districts').select(GEO_COLS).eq('id', sf.district_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    sf.ward_id
      ? supabase.from('wards').select(GEO_COLS).eq('id', sf.ward_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    supabase
      .from('products')
      .select('id, slug, title, price_text, is_featured')
      .eq('storefront_id', sf.id)
      .eq('is_available', true)
      .order('is_featured', { ascending: false })
      .order('created_at',  { ascending: false })
      .limit(12),

    supabase
      .from('services')
      .select('id, slug, title, service_area_text')
      .eq('storefront_id', sf.id)
      .eq('is_available', true)
      .limit(12),

    sf.district_id
      ? supabase
          .from('storefronts')
          .select('id, slug, business_name, avatar_url, is_verified')
          .eq('district_id', sf.district_id)
          .eq('is_public', true)
          .neq('id', sf.id)
          .order('is_verified', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (provRes.error)   throw provRes.error
  if (distRes.error)   throw distRes.error
  if (wardRes.error)   throw wardRes.error
  if (prodRes.error)   throw prodRes.error
  if (svcRes.error)    throw svcRes.error
  if (nearbyRes.error) throw nearbyRes.error

  return {
    storefront: sf,
    province:   (provRes.data as GeoRef | null) ?? null,
    district:   (distRes.data as GeoRef | null) ?? null,
    ward:       (wardRes.data as GeoRef | null) ?? null,
    products:   (prodRes.data   as ProductRef[]) ?? [],
    services:   (svcRes.data    as ServiceRef[]) ?? [],
    nearby:     (nearbyRes.data as NearbyRef[])  ?? [],
  }
}
