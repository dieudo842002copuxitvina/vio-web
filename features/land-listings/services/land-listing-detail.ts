import type { SupabaseClient } from '@supabase/supabase-js'
import type { LandListing }   from '../types'
import type { Province, District, Ward } from '@/lib/geo/types'
import { getNearbyLandListings, getLandListingImages } from './land-listings'

export interface LandListingGeo {
  province: Pick<Province, 'id' | 'name' | 'name_full' | 'slug'> | null
  district: Pick<District, 'id' | 'name' | 'name_full' | 'slug'> | null
  ward:     Pick<Ward,     'id' | 'name' | 'name_full' | 'slug'> | null
}

export interface LandListingDetailResult {
  listing:    LandListing
  images:     { id: number; land_listing_id: string; image_url: string; sort_order: number; created_at: string }[]
  coverImage: string | null
  geo:        LandListingGeo
  nearby:     LandListing[]
}

export async function getLandListingDetail(
  supabase: SupabaseClient,
  slug:     string,
): Promise<LandListingDetailResult | null> {
  const { data: listing } = await supabase
    .from('land_listings')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!listing) return null

  const [images, province, district, ward, nearby] = await Promise.all([
    getLandListingImages(supabase, listing.id),

    listing.province_id
      ? supabase.from('provinces').select('id, name, name_full, slug').eq('id', listing.province_id).maybeSingle()
          .then(r => r.data as Pick<Province, 'id' | 'name' | 'name_full' | 'slug'> | null)
      : Promise.resolve(null),

    listing.district_id
      ? supabase.from('districts').select('id, name, name_full, slug').eq('id', listing.district_id).maybeSingle()
          .then(r => r.data as Pick<District, 'id' | 'name' | 'name_full' | 'slug'> | null)
      : Promise.resolve(null),

    listing.ward_id
      ? supabase.from('wards').select('id, name, name_full, slug').eq('id', listing.ward_id).maybeSingle()
          .then(r => r.data as Pick<Ward, 'id' | 'name' | 'name_full' | 'slug'> | null)
      : Promise.resolve(null),

    getNearbyLandListings(supabase, {
      id:          listing.id,
      ward_id:     listing.ward_id,
      district_id: listing.district_id,
      province_id: listing.province_id,
    }, 4),
  ])

  const coverImage = images.find(img => img.sort_order === 0)?.image_url ?? null

  return {
    listing:    listing as LandListing,
    images,
    coverImage,
    geo: { province, district, ward },
    nearby,
  }
}
