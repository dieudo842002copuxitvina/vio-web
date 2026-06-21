-- 030_listing_sub_entities.sql
-- Normalized sub-entity tables for agricultural land listings.
-- Replaces EAV attributes for structured fields that need to be:
--   • filterable in search (road_access, flood_risk, soil_type, ...)
--   • aggregated in analytics
--   • displayed in trust/completeness scores
--
-- Design notes:
--   • Each table is a 1:1 extension of listings (listing_id = PK + FK).
--   • All fields are nullable — partial data is better than no data.
--   • RLS: public read, owner write (mirrors listings table policy).
--   • EAV (listing_attribute_values) remains for dynamic/custom attributes.
--     These tables store only the structured, domain-critical fields.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. listing_infrastructure
-- Physical access, utilities, terrain, and location metadata.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS listing_infrastructure (
  listing_id               uuid        PRIMARY KEY
                                        REFERENCES listings(id) ON DELETE CASCADE,

  -- GPS — decimal degrees, WGS-84
  lat                      numeric(10, 7),                    -- e.g. 10.7761523
  lng                      numeric(10, 7),                    -- e.g. 106.7024352

  -- Road access
  road_access              boolean,                           -- any drivable road?
  road_width_m             numeric(5, 1),                     -- width in metres
  road_surface             text
    CHECK (road_surface IN ('asphalt', 'concrete', 'dirt', 'track', 'none')),

  -- Utilities
  electricity_access       boolean,
  water_source             text
    CHECK (water_source IN ('irrigation_canal', 'well', 'river', 'rain', 'pipeline', 'none')),
  water_source_distance_m  integer,                           -- metres to nearest source
  internet_access          boolean,

  -- Physical characteristics
  terrain                  text
    CHECK (terrain IN ('flat', 'gentle_slope', 'steep_slope', 'mixed')),
  elevation_m              integer,
  flood_risk               text
    CHECK (flood_risk IN ('none', 'low', 'medium', 'high')),
  flood_season             text
    CHECK (flood_season IN ('dry', 'rainy', 'year_round')),   -- when flood_risk > none

  -- Proximity — integer metres or km (stored as numeric for fractional km)
  distance_to_road_m       integer,
  distance_to_market_km    numeric(6, 1),
  distance_to_city_km      numeric(6, 1),

  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Spatial index for future geo-radius queries
CREATE INDEX IF NOT EXISTS idx_listing_infra_gps
  ON listing_infrastructure(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_infra_road
  ON listing_infrastructure(road_access)
  WHERE road_access IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_infra_water
  ON listing_infrastructure(water_source)
  WHERE water_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_infra_flood
  ON listing_infrastructure(flood_risk)
  WHERE flood_risk IS NOT NULL;

ALTER TABLE listing_infrastructure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "infra_public_read"
  ON listing_infrastructure FOR SELECT USING (true);

CREATE POLICY "infra_owner_insert"
  ON listing_infrastructure FOR INSERT WITH CHECK (
    listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  );

CREATE POLICY "infra_owner_update"
  ON listing_infrastructure FOR UPDATE USING (
    listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  );

CREATE POLICY "infra_owner_delete"
  ON listing_infrastructure FOR DELETE USING (
    listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. listing_agriculture
-- Soil, crop, irrigation, and certification data.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS listing_agriculture (
  listing_id               uuid        PRIMARY KEY
                                        REFERENCES listings(id) ON DELETE CASCADE,

  -- Soil profile
  soil_type                text
    CHECK (soil_type IN ('alluvial', 'basalt_red', 'sandy', 'clay', 'peat', 'laterite', 'mixed')),
  soil_ph_min              numeric(3, 1) CHECK (soil_ph_min BETWEEN 0 AND 14),
  soil_ph_max              numeric(3, 1) CHECK (soil_ph_max BETWEEN 0 AND 14),

  -- Current use
  current_crops            text[],                            -- ['lua', 'ca_phe', 'tieu', ...]
  crop_cycles_per_year     integer CHECK (crop_cycles_per_year BETWEEN 1 AND 5),
  last_harvest_season      text,                              -- e.g. 'Vụ Đông Xuân 2024'
  fallow_since             date,                              -- NULL = currently farmed

  -- Productivity
  annual_yield_estimate    text,                              -- free text, e.g. '5 tấn/ha'
  irrigation_type          text
    CHECK (irrigation_type IN ('canal', 'drip', 'sprinkler', 'flood', 'rain', 'none')),

  -- Quality certifications
  certifications           text[],                            -- ['vietgap', 'globalgap', 'organic']

  -- Seller-provided notes
  suitability_notes        text,                              -- what crops this land is best for

  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_agri_soil
  ON listing_agriculture(soil_type)
  WHERE soil_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_agri_crops
  ON listing_agriculture USING GIN (current_crops)
  WHERE current_crops IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_agri_certs
  ON listing_agriculture USING GIN (certifications)
  WHERE certifications IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_agri_irrigation
  ON listing_agriculture(irrigation_type)
  WHERE irrigation_type IS NOT NULL;

ALTER TABLE listing_agriculture ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agri_public_read"
  ON listing_agriculture FOR SELECT USING (true);

CREATE POLICY "agri_owner_insert"
  ON listing_agriculture FOR INSERT WITH CHECK (
    listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  );

CREATE POLICY "agri_owner_update"
  ON listing_agriculture FOR UPDATE USING (
    listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  );

CREATE POLICY "agri_owner_delete"
  ON listing_agriculture FOR DELETE USING (
    listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. listing_legal_metadata
-- Normalized legal document data, separate from EAV legal_status attribute.
-- Enables verified-document gating and planning-zone filtering.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS listing_legal_metadata (
  listing_id               uuid        PRIMARY KEY
                                        REFERENCES listings(id) ON DELETE CASCADE,

  -- Document type (mirrors LegalStatus enum + extension)
  legal_doc_type           text
    CHECK (legal_doc_type IN ('so_do', 'so_hong', 'giay_tay', 'contract', 'pending', 'none')),

  -- Land registry identifiers
  parcel_number            text,                              -- Số thửa
  land_registry_number     text,                              -- Số tờ bản đồ
  area_m2_official         numeric(12, 2),                    -- Area per official docs

  -- Land use
  land_use_purpose         text,                              -- Mục đích sử dụng
  land_use_expiry          date,                              -- NULL = permanent use right

  -- Legal risks
  is_disputable            boolean     NOT NULL DEFAULT false,
  encumbrances             text[],                            -- ['mortgage', 'lien', 'easement']

  -- Admin verification (set by platform staff, not owners)
  doc_verified             boolean     NOT NULL DEFAULT false,
  doc_verified_at          timestamptz,

  -- Planning / zoning overlays
  is_in_protected_zone     boolean     NOT NULL DEFAULT false,
  is_in_planning_zone      boolean     NOT NULL DEFAULT false,
  planning_zone_notes      text,

  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_legal_type
  ON listing_legal_metadata(legal_doc_type)
  WHERE legal_doc_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_legal_verified
  ON listing_legal_metadata(doc_verified)
  WHERE doc_verified = true;

CREATE INDEX IF NOT EXISTS idx_listing_legal_disputable
  ON listing_legal_metadata(is_disputable)
  WHERE is_disputable = true;

ALTER TABLE listing_legal_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_public_read"
  ON listing_legal_metadata FOR SELECT USING (true);

CREATE POLICY "legal_owner_insert"
  ON listing_legal_metadata FOR INSERT WITH CHECK (
    listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  );

CREATE POLICY "legal_owner_update"
  ON listing_legal_metadata FOR UPDATE USING (
    listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  );

CREATE POLICY "legal_owner_delete"
  ON listing_legal_metadata FOR DELETE USING (
    listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  );
