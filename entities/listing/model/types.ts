// ── Listing type discriminator ─────────────────────────────────────────────────
// All verticals now map to the universal 'listings' table via the 'type' column.

export type ListingType =
  | 'land'
  | 'product'
  | 'service'
  | 'restaurant'
  | 'tourism'
  | 'rental'
  | 'event'

export type ListingStatus     = 'draft' | 'published' | 'paused' | 'expired' | 'archived'
export type ModerationStatus  = 'pending' | 'approved' | 'rejected' | 'hidden'
export type PriceType         = 'fixed' | 'negotiable' | 'on_request' | 'free' | 'per_unit' | 'per_night' | 'per_person'
export type MediaType         = 'image' | 'video'
export type BadgeVariant      = 'default' | 'primary' | 'success' | 'warning' | 'danger'

// ── Shared sub-types ───────────────────────────────────────────────────────────

export interface ListingBadge {
  label:   string
  variant: BadgeVariant
}

export interface ListingMedia {
  id:         string | number
  url:        string
  alt?:       string | null
  sort_order: number
  type:       MediaType
}

export interface ListingGeoRef {
  id:        number
  name:      string
  name_full: string
  slug:      string
}

export interface ListingOwner {
  id:          string
  full_name:   string | null
  avatar_url:  string | null
  phone:       string | null
  is_verified: boolean
}

// ── Universal listing — runtime representation used by ALL verticals ───────────
// Cards, search results, sitemap entries, and feed items all consume this shape.
// Vertical-specific DB rows are mapped here by adapters in lib/adapters.ts.

export interface UniversalListing {
  // ── Identity
  id:    string
  type:  ListingType
  slug:  string
  href:  string          // computed canonical URL: /dat-nong-nghiep/chi-tiet/{slug}

  // ── Content
  title:             string
  short_description: string | null
  description:       string | null

  // ── Media
  cover_url:  string | null
  media:      ListingMedia[]

  // ── Geo
  province_id:   number | null
  district_id:   number | null
  location_text: string | null     // "Cẩm Mỹ, Đồng Nai" — pre-formatted for display

  // ── Pricing
  price_text:  string | null       // "1.5 Tỷ" — human-readable, pre-formatted
  price_type:  PriceType | null

  // ── Status flags
  is_featured:       boolean
  is_verified:       boolean
  is_public:         boolean
  moderation_status: ModerationStatus

  // ── Taxonomy
  category_id: number | null

  // ── Ownership
  owner_id:      string | null
  storefront_id: string | null
  owner:         ListingOwner | null

  // ── Contact
  contact_phone: string | null
  contact_zalo:  string | null
  contact_email: string | null

  // ── UI helpers (computed by adapters)
  badges: ListingBadge[]

  // ── Vertical-specific attributes
  // Key = category_attribute.key, value = formatted display string.
  // e.g. { area: '1.200 m²', legal_status: 'Sổ đỏ', cuisine_type: 'Việt Nam' }
  // Rendered by <ListingMetaGrid /> without knowing about specific verticals.
  attributes: Record<string, string | number | boolean | null>

  // ── Timestamps
  published_at: string | null
  created_at:   string
  updated_at:   string
}

// ── Lightweight card shape (subset used by card components + search results) ───

export type ListingCardData = Pick<
  UniversalListing,
  | 'id' | 'type' | 'slug' | 'href'
  | 'title' | 'short_description'
  | 'cover_url'
  | 'location_text'
  | 'price_text' | 'price_type'
  | 'is_featured' | 'is_verified'
  | 'badges' | 'attributes'
>

// ── Sitemap shape ─────────────────────────────────────────────────────────────

export interface ListingSitemapEntry {
  slug:       string
  href:       string
  updated_at: string
  is_featured: boolean
}

// ── Route → listing type mapping ──────────────────────────────────────────────

export const LISTING_TYPE_ROUTES: Record<ListingType, string> = {
  land:       '/dat-nong-nghiep/chi-tiet',
  product:    '/san-pham',
  service:    '/dich-vu',
  restaurant: '/nha-hang',
  tourism:    '/du-lich',
  rental:     '/cho-thue',
  event:      '/su-kien',
}

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  land:       'Đất nông nghiệp',
  product:    'Sản phẩm',
  service:    'Dịch vụ',
  restaurant: 'Nhà hàng',
  tourism:    'Du lịch',
  rental:     'Cho thuê',
  event:      'Sự kiện',
}

// ── Raw DB row shapes — direct Supabase responses, no transformations ─────────
// Adapters in lib/adapters.ts convert these to UniversalListing.
// Keep in sync with supabase/migrations/001_create_listings.sql.

export interface Listing {
  id:                string
  type:              ListingType
  slug:              string
  title:             string
  short_description: string | null
  description:       string | null
  cover_url:         string | null
  province_id:       number | null
  district_id:       number | null
  location_text:     string | null
  price_amount:      number | null
  price_unit:        string | null
  price_text:        string | null
  price_type:        PriceType | null
  status:            ListingStatus
  moderation_status: ModerationStatus
  is_public:         boolean
  is_featured:       boolean
  is_verified:       boolean
  category_id:       number | null
  owner_id:          string | null
  storefront_id:     string | null
  contact_phone:     string | null
  contact_zalo:      string | null
  contact_email:     string | null
  search_vector:     string | null
  published_at:      string | null
  expires_at:        string | null
  created_at:        string
  updated_at:        string
}

export interface ListingMediaRow {
  id:         string
  listing_id: string
  url:        string
  alt:        string | null
  type:       MediaType
  sort_order: number
  created_at: string
}

export interface ListingAttributeValueRow {
  id:            string
  listing_id:    string
  key:           string
  value_text:    string | null
  value_number:  number | null
  value_boolean: boolean | null
  value_json:    unknown
}

// ── Attribute value types (for form rendering) ────────────────────────────────

// ── Land-specific types ────────────────────────────────────────────────────────
// Moved here from features/land-listings/types — co-located with the listing model.

export type LandType =
  | 'lua'
  | 'rau_mau'
  | 'cay_lau_nam'
  | 'an_trai'
  | 'lam_nghiep'
  | 'mat_nuoc'
  | 'hon_hop'

export const LAND_TYPE_LABELS: Record<LandType, string> = {
  lua:         'Đất lúa',
  rau_mau:     'Đất rau màu',
  cay_lau_nam: 'Đất cây lâu năm',
  an_trai:     'Đất cây ăn trái',
  lam_nghiep:  'Đất lâm nghiệp',
  mat_nuoc:    'Đất mặt nước',
  hon_hop:     'Đất hỗn hợp',
}

export type AttributeValue = string | number | boolean | string[] | null

export interface DynamicAttribute {
  key:        string
  label:      string
  value:      AttributeValue
  input_type:
    | 'text' | 'textarea' | 'number' | 'currency' | 'phone' | 'url'
    | 'select' | 'multiselect' | 'radio'
    | 'range' | 'boolean' | 'checkbox'
    | 'date' | 'image'
  options?:   Array<{ value: string; label: string }>
  required?:  boolean
  placeholder?: string
  help_text?:   string | null
}
