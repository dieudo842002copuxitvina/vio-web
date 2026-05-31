// ── Search filter parameters ───────────────────────────────────────────────────

export interface SearchFilters {
  /** Listing type discriminator — 'land' | 'service' | … | null = all */
  type?:        string
  provinceId?:  number
  districtId?:  number
  categoryId?:  number
  /** Price range in VND (maps to listings.price_amount) */
  priceMin?:    number
  priceMax?:    number
  /** Area range in m² (maps to listing_attribute_values key=area_m2) */
  areaMin?:     number
  areaMax?:     number
  limit?:       number
  /**
   * Cursor-based pagination — pass values from SearchResult.nextCursor.
   * Preferred over offset; stable under concurrent inserts.
   */
  cursorScore?:     number
  cursorUpdatedAt?: string
  cursorId?:        string
  /** @deprecated Cursor fields are preferred. Ignored when any cursor field is set. */
  offset?:          number
  /** Authenticated user's profile UUID — enables personalisation boost (max +0.10) */
  profileId?:       string
}

// ── RPC return shapes ──────────────────────────────────────────────────────────

/** One row returned by the search_listings() PostgreSQL function. */
export interface SearchRankedHit {
  id:                string
  type:              string
  slug:              string
  title:             string
  short_description: string | null
  cover_url:         string | null
  location_text:     string | null
  price_text:        string | null
  price_amount:      number | null
  is_featured:       boolean
  is_verified:       boolean
  province_id:       number | null
  district_id:       number | null
  category_id:       number | null
  contact_phone:     string | null
  updated_at:        string
  rank_score:        number
}

/** One row returned by autocomplete_listings() or search_autocomplete(). */
export interface AutocompleteHit {
  /** Listing type ('land', 'storefront', 'province', …) */
  type:     string
  slug:     string
  /** Primary display label (title for listings, business_name for storefronts) */
  title:    string
  /** Secondary label (price_text, description snippet, …) */
  subtitle: string | null
  score:    number
}

// ── Facets ────────────────────────────────────────────────────────────────────

export interface FacetCount {
  value: string | number
  label: string
  count: number
}

export interface SearchFacets {
  provinces:  FacetCount[]
  categories: FacetCount[]
  priceRange: { min: number; max: number } | null
  areaRange:  { min: number; max: number } | null
}

// ── Full search response ───────────────────────────────────────────────────────

export interface SearchCursor {
  score:     number
  updatedAt: string
  id:        string
}

export interface SearchResult {
  hits:       SearchRankedHit[]
  total:      number
  query:      string
  filters:    SearchFilters
  duration:   number
  /** Non-null when there may be more results. Pass fields to next request. */
  nextCursor: SearchCursor | null
}
