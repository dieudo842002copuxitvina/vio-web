export interface Storefront {
  id:               string
  owner_id:         string
  slug:             string
  business_name:    string
  description:      string | null
  phone:            string | null
  zalo_url:         string | null
  facebook_url:     string | null
  tiktok_url:       string | null
  province_id:      number | null
  district_id:      number | null
  ward_id:          number | null
  avatar_url:       string | null
  cover_image_url:  string | null
  is_verified:      boolean
  is_public:        boolean
  created_at:       string
  updated_at:       string
}
