export type GeoEntityType = 'province' | 'district' | 'ward'
export type GeoRegion     = 'bac' | 'trung' | 'nam'
export type GeoAliasReason = 'colloquial' | 'historical' | 'abbreviation' | 'old-name' | 'misspelling'

export interface Province {
  readonly id: number
  code:        string
  name:        string
  name_full:   string
  slug:        string
  type:        string
  region:      GeoRegion
  lat:         number | null
  lng:         number | null
  created_at:  string
  updated_at:  string
}

export interface District {
  readonly id: number
  code:        string
  province_id: Province['id']
  name:        string
  name_full:   string
  slug:        string
  type:        string
  lat:         number | null
  lng:         number | null
  created_at:  string
  updated_at:  string
}

export interface Ward {
  readonly id: number
  code:        string
  province_id: Province['id']
  district_id: District['id']
  name:        string
  name_full:   string
  slug:        string
  type:        string
  lat:         number | null
  lng:         number | null
  created_at:  string
  updated_at:  string
}
