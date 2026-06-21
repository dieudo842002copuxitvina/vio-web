import type { SoilType } from '@/entities/listing/model/normalized-types'
import type { ClimateType } from '@/lib/agri/climate-zones'

export interface AtlasRegion {
  id:             string
  name_vi:        string
  name_short:     string
  province_slugs: string[]
  climate:        ClimateType
  dominant_soils: SoilType[]
  main_crops:     string[]          // crop IDs
  description_vi: string
  rainfall_mm:    string
  temperature:    string
}

export interface ProvinceSoilCoverage {
  province_slug: string
  soils:         { soil: SoilType; pct: number; name_vi: string }[]
  primary_soil:  SoilType
}

export interface ProvinceCropRanking {
  province_slug:  string
  crops:          { id: string; name_vi: string; rank: number }[]
  export_focused: boolean
}
