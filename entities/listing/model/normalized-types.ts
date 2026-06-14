// Normalized sub-entity interfaces for agricultural land listings.
// Each interface maps 1:1 to a Supabase table created in 030/031 migrations.
// These supplement — not replace — the existing Listing and UniversalListing types.

// ─────────────────────────────────────────────────────────────────────────────
// Shared value-object enums
// ─────────────────────────────────────────────────────────────────────────────

export type RoadSurface =
  | 'asphalt'
  | 'concrete'
  | 'dirt'
  | 'track'
  | 'none'

export type WaterSource =
  | 'irrigation_canal'
  | 'well'
  | 'river'
  | 'rain'
  | 'pipeline'
  | 'none'

export type TerrainType =
  | 'flat'
  | 'gentle_slope'
  | 'steep_slope'
  | 'mixed'

export type FloodRisk =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'

export type FloodSeason =
  | 'dry'
  | 'rainy'
  | 'year_round'

export type SoilType =
  | 'alluvial'
  | 'basalt_red'
  | 'sandy'
  | 'clay'
  | 'peat'
  | 'laterite'
  | 'mixed'

export type IrrigationType =
  | 'canal'
  | 'drip'
  | 'sprinkler'
  | 'flood'
  | 'rain'
  | 'none'

export type Certification =
  | 'vietgap'
  | 'globalgap'
  | 'organic'
  | 'gap_other'

export type LegalDocType =
  | 'so_do'
  | 'so_hong'
  | 'giay_tay'
  | 'contract'
  | 'pending'
  | 'none'

export type Encumbrance =
  | 'mortgage'
  | 'lien'
  | 'easement'

export type CompletenessTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'

// ─────────────────────────────────────────────────────────────────────────────
// ListingInfrastructure
// Physical access, utilities, terrain. Table: listing_infrastructure.
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingInfrastructure {
  listing_id:               string

  // GPS — WGS-84 decimal degrees
  lat:                      number | null
  lng:                      number | null

  // Road
  road_access:              boolean | null
  road_width_m:             number  | null
  road_surface:             RoadSurface | null

  // Utilities
  electricity_access:       boolean | null
  water_source:             WaterSource | null
  water_source_distance_m:  number  | null
  internet_access:          boolean | null

  // Physical
  terrain:                  TerrainType | null
  elevation_m:              number | null
  flood_risk:               FloodRisk | null
  flood_season:             FloodSeason | null

  // Distances
  distance_to_road_m:       number | null
  distance_to_market_km:    number | null
  distance_to_city_km:      number | null

  updated_at:               string
}

// ─────────────────────────────────────────────────────────────────────────────
// ListingAgriculture
// Soil, crops, irrigation, certifications. Table: listing_agriculture.
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingAgriculture {
  listing_id:             string

  // Soil
  soil_type:              SoilType | null
  soil_ph_min:            number | null
  soil_ph_max:            number | null

  // Crops
  current_crops:          string[] | null   // open list (e.g. 'lua', 'ca_phe', 'tieu')
  crop_cycles_per_year:   number  | null
  last_harvest_season:    string  | null    // free text
  fallow_since:           string  | null    // ISO date; null = actively farmed

  // Productivity
  annual_yield_estimate:  string  | null    // free text e.g. '5 tấn/ha'
  irrigation_type:        IrrigationType | null

  // Quality
  certifications:         Certification[] | null
  suitability_notes:      string | null

  updated_at:             string
}

// ─────────────────────────────────────────────────────────────────────────────
// ListingLegal
// Normalized legal document metadata. Table: listing_legal_metadata.
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingLegal {
  listing_id:             string

  // Document
  legal_doc_type:         LegalDocType | null
  parcel_number:          string | null    // Số thửa
  land_registry_number:   string | null    // Số tờ bản đồ
  area_m2_official:       number | null    // Area per official docs (may differ from listing)
  land_use_purpose:       string | null    // Mục đích sử dụng
  land_use_expiry:        string | null    // ISO date; null = permanent use right

  // Legal risks
  is_disputable:          boolean
  encumbrances:           Encumbrance[] | null

  // Verification (admin-set)
  doc_verified:           boolean
  doc_verified_at:        string | null

  // Planning
  is_in_protected_zone:   boolean
  is_in_planning_zone:    boolean
  planning_zone_notes:    string | null

  updated_at:             string
}

