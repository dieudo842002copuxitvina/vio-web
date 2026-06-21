import { PROVINCE_AGRI_DATA } from '@/lib/agri/province-agri-data'
import { getSoilProfile }       from '@/lib/agri/soil-profiles'
import { getCropProfile }       from '@/lib/agri/crop-profiles'
import { getRegionForProvince } from '@/lib/agri/climate-zones'
import type { ProvinceSoilCoverage, ProvinceCropRanking, AtlasRegion } from './types'

export function getProvinceSoilCoverage(slug: string): ProvinceSoilCoverage | null {
  const profile = PROVINCE_AGRI_DATA[slug]
  if (!profile || !profile.soil_composition.length) return null
  return {
    province_slug: slug,
    primary_soil:  profile.soil_composition[0].soil,
    soils: profile.soil_composition.map(({ soil, pct }) => ({
      soil,
      pct,
      name_vi: getSoilProfile(soil).name_vi,
    })),
  }
}

export function getProvinceCropRanking(slug: string): ProvinceCropRanking | null {
  const profile = PROVINCE_AGRI_DATA[slug]
  if (!profile || !profile.dominant_crops.length) return null
  return {
    province_slug:  slug,
    export_focused: profile.export_products.length >= 2,
    crops: profile.dominant_crops.slice(0, 6).map((id, i) => ({
      id,
      rank:    i + 1,
      name_vi: getCropProfile(id)?.name_vi ?? id,
    })),
  }
}

export function getAtlasRegionForProvince(slug: string): AtlasRegion | null {
  const region = getRegionForProvince(slug)
  if (!region) return null
  return {
    id:             region.id,
    name_vi:        region.name_vi,
    name_short:     region.name_short,
    province_slugs: region.provinces,
    climate:        region.climate,
    dominant_soils: region.soil_types,
    main_crops:     region.main_crops,
    description_vi: region.description_vi,
    rainfall_mm:    region.rainfall_mm,
    temperature:    region.temperature,
  }
}
