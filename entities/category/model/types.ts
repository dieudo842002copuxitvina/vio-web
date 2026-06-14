// ── Entity types that categories apply to ────────────────────────────────────

export type EntityType =
  | 'land_listing'
  | 'product'
  | 'service'
  | 'restaurant'
  | 'ticket'
  | 'tourism'
  | 'storefront'
  | 'feed_post'
  | 'rental'
  | 'event'

// ── Attribute input types for dynamic filters ─────────────────────────────────

export type AttributeInputType =
  | 'select'
  | 'multiselect'
  | 'range'
  | 'boolean'
  | 'text'

// ── Core category ─────────────────────────────────────────────────────────────

export interface Category {
  id:               number
  parent_id:        number | null
  slug:             string          // segment slug: 'may-nong-nghiep'
  full_slug:        string          // routable path: 'nong-nghiep/may-nong-nghiep'
  path:             string          // ltree id path: '1.42.107'
  depth:            number          // 0 = root

  name:             string
  name_en:          string | null
  description:      string | null

  icon_emoji:       string | null
  icon_url:         string | null
  cover_url:        string | null

  entity_types:     EntityType[]   // which listing tables use this category

  seo_title:        string | null
  seo_description:  string | null
  seo_keywords:     string[] | null

  sort_order:       number
  popularity_score: number
  listing_count:    number          // denormalized, refreshed via trigger

  is_active:        boolean
  is_featured:      boolean

  created_at:       string
  updated_at:       string
}

// ── Nested tree shape (runtime only) ─────────────────────────────────────────

export interface CategoryNode extends Category {
  children: CategoryNode[]
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

export interface CategoryCrumb {
  id:        number
  name:      string
  full_slug: string
  href:      string   // always '/' + full_slug
}

// ── Dynamic filter attributes ─────────────────────────────────────────────────

export interface AttributeOption {
  value:  string
  label:  string
  count?: number     // populated at query time for filter result counts
}

export interface CategoryAttribute {
  id:          number
  category_id: number
  key:         string          // 'soil_type' | 'price_range' | 'water_source'
  label:       string          // 'Loại đất' | 'Giá' | 'Nguồn nước'
  input_type:  AttributeInputType
  options:     AttributeOption[] | null
  is_required: boolean
  sort_order:  number
}

// ── Alias (redirects / multilingual) ─────────────────────────────────────────

export interface CategoryAlias {
  id:          number
  category_id: number
  alias_slug:  string
  locale:      string
}

// ── Discovery context (for category landing pages) ───────────────────────────

export interface CategoryPageContext {
  category:    Category
  breadcrumbs: CategoryCrumb[]
  children:    Category[]        // direct children for sub-nav
  attributes:  CategoryAttribute[]
  siblings:    Category[]        // same-level peers for navigation
}

// ── Geo × Category combination ────────────────────────────────────────────────

export interface CategoryGeoCombo {
  category:  Pick<Category, 'id' | 'name' | 'full_slug' | 'icon_emoji'>
  province:  { id: number; name: string; slug: string }
  district?: { id: number; name: string; slug: string } | null
  count:     number
}