// ─────────────────────────────────────────────────────────────────────────────
// ListingMedia (extended)
// Extends the existing ListingMediaItem with media category for drone/aerial.
// This is the application-layer shape — the DB adds no new columns,
// we derive media_category from the url pattern or a future DB column.
// ─────────────────────────────────────────────────────────────────────────────

export type MediaCategory = 'photo' | 'video' | 'drone_video' | 'document'

export interface ListingMedia {
  id:             string
  listing_id:     string
  url:            string
  alt:            string | null
  type:           'image' | 'video'
  media_category: MediaCategory        // derived: video with 'drone'/'aerial' in alt → drone_video
  sort_order:     number
  created_at:     string
}

// ─────────────────────────────────────────────────────────────────────────────
// ListingCompleteness
// Persisted completeness score. Table: listing_completeness.
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingCompleteness {
  listing_id:      string

  // Composite
  total_score:     number   // 0–100

  // Sub-scores (exposed for seller dashboard breakdowns)
  photo_score:     number   // 0–20
  gps_score:       number   // 0–10
  legal_score:     number   // 0–15
  seller_score:    number   // 0–10
  infra_score:     number   // 0–15
  agri_score:      number   // 0–20
  text_score:      number   // 0–5
  video_score:     number   // 0–5

  // Tier
  tier:            CompletenessTier

  // Quick-filter flags
  has_gps:         boolean
  has_infra:       boolean
  has_agriculture: boolean
  has_video:       boolean

  computed_at:     string
}

// ─────────────────────────────────────────────────────────────────────────────
// SellerTrust
// Aggregated trust indicators for the seller profile panel.
// Derived from multiple tables: profiles, listings, crm_leads, merchant_metrics.
// Not stored as a table — assembled by getSellerTrust() query function.
// ─────────────────────────────────────────────────────────────────────────────

export interface SellerTrust {
  user_id:               string
  is_verified:           boolean
  listing_count:         number           // published listings
  avg_response_hours:    number | null    // average hours to first lead response
  response_rate_pct:     number | null    // 0–100: % of inquiries responded to
  member_since:          string           // ISO date: profile created_at
  completed_sales:       number           // listings with status='archived' (sold)
  positive_review_pct:   number | null    // 0–100, null if < 3 reviews
}

// ─────────────────────────────────────────────────────────────────────────────
// SavedSearchFilters
// Stored as JSONB in saved_searches.filters.
// Must stay JSON-serializable — no Date objects.
// ─────────────────────────────────────────────────────────────────────────────

export interface SavedSearchFilters {
  // Geography
  province_id?:      number
  district_id?:      number
  ward_id?:          number

  // Land type (matches LandType values in entities/listing/model/types.ts)
  land_type?:        string

  // Pricing
  price_min?:        number    // VND
  price_max?:        number    // VND

  // Area
  area_min?:         number    // m²
  area_max?:         number    // m²

  // Agricultural filters (from listing_infrastructure + listing_agriculture)
  soil_type?:        string[]  // SoilType values
  water_source?:     string[]  // WaterSource values
  has_road_access?:  boolean
  has_electricity?:  boolean
  flood_risk_max?:   FloodRisk  // max acceptable: 'none'|'low'|'medium'
  certifications?:   string[]  // Certification values

  // Completeness gating
  has_gps?:          boolean
  tier_min?:         CompletenessTier  // exclude listings below this tier
}

// ─────────────────────────────────────────────────────────────────────────────
// ListingDetailExtended
// Augments the existing ListingDetailResult with the new sub-entities.
// Added to ListingDetailResult in entities/listing/api/listing.server.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingDetailExtended {
  infrastructure: ListingInfrastructure | null
  agriculture:    ListingAgriculture    | null
  legal:          ListingLegal          | null
  completeness:   ListingCompleteness   | null
}
