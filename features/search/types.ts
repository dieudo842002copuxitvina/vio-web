// ── Search entity types ───────────────────────────────────────────────────────

export type SearchEntityType =
  | 'land_listing'
  | 'product'
  | 'service'
  | 'storefront'
  | 'category'
  | 'province'
  | 'district'

// ── A single search result item ───────────────────────────────────────────────

export interface SearchHit {
  type:       SearchEntityType
  id:         string
  slug:       string
  title:      string
  subtitle:   string | null    // price, location, category name, etc.
  image_url:  string | null
  href:       string           // canonical URL
  score:      number           // ts_rank or trigram similarity
  badge?:     string           // 'Xác thực', 'Nổi bật', 'Mới'
}

// ── Grouped results (for the overlay UI) ─────────────────────────────────────

export interface SearchResultGroup {
  type:  SearchEntityType
  label: string               // 'Đất đai', 'Sản phẩm', 'Dịch vụ' ...
  hits:  SearchHit[]
}

// ── Search response ───────────────────────────────────────────────────────────

export interface SearchResponse {
  query:    string
  groups:   SearchResultGroup[]
  total:    number
  duration: number             // ms
}

// ── Discovery feed items ──────────────────────────────────────────────────────

export type DiscoveryContext =
  | 'trending'
  | 'nearby'
  | 'popular'
  | 'new'
  | 'recommended'
  | 'seasonal'

export interface DiscoveryItem extends SearchHit {
  context:     DiscoveryContext
  distance_m?: number
}

// ── Search intent (parsed from query) ────────────────────────────────────────

export interface SearchIntent {
  raw:           string
  normalized:    string        // diacritic-stripped, lowercase
  geo_tokens:    string[]      // detected province/district names
  entity_hint:   SearchEntityType | null
  category_hint: string | null
  price_hint:    { min?: number; max?: number } | null
}

// ── Recent/trending search entry ──────────────────────────────────────────────

export interface SearchSuggestion {
  query:       string
  count:       number
  entity_type: SearchEntityType | null
}
