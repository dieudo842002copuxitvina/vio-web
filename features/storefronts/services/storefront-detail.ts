import type { SupabaseClient } from '@supabase/supabase-js'

export interface StorefrontDetail {
  id:              string
  merchant_id:     string
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

export interface StorefrontTrust {
  trust_score:        number
  identity_verified:  boolean
  active_listings:    number
  avg_response_hours: number
  response_rate:      number
}

export interface GeoRef    { id: number; name: string; name_full: string; slug: string }
export interface ProductRef { id: string; slug: string; title: string; price_text: string | null; is_featured: boolean }
export interface ServiceRef { id: string; slug: string; title: string; service_area_text: string | null; price_text: string | null }
export interface NearbyRef  { id: string; slug: string; business_name: string; avatar_url: string | null; is_verified: boolean }
export interface ReviewRef  { id: string; rating: number; comment: string | null; reviewer_name: string | null; created_at: string }

export interface StorefrontDetailResult {
  storefront:     StorefrontDetail
  trust:          StorefrontTrust | null
  province:       GeoRef | null
  district:       GeoRef | null
  ward:           GeoRef | null
  products:       ProductRef[]
  services:       ServiceRef[]
  nearby:         NearbyRef[]
  reviews:        ReviewRef[]
  review_count:   number
  average_rating: number | null
}

const SF_COLS  = 'id, merchant_id, slug, business_name, description, phone, zalo_url, facebook_url, tiktok_url, avatar_url, cover_image_url, is_verified, province_id, district_id, ward_id'
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

  const [provRes, distRes, wardRes, prodRes, svcRes, nearbyRes, reviewRes, trustRes] = await Promise.all([
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
      .from('listings')
      .select('id, slug, title, price_text, is_featured')
      .eq('listing_type', 'product')
      .eq('storefront_id', sf.id)
      .eq('is_public', true)
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('updated_at',  { ascending: false })
      .limit(12),

    supabase
      .from('listings')
      .select('id, slug, title, location_text, price_text')
      .eq('listing_type', 'service')
      .eq('storefront_id', sf.id)
      .eq('is_public', true)
      .eq('status', 'published')
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

    supabase
      .from('reviews')
      .select('id, rating, comment, reviewer_name, created_at')
      .eq('storefront_id', sf.id)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('merchant_trust_scores')
      .select('trust_score, identity_verified, active_listings, avg_response_hours, response_rate')
      .eq('profile_id', sf.merchant_id)
      .maybeSingle(),
  ])

  if (provRes.error)   throw provRes.error
  if (distRes.error)   throw distRes.error
  if (wardRes.error)   throw wardRes.error
  if (prodRes.error)   throw prodRes.error
  if (svcRes.error)    throw svcRes.error
  if (nearbyRes.error) throw nearbyRes.error
  if (trustRes.error)  throw trustRes.error

  const reviews     = (reviewRes.data as ReviewRef[]) ?? []
  const total       = reviews.reduce((sum, r) => sum + r.rating, 0)
  const avgRating   = reviews.length > 0 ? Math.round((total / reviews.length) * 10) / 10 : null

  return {
    storefront:     sf,
    trust:          (trustRes.data as StorefrontTrust | null) ?? null,
    province:       (provRes.data as GeoRef | null) ?? null,
    district:       (distRes.data as GeoRef | null) ?? null,
    ward:           (wardRes.data as GeoRef | null) ?? null,
    products: ((prodRes.data ?? []) as Array<{ id: string; slug: string; title: string; price_text: string | null; is_featured: boolean }>)
      .map(r => ({ id: r.id, slug: r.slug, title: r.title, price_text: r.price_text, is_featured: r.is_featured })),
    services: ((svcRes.data ?? []) as Array<{ id: string; slug: string; title: string; location_text: string | null; price_text: string | null }>)
      .map(r => ({ id: r.id, slug: r.slug, title: r.title, service_area_text: r.location_text, price_text: r.price_text })),
    nearby:         (nearbyRes.data as NearbyRef[])  ?? [],
    reviews,
    review_count:   reviews.length,
    average_rating: avgRating,
  }
}
