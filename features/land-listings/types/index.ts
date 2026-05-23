export type LandType =
  | 'lua'
  | 'rau_mau'
  | 'cay_lau_nam'
  | 'an_trai'
  | 'lam_nghiep'
  | 'mat_nuoc'
  | 'hon_hop'

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'hidden'

export interface LandListing {
  id:                string
  owner_id:          string
  slug:              string
  title:             string
  description:       string | null
  province_id:       number | null
  district_id:       number | null
  ward_id:           number | null
  land_area_text:    string | null
  land_type:         LandType | null
  crop_type:         string | null
  price_text:        string | null
  phone:             string | null
  coordinates_text:  string | null
  legal_status_text: string | null
  is_featured:       boolean
  is_public:         boolean
  moderation_status: ModerationStatus
  created_at:        string
  updated_at:        string
}

export interface LandListingImage {
  id:              number
  land_listing_id: string
  image_url:       string
  sort_order:      number
  created_at:      string
}

export interface LandDiscoveryPage {
  items:   LandListing[]
  total:   number
  hasMore: boolean
}

export const LAND_TYPE_LABELS: Record<LandType, string> = {
  lua:          'Đất lúa',
  rau_mau:      'Đất rau màu',
  cay_lau_nam:  'Đất cây lâu năm',
  an_trai:      'Đất cây ăn trái',
  lam_nghiep:   'Đất lâm nghiệp',
  mat_nuoc:     'Đất mặt nước',
  hon_hop:      'Đất hỗn hợp',
}
