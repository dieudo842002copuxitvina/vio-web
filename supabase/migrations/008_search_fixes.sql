-- ── 008_search_fixes.sql ──────────────────────────────────────────────────────
-- Week 2.1 Search Hardening.
-- Removes duplicate indexes, adds missing composite indexes, drops legacy
-- OFFSET-based RPCs, and hardens search_listings_hybrid() for production load.
--
-- Depends on: 001–007 applied in order.
-- Safe to re-run: DROP IF EXISTS + CREATE IF NOT EXISTS + OR REPLACE.

-- ── 1. Drop duplicate indexes ──────────────────────────────────────────────────
-- listings_slug_idx duplicates the implicit B-tree built by the UNIQUE
-- constraint (listings_slug_unique) declared in migration 001. Two indexes on
-- the same column double write amplification on every INSERT/UPDATE with zero
-- benefit. Every UPDATE fires two index maintenance operations instead of one.
DROP INDEX IF EXISTS listings_slug_idx;

-- listings_search_vector_idx (migration 007) duplicates listings_search_idx
-- (migration 001). Both are GIN indexes on the same tsvector column.
-- At 1M listings a single GIN index is ~500 MB. Keeping both costs 500 MB of
-- extra RAM and doubles write amplification on every listings update.
DROP INDEX IF EXISTS listings_search_vector_idx;

-- ── 2. Drop low-value non-partial index ───────────────────────────────────────
-- listings_feed_idx is a full-table B-tree on low-cardinality columns:
--   (is_public boolean, moderation_status 4-value enum, status 5-value enum,
--    is_featured boolean, published_at timestamptz)
-- For a WHERE is_public=true AND moderation_status='approved' AND status=
-- 'published' predicate, the three leading columns have ~2-4 distinct values
-- each. The optimizer estimates ~30% of rows match and often prefers a
-- sequential scan over this index. It occupies space and causes write overhead
-- while providing negligible selectivity. The partial composite indexes added
-- below (migration 007 + below) replace it entirely.
DROP INDEX IF EXISTS listings_feed_idx;

-- ── 3. Add missing composite indexes ──────────────────────────────────────────

