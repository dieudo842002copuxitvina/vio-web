-- ── 006_trigram_normalized_columns.sql ──────────────────────────────────────
-- Week 2: dedicated normalized text columns + trigram-only search RPC.
--
-- What 003_search_engine.sql already provides:
--   • pg_trgm + unaccent extensions
--   • unaccent(text) IMMUTABLE wrapper
--   • search_vector trigger (unaccented FTS)
--   • listings_title_trgm_idx on unaccent(title)      ← case-preserved
--   • search_listings()   — FTS + light trgm bonus combined
--   • autocomplete_listings() — prefix FTS
--
-- What this migration adds:
--   • normalize_vietnamese_text()            — canonical DB normalizer
--   • listings.title_normalized              — lower + unaccent generated column
--   • listings.short_description_normalized  — same
--   • GIN trgm indexes on both columns       ← lowercase-normalised, planner-friendly
--   • search_listings_trgm()                 — trigram-only RPC (typo-tolerant fallback)
--
-- Safe to re-run: all DDL uses IF NOT EXISTS / OR REPLACE.

-- ── 1. normalize_vietnamese_text() ──────────────────────────────────────────
-- Mirrors the JS normalizeVi() + lowercase.
-- NOT declared STRICT so it handles NULL input gracefully via COALESCE.

CREATE OR REPLACE FUNCTION normalize_vietnamese_text(input_text text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT lower(unaccent(coalesce(input_text, ''))) $$;

-- ── 2. Normalized generated columns on listings ──────────────────────────────
-- GENERATED ALWAYS AS … STORED: computed at write-time, stored on disk.
-- Auto-synced on every INSERT/UPDATE — no extra trigger needed.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS title_normalized text
    GENERATED ALWAYS AS (normalize_vietnamese_text(title)) STORED,
  ADD COLUMN IF NOT EXISTS short_description_normalized text
    GENERATED ALWAYS AS (normalize_vietnamese_text(short_description)) STORED;

-- ── 3. GIN trigram indexes ────────────────────────────────────────────────────
-- title_normalized: primary trigram index — used by search_listings_trgm().
-- Short description: partial index, skip empty rows to keep size down.

CREATE INDEX IF NOT EXISTS listings_title_normalized_trgm_idx
  ON listings USING gin (title_normalized extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS listings_short_desc_normalized_trgm_idx
  ON listings USING gin (short_description_normalized extensions.gin_trgm_ops)
  WHERE short_description_normalized <> '';

-- ── 4. search_listings_trgm() RPC ────────────────────────────────────────────
-- Trigram-only similarity search — no FTS required.
-- Called by the TypeScript layer (features/search/api/search.server.ts) when
-- search_listings() returns sparse strong hits for a query ≥ 3 characters.
--
-- Ranking: title_sim * 0.6 + short_desc_sim * 0.2 + feature boosts + recency.
-- Default p_min_sim 0.15 is more permissive than the 0.20 in search_listings()
-- to catch typos and partial matches the FTS path misses.
--
-- Parameters (all optional except q):
--   q             — raw query string (normalized inside via normalize_vietnamese_text)
--   p_type        — listing type filter or NULL = all types
--   p_province_id — geo filter; also adds +0.10 to rank_score on match
--   p_district_id — geo filter; adds +0.08
--   p_category_id — category filter; adds +0.05
--   p_limit       — max rows returned (default 12)
--   p_min_sim     — minimum similarity threshold (default 0.15)

CREATE OR REPLACE FUNCTION search_listings_trgm(
  q              text,
  p_type         text     DEFAULT NULL,
  p_province_id  integer  DEFAULT NULL,
  p_district_id  integer  DEFAULT NULL,
  p_category_id  integer  DEFAULT NULL,
  p_limit        integer  DEFAULT 12,
  p_min_sim      float4   DEFAULT 0.15
)
RETURNS TABLE (
  id                uuid,
  type              text,
  slug              text,
  title             text,
  short_description text,
  cover_url         text,
  location_text     text,
  price_text        text,
  price_amount      numeric,
  is_featured       boolean,
  is_verified       boolean,
  province_id       integer,
  district_id       integer,
  category_id       integer,
  contact_phone     text,
  updated_at        timestamptz,
  rank_score        float4
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  q_norm text;
BEGIN
  q_norm := normalize_vietnamese_text(q);
  IF q_norm = '' OR length(q_norm) < 2 THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.type::text,
    l.slug,
    l.title,
    l.short_description,
    l.cover_url,
    l.location_text,
    l.price_text,
    l.price_amount,
    l.is_featured,
    l.is_verified,
    l.province_id,
    l.district_id,
    l.category_id,
    l.contact_phone,
    l.updated_at,
    (
      -- Title similarity (primary signal, 60% weight)
      greatest(0.0, similarity(l.title_normalized, q_norm) * 0.6)

      -- Short description similarity (secondary signal, 20% weight)
      + greatest(0.0, coalesce(similarity(l.short_description_normalized, q_norm), 0.0) * 0.2)

      -- Feature boosts (scaled down vs search_listings to keep text-sim dominant)
      + CASE WHEN l.is_featured THEN 0.15 ELSE 0.0 END
      + CASE WHEN l.is_verified THEN 0.05 ELSE 0.0 END

      -- Geo context boosts
      + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id THEN 0.10 ELSE 0.0 END
      + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id THEN 0.08 ELSE 0.0 END
      + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id THEN 0.05 ELSE 0.0 END

      -- Recency: linear decay to 0 over 30 days (max contribution 0.03)
      + greatest(0.0, 0.03 * (1.0 - least(
          extract(epoch from (now() - l.updated_at)) / 2592000.0,
          1.0
        )))
    )::float4 AS rank_score

  FROM listings l

  WHERE
    l.is_public          = true
    AND l.moderation_status = 'approved'
    AND l.status            = 'published'

    -- Optional filters
    AND (p_type        IS NULL OR l.type::text  = p_type)
    AND (p_province_id IS NULL OR l.province_id = p_province_id)
    AND (p_district_id IS NULL OR l.district_id = p_district_id)
    AND (p_category_id IS NULL OR l.category_id = p_category_id)

    -- At least one text column must clear the threshold (hits the GIN indexes)
    AND (
      similarity(l.title_normalized,             q_norm) > p_min_sim
      OR similarity(l.short_description_normalized, q_norm) > p_min_sim
    )

  ORDER BY rank_score DESC, l.updated_at DESC
  LIMIT p_limit;
END;
$$;

-- ── 5. Grants ─────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION normalize_vietnamese_text TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_listings_trgm      TO anon, authenticated;
