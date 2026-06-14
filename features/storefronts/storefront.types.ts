export interface Storefront {
  id:             string
  merchant_id:    string
  slug:           string
  business_name:  string
  avatar_url:     string | null
  banner_url:     string | null
  about_html:     string | null
  is_verified:    boolean
  social_links: {
    zalo?:     string
    facebook?: string
    website?:  string
  }
  contact_phone: string | null
}

export interface MerchantTrust {
  trust_score:           number  // 0–100
  active_listings_count: number
  response_rate:         number  // percentage 0–100
  joined_date:           string  // ISO date string YYYY-MM-DD
}