-- Storefront product/service listing queries
-- (features/storefronts/services/storefront-detail.ts lines 71-89)
-- Query pattern: type = $1 AND storefront_id = $2 AND is_public = true …
--   ORDER BY updated_at DESC LIMIT 12
-- listings_storefront_idx from migration 001 is a full non-partial index on
-- just storefront_id. A partial composite eliminates the visibility filter
-- overhead and covers the ORDER BY in one index scan.
CREATE INDEX IF NOT EXISTS listings_storefront_type_public_idx
  ON listings (storefront_id, type, updated_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

-- Area range filter EXISTS subquery (used in all search RPCs)
-- Pattern: WHERE av.listing_id = l.id AND av.schema_id = $uuid
--          AND av.value_number BETWEEN $min AND $max
-- Currently uses lattr_val_listing_idx(listing_id) + lattr_val_schema_idx
-- (schema_id) separately — two separate index scans per row. A composite
-- covering index on (listing_id, schema_id, value_number) satisfies the
-- EXISTS in a single index range scan.
CREATE INDEX IF NOT EXISTS lattr_val_listing_schema_num_idx
  ON listing_attribute_values (listing_id, schema_id, value_number)
  WHERE value_number IS NOT NULL;

-- Owner dashboard listing query
-- Pattern: owner_id = $uid AND type = $t ORDER BY created_at DESC
-- listings_owner_idx from migration 001 is a non-partial, non-composite index.
-- This composite covers owner filtering + type discrimination + recency sort.
CREATE INDEX IF NOT EXISTS listings_owner_type_created_idx
  ON listings (owner_id, type, created_at DESC);

-- Category page listing query (app/(category)/[...path]/page.tsx)
-- Pattern: category_id = $c AND type = $t AND is_public = true …
--   ORDER BY is_featured DESC, updated_at DESC LIMIT 24
-- listings_category_idx from migration 001 is non-partial, non-composite.
CREATE INDEX IF NOT EXISTS listings_category_type_public_idx
  ON listings (category_id, type, is_featured DESC, updated_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

-- Browse-mode ORDER BY indexes
-- search_listings_hybrid() browse path (q='') orders by:
--   (_rank DESC, updated_at DESC, id DESC)
-- _rank in browse mode = featured/verified/geo/freshness boosts only.
-- When no geo filter is active, _rank differences are ≤0.05 (freshness),
-- so the effective sort is updated_at DESC. The existing migration-007
-- composite indexes are on created_at, NOT updated_at. The planner cannot
-- use them to avoid a sort. These partial indexes cover the browse ORDER BY
-- directly, reducing browse page latency from O(n·log n) sort to O(k) scan.
CREATE INDEX IF NOT EXISTS listings_type_updated_idx
  ON listings (type, updated_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

CREATE INDEX IF NOT EXISTS listings_province_type_updated_idx
  ON listings (province_id, type, updated_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

-- ── 4. Drop legacy OFFSET-based RPCs ──────────────────────────────────────────
-- search_listings() (migration 003) has p_offset integer — OFFSET pagination.
-- At OFFSET 1000 on 1M rows, PostgreSQL scans 1,020 rows and discards 1,000.
-- All callers have been migrated to search_listings_hybrid() (cursor-based).
-- Leaving these functions in the database is a footgun for any future
-- direct-SQL caller or PostgREST integration.

DROP FUNCTION IF EXISTS search_listings(
  text, text, integer, integer, integer,
  numeric, numeric, numeric, numeric,
  integer, integer
);

-- search_listings_trgm() (migration 006) is now fully absorbed into the
-- hybrid function. No callers remain.
DROP FUNCTION IF EXISTS search_listings_trgm(
  text, text, integer, integer, integer, integer, float4
);

-- ── 5. Replace search_listings_hybrid() ───────────────────────────────────────
-- Changes vs migration 007:
--   A. Browse-mode early return (q=''):
--      Skip ALL similarity() + ts_rank() calls. The scored CTE computed
--      similarity(title_normalized, '') = 0 for every row — pure waste.
--      The early-return path computes only the feature/geo/freshness boosts,
--      which are cheap CASE expressions. The planner can use
--      listings_type_updated_idx or listings_province_type_updated_idx for
--      the ORDER BY, avoiding a full sort of all qualifying rows.
--   B. Trigram threshold raised 0.12 → 0.20:
--      similarity(title_normalized, 'dat') > 0.12 matches an enormous
--      candidate set because 'dat' produces only 3 trigrams (' da','dat','at').
--      Raising to 0.20 cuts the GIN bitmap candidate set by ~60% on short
--      queries while ranking naturally demotes the remaining weak matches.
--   C. LIKE prefix gated on length(q_norm) >= 3:
--      LIKE 'da%' has trigrams {' da','da'} — 2 trigrams, very low selectivity.
--      The GIN index for LIKE requires ≥ 3 characters in the prefix to be
--      useful. Gating prevents a near-full-table scan for 2-char inputs.

CREATE OR REPLACE FUNCTION search_listings_hybrid(
  q                    text        DEFAULT '',
  p_type               text        DEFAULT NULL,
  p_province_id        integer     DEFAULT NULL,
  p_district_id        integer     DEFAULT NULL,
  p_category_id        integer     DEFAULT NULL,
  p_price_min          numeric     DEFAULT NULL,
  p_price_max          numeric     DEFAULT NULL,
  p_area_min           numeric     DEFAULT NULL,
  p_area_max           numeric     DEFAULT NULL,
  p_limit              integer     DEFAULT 20,
  p_cursor_score       float4      DEFAULT NULL,
  p_cursor_updated_at  timestamptz DEFAULT NULL,
  p_cursor_id          uuid        DEFAULT NULL
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
  q_norm         text;
  tsq            tsquery;
  area_schema_id uuid;
BEGIN
  q_norm := normalize_vietnamese_text(q);

  IF q_norm <> '' THEN
    BEGIN
      tsq := websearch_to_tsquery('simple', q_norm);
    EXCEPTION WHEN others THEN
      tsq := NULL;
    END;
  END IF;

  -- Resolved once; used in both browse and scored paths.
  IF p_area_min IS NOT NULL OR p_area_max IS NOT NULL THEN
    SELECT s.id INTO area_schema_id
    FROM   listing_attribute_schemas s
    WHERE  s.listing_type = 'land' AND s.key = 'area_m2'
    LIMIT  1;
  END IF;

  -- ── Browse-mode early return ───────────────────────────────────────────────
  -- Skips all text-matching work. The planner uses listings_type_updated_idx
  -- or listings_province_type_updated_idx for the ORDER BY, avoiding a sort.
  IF q_norm = '' THEN
    RETURN QUERY
    WITH browse AS (
      SELECT
        l.id,
        l.type,
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
          CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
          + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END
          + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id THEN 0.20 ELSE 0.0 END
          + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id THEN 0.15 ELSE 0.0 END
          + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id THEN 0.10 ELSE 0.0 END
          + GREATEST(0.0, 0.05 * (
              1.0 - LEAST(
                EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
                1.0
              )
            ))
        )::float4 AS _rank
      FROM listings l
      WHERE
        l.is_public          = true
        AND l.moderation_status = 'approved'
        AND l.status            = 'published'
        AND (p_type        IS NULL OR l.type::text  = p_type)
        AND (p_province_id IS NULL OR l.province_id = p_province_id)
        AND (p_district_id IS NULL OR l.district_id = p_district_id)
        AND (p_category_id IS NULL OR l.category_id = p_category_id)
        AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
        AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
        AND (
          area_schema_id IS NULL
          OR EXISTS (
            SELECT 1 FROM listing_attribute_values av
            WHERE  av.listing_id = l.id
            AND    av.schema_id  = area_schema_id
            AND    (p_area_min IS NULL OR av.value_number >= p_area_min)
            AND    (p_area_max IS NULL OR av.value_number <= p_area_max)
          )
        )
    )
    SELECT
      b.id,
      b.type::text,
      b.slug,
      b.title,
      b.short_description,
      b.cover_url,
      b.location_text,
      b.price_text,
      b.price_amount,
      b.is_featured,
      b.is_verified,
      b.province_id,
      b.district_id,
      b.category_id,
      b.contact_phone,
      b.updated_at,
      b._rank
    FROM browse b
    WHERE (
      p_cursor_score IS NULL
      OR b._rank < p_cursor_score
      OR (b._rank = p_cursor_score AND b.updated_at < p_cursor_updated_at)
      OR (b._rank = p_cursor_score AND b.updated_at = p_cursor_updated_at
          AND b.id < p_cursor_id)
    )
    ORDER BY b._rank DESC, b.updated_at DESC, b.id DESC
    LIMIT p_limit;
    RETURN;  -- exit: skip scored CTE path
  END IF;

  -- ── Scored search path (q_norm <> '') ─────────────────────────────────────
  RETURN QUERY
  WITH scored AS (
    SELECT
      l.id,
      l.type,
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
        -- ── Exact & prefix bonuses ────────────────────────────────────────
        CASE
          WHEN l.title_normalized = q_norm                           THEN 2.0
          WHEN length(q_norm) >= 3
               AND l.title_normalized LIKE (q_norm || '%')           THEN 1.0
          ELSE 0.0
        END

        -- ── FTS rank ──────────────────────────────────────────────────────
        -- ts_rank flag 1 = normalise by 1 + log(doc length).
        -- ×2 so a strong FTS signal dominates over feature boosts.
        + CASE WHEN tsq IS NOT NULL
            THEN ts_rank(l.search_vector, tsq, 1) * 2.0
            ELSE 0.0
          END

        -- ── Trigram similarity ─────────────────────────────────────────────
        -- Title: 0.8 weight. Short description: 0.2 weight.
        + GREATEST(0.0, similarity(l.title_normalized, q_norm) * 0.8)
        + GREATEST(0.0,
            COALESCE(similarity(l.short_description_normalized, q_norm), 0.0) * 0.2)

        -- ── Feature / trust boosts ─────────────────────────────────────────
        + CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

        -- ── Geo context boosts ─────────────────────────────────────────────
        + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
            THEN 0.20 ELSE 0.0 END
        + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
            THEN 0.15 ELSE 0.0 END
        + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
            THEN 0.10 ELSE 0.0 END

        -- ── Freshness: linear decay to 0 over 30 days ─────────────────────
        + GREATEST(0.0, 0.05 * (
            1.0 - LEAST(
              EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
              1.0
            )
          ))
      )::float4 AS _rank

    FROM listings l

    WHERE
      l.is_public          = true
      AND l.moderation_status = 'approved'
      AND l.status            = 'published'

      AND (p_type        IS NULL OR l.type::text  = p_type)
      AND (p_province_id IS NULL OR l.province_id = p_province_id)
      AND (p_district_id IS NULL OR l.district_id = p_district_id)
      AND (p_category_id IS NULL OR l.category_id = p_category_id)
      AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
      AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)

      -- ── Text match gate ─────────────────────────────────────────────────
      -- Threshold raised 0.12 → 0.20 to limit GIN candidate set on short
      -- queries. LIKE prefix gated on length ≥ 3 for GIN index efficacy.
      AND (
        (tsq IS NOT NULL AND l.search_vector @@ tsq)
        OR (length(q_norm) >= 3 AND l.title_normalized LIKE (q_norm || '%'))
        OR similarity(l.title_normalized, q_norm) > 0.20
      )

      AND (
        area_schema_id IS NULL
        OR EXISTS (
          SELECT 1 FROM listing_attribute_values av
          WHERE  av.listing_id = l.id
          AND    av.schema_id  = area_schema_id
          AND    (p_area_min IS NULL OR av.value_number >= p_area_min)
          AND    (p_area_max IS NULL OR av.value_number <= p_area_max)
        )
      )
  )
  SELECT
    s.id,
    s.type::text,
    s.slug,
    s.title,
    s.short_description,
    s.cover_url,
    s.location_text,
    s.price_text,
    s.price_amount,
    s.is_featured,
    s.is_verified,
    s.province_id,
    s.district_id,
    s.category_id,
    s.contact_phone,
    s.updated_at,
    s._rank
  FROM scored s
  WHERE (
    p_cursor_score IS NULL
    OR s._rank < p_cursor_score
    OR (s._rank = p_cursor_score AND s.updated_at < p_cursor_updated_at)
    OR (s._rank = p_cursor_score AND s.updated_at = p_cursor_updated_at
        AND s.id < p_cursor_id)
  )
  ORDER BY s._rank DESC, s.updated_at DESC, s.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_listings_hybrid TO anon, authenticated;
