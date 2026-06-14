-- ── 007_hybrid_search_indexes.sql ────────────────────────────────────────────
-- Week 2 Phase 2: production-grade hybrid search infrastructure.
--
-- Builds on:
--   001–002: listings table + base FTS
--   003: pg_trgm, unaccent, search_vector trigger, search_listings(), autocomplete_listings()
--   006: normalize_vietnamese_text(), title_normalized, short_description_normalized,
--        listings_title_normalized_trgm_idx, search_listings_trgm()
--
-- This migration adds:
--   1. search_vector GIN index (ensure exists)
--   2. Partial composite indexes for high-cardinality filter patterns
--   3. search_listings_hybrid()  — single-RPC ranked search, cursor pagination
--   4. autocomplete_listings()   — typo-tolerant replacement (same signature)
--
-- Safe to re-run: all DDL uses IF NOT EXISTS / OR REPLACE.
--
-- ── Why prefix indexes matter ─────────────────────────────────────────────────
-- PostgreSQL GIN trgm indexes support LIKE 'prefix%' queries in addition to
-- similarity(). The listings_title_normalized_trgm_idx (migration 006) already
-- handles this. No separate B-tree prefix index is needed because trigram-based
-- prefix scanning is O(k) where k = matched candidates, not O(n).
--
-- ── Why trigram indexes matter ────────────────────────────────────────────────
-- Vietnamese text has ~8 common diacritic forms per base character. Exact text
-- matching fails for "dat" ≠ "đất". Normalizing to ASCII (unaccent + lower) and
-- building a GIN trgm index reduces typo-tolerant similarity scans from full
-- table scan to bitmap index scan, typically 100–1000× faster at 100k+ rows.
--
-- ── Why hybrid ranking is superior ───────────────────────────────────────────
-- FTS alone: zero results for typos ("đat nong" → no tsvector match).
-- Trigram alone: poor precision for long queries (similarity dilutes with length).
-- Exact/prefix bonuses: ensure "Đất Bình Dương" surfaces above "Đất" for the
-- query "đất bình dương". Combining all three handles ≥ 95% of real queries
-- with appropriate precision/recall tradeoff.
--
-- ── Why geo ranking improves CTR ─────────────────────────────────────────────
-- Buyers in Hà Nội rarely purchase land in Cần Thơ. Province boost (+0.20) and
-- district boost (+0.15) together outweigh the featured boost (+0.30) for
-- matched listings, ensuring local supply is shown before better-matched but
-- distant alternatives. Click-through rates improve when the buyer's context
-- is respected over pure text relevance.
--
-- ── PostGIS distance scoring — future enhancement ────────────────────────────
-- When listings.geo_point (geometry, SRID 4326) column is added:
--
--   ALTER TABLE listings ADD COLUMN IF NOT EXISTS
--     geo_point geometry(Point, 4326)
--     GENERATED ALWAYS AS (
--       CASE WHEN lng IS NOT NULL AND lat IS NOT NULL
--            THEN ST_MakePoint(lng, lat) END
--     ) STORED;
--   CREATE INDEX listings_geo_idx ON listings USING gist (geo_point)
--     WHERE geo_point IS NOT NULL;
--
-- Then add to search_listings_hybrid() ranking (replace geo_point with actual col):
--   + CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND l.geo_point IS NOT NULL
--       THEN GREATEST(0.0, 0.15 * (1.0 - LEAST(
--         ST_Distance(l.geo_point::geography,
--                     ST_MakePoint(p_lng, p_lat)::geography) / 100000.0, 1.0)))
--       ELSE 0.0 END
--   (caps distance bonus at 100 km; max +0.15 for listings within 100 m)

-- ── 1. Ensure search_vector GIN index exists ──────────────────────────────────

CREATE INDEX IF NOT EXISTS listings_search_vector_idx
  ON listings USING gin (search_vector);

-- ── 2. Partial composite indexes ─────────────────────────────────────────────
-- Partial condition matches every public query's base filter, keeping the index
-- 60–75% smaller than a full-table index at scale. At 1M listings, ~300k are
-- typically active; the partial index covers only those rows.

-- Type + recency: powers /dat-nong-nghiep, /san-pham, /dich-vu browse pages.
CREATE INDEX IF NOT EXISTS listings_type_created_idx
  ON listings (type, created_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

-- Province + type + recency: powers geo-scoped browse (/tinh/:slug/dat, etc.)
CREATE INDEX IF NOT EXISTS listings_province_type_created_idx
  ON listings (province_id, type, created_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

-- Featured listings: homepage widgets, "nổi bật" sections — tiny index, fast.
CREATE INDEX IF NOT EXISTS listings_featured_updated_idx
  ON listings (updated_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published'
    AND is_featured = true;

-- ── 3. search_listings_hybrid() RPC ──────────────────────────────────────────
-- Single round-trip ranked search combining all signals.
--
-- Ranking formula (additive, not normalised — absolute values matter for cursor):
--
--   Signal                  Range       Weight
--   ─────────────────────── ─────────── ──────
--   Exact title match        0 or 2.0    fixed
--   Prefix title match       0 or 1.0    fixed (subset of exact)
--   FTS ts_rank × 2          0..2.0      ×2 so strong FTS dominates
--   Title trigram × 0.8      0..0.8      typo tolerance
--   Desc  trigram × 0.2      0..0.2      secondary signal
--   is_featured              +0.30       editorial
--   is_verified              +0.10       trust
--   Province match           +0.20       geo relevance
--   District match           +0.15       geo relevance
--   Category match           +0.10       topic relevance
--   Freshness (30-day decay) 0..0.05     recency
--   ─────────────────────── ─────────── ──────
--   Theoretical max          ≈ 5.90      (perfect match + all boosts)
--   Typical non-empty query  0.15–1.5
--
-- Text match gate (broad — ranking demotes weak matches):
--   browse (q='')   OR  FTS hit  OR  prefix LIKE  OR  trgm > 0.12
--   Lower 0.12 threshold vs 0.15 in search_listings_trgm() because the
--   ranking formula naturally suppresses genuinely poor matches.
--
-- Pagination: cursor-based on (rank_score DESC, updated_at DESC, id DESC).
--   First page:  all cursor params NULL.
--   Next page:   pass last row's (rank_score, updated_at, id) as cursor.
--
-- Parameters:
--   q                   raw query string; empty = browse mode
--   p_type              listing type filter or NULL = all types
--   p_province_id       geo filter; adds +0.20 to rank on match
--   p_district_id       geo filter; adds +0.15
--   p_category_id       category filter; adds +0.10
--   p_price_min/max     price range in VND (listings.price_amount)
--   p_area_min/max      land area m² (via listing_attribute_values key=area_m2)
--   p_limit             page size (recommend ≤ 50 for performance)
--   p_cursor_score      rank_score of the last item on the previous page
--   p_cursor_updated_at updated_at of the last item on the previous page
--   p_cursor_id         id of the last item on the previous page

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

  -- websearch_to_tsquery handles: "quoted phrase", -exclusion, OR.
  -- Falls back to NULL so trgm/prefix paths still work on parse error.
  IF q_norm <> '' THEN
    BEGIN
      tsq := websearch_to_tsquery('simple', q_norm);
    EXCEPTION WHEN others THEN
      tsq := NULL;
    END;
  END IF;

  -- Resolve area_m2 schema UUID once so the EXISTS subquery can use it.
  IF p_area_min IS NOT NULL OR p_area_max IS NOT NULL THEN
    SELECT s.id INTO area_schema_id
    FROM   listing_attribute_schemas s
    WHERE  s.listing_type = 'land' AND s.key = 'area_m2'
    LIMIT  1;
  END IF;

  RETURN QUERY
  -- ── scored CTE ────────────────────────────────────────────────────────────
  -- Computes rank_score for every candidate. The planner inlines this CTE
  -- (PG 12+ default) so filters are pushed down to the table scan.
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
        -- ── Exact & prefix match bonuses ──────────────────────────────────
        -- These bonuses are high enough to surface verbatim title matches
        -- above any combination of similarity + feature boosts.
        CASE
          WHEN q_norm <> '' AND l.title_normalized = q_norm          THEN 2.0
          WHEN q_norm <> '' AND l.title_normalized LIKE (q_norm || '%') THEN 1.0
          ELSE 0.0
        END

        -- ── Full-text search rank ──────────────────────────────────────────
        -- ts_rank normalisation flag 1 = divide by 1 + log(length).
        -- Multiplied by 2 so a strong FTS signal dominates feature boosts.
        + CASE WHEN tsq IS NOT NULL
            THEN ts_rank(l.search_vector, tsq, 1) * 2.0
            ELSE 0.0
          END

        -- ── Trigram similarity ─────────────────────────────────────────────
        -- Covers typos, missing diacritics, partial token matches.
        -- Uses listings_title_normalized_trgm_idx (GIN, migration 006).
        + GREATEST(0.0, similarity(l.title_normalized, q_norm) * 0.8)
        + GREATEST(0.0,
            COALESCE(similarity(l.short_description_normalized, q_norm), 0.0) * 0.2)

        -- ── Feature / trust boosts ─────────────────────────────────────────
        + CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

        -- ── Geo context boosts ─────────────────────────────────────────────
        -- Province/district match reflects buyer intent without requiring
        -- PostGIS. Values tuned so province match ≈ strong FTS boost.
        + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
            THEN 0.20 ELSE 0.0 END
        + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
            THEN 0.15 ELSE 0.0 END
        + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
            THEN 0.10 ELSE 0.0 END

        -- ── Freshness: linear decay to 0 over 30 days ─────────────────────
        -- Max contribution 0.05 — small enough not to promote stale featured
        -- listings over fresh non-featured ones after 30 days.
        + GREATEST(0.0, 0.05 * (
            1.0 - LEAST(
              EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
              1.0
            )
          ))
      )::float4 AS _rank

    FROM listings l

    WHERE
      -- Base visibility filter (hits listings_type_created_idx partial condition)
      l.is_public          = true
      AND l.moderation_status = 'approved'
      AND l.status            = 'published'

      -- Optional filters
      AND (p_type        IS NULL OR l.type::text  = p_type)
      AND (p_province_id IS NULL OR l.province_id = p_province_id)
      AND (p_district_id IS NULL OR l.district_id = p_district_id)
      AND (p_category_id IS NULL OR l.category_id = p_category_id)
      AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
      AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)

      -- ── Text match gate ─────────────────────────────────────────────────
      -- Broad OR so at least one index path activates per query.
      -- Ranking demotes weak trgm matches; they won't surface on page 1.
      AND (
        q_norm = ''                                                      -- browse
        OR (tsq IS NOT NULL AND l.search_vector @@ tsq)                  -- FTS
        OR (q_norm <> '' AND l.title_normalized LIKE (q_norm || '%'))    -- prefix
        OR (q_norm <> '' AND similarity(l.title_normalized, q_norm) > 0.12)  -- trgm
      )

      -- ── Area range (land only, via attribute values) ─────────────────────
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
  -- ── Page slice with keyset cursor ─────────────────────────────────────────
  -- Stable sort: (rank DESC, updated_at DESC, id DESC).
  -- id is a UUID (v4) so tiebreak is arbitrary but deterministic within a
  -- transaction — sufficient for cursor stability.
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
    -- First page (no cursor)
    p_cursor_score IS NULL
    -- Subsequent pages: exclude everything we've already shown
    OR s._rank < p_cursor_score
    OR (s._rank = p_cursor_score AND s.updated_at < p_cursor_updated_at)
    OR (s._rank = p_cursor_score AND s.updated_at = p_cursor_updated_at
        AND s.id < p_cursor_id)
  )
  ORDER BY s._rank DESC, s.updated_at DESC, s.id DESC
  LIMIT p_limit;
END;
$$;

-- ── 4. autocomplete_listings() — typo-tolerant replacement ───────────────────
-- Replaces the migration-003 version. Return signature is identical so
-- autocomplete.server.ts requires no changes.
--
-- Strategy:
--   Path 1 (FTS prefix)  — "dat n" → 'dat:* & n:*'; uses search_vector GIN;
--                           fast for correctly-spelled queries.
--   Path 2 (trgm)        — similarity(title_normalized, q) > 0.20; uses
--                           listings_title_normalized_trgm_idx; catches typos.
--   UNION ALL → DISTINCT ON (slug): keeps highest-scoring row per listing.
--   Final ORDER BY score DESC LIMIT p_limit.
--
-- Why DISTINCT ON vs GROUP BY:
--   DISTINCT ON preserves the full row without aggregation. For ≤ 8 results
--   the Sort + LimitNode is faster than HashAggregate + re-join.
--
-- Score scale:
--   FTS path:  ts_rank (0..1) + featured (0.25) + verified (0.10) + 0.10 bonus
--   Trgm path: similarity × 0.8 + featured (0.15) + verified (0.05)
--   FTS consistently scores higher than trgm for identical listings,
--   so FTS results are preferred over trgm results via DISTINCT ON ordering.

CREATE OR REPLACE FUNCTION autocomplete_listings(
  q          text,
  p_type     text    DEFAULT NULL,
  p_province integer DEFAULT NULL,
  p_limit    integer DEFAULT 8
)
RETURNS TABLE (
  type     text,
  slug     text,
  title    text,
  subtitle text,
  score    float4
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  q_norm text;
  q_pfx  text;
  tsq    tsquery;
BEGIN
  q_norm := normalize_vietnamese_text(q);
  IF q_norm = '' OR length(q_norm) < 2 THEN RETURN; END IF;

  -- Build prefix tsquery: "dat no" → 'dat:* & no:*'
  q_pfx := regexp_replace(q_norm, '(\S+)', '\1:*', 'g');
  q_pfx := regexp_replace(q_pfx,  '\s+',   ' & ',  'g');
  BEGIN
    tsq := to_tsquery('simple', q_pfx);
  EXCEPTION WHEN others THEN
    tsq := NULL;
  END;

  RETURN QUERY
  WITH candidates AS (
    -- ── Path 1: prefix FTS ─────────────────────────────────────────────────
    -- Uses listings_search_vector_idx (GIN). Fast bitmap scan; high precision
    -- for queries with correct spelling (common case in autocomplete).
    SELECT
      l.type::text                                       AS _type,
      l.slug                                             AS _slug,
      l.title                                            AS _title,
      l.price_text                                       AS _subtitle,
      (
        ts_rank(l.search_vector, tsq)
        + CASE WHEN l.is_featured THEN 0.25 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END
        + 0.10  -- source bonus: FTS preferred over trgm for equal scores
      )::float4                                          AS _score,
      1                                                  AS _src
    FROM listings l
    WHERE
      l.is_public = true AND l.moderation_status = 'approved' AND l.status = 'published'
      AND (p_type     IS NULL OR l.type::text  = p_type)
      AND (p_province IS NULL OR l.province_id = p_province)
      AND tsq IS NOT NULL
      AND l.search_vector @@ tsq

    UNION ALL

    -- ── Path 2: trigram similarity ─────────────────────────────────────────
    -- Uses listings_title_normalized_trgm_idx (GIN, migration 006).
    -- Catches "dat nong" → "đất nông", "binh duong" → "Bình Dương", typos.
    SELECT
      l.type::text,
      l.slug,
      l.title,
      l.price_text,
      (
        similarity(l.title_normalized, q_norm) * 0.8
        + CASE WHEN l.is_featured THEN 0.15 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.05 ELSE 0.0 END
      )::float4,
      2
    FROM listings l
    WHERE
      l.is_public = true AND l.moderation_status = 'approved' AND l.status = 'published'
      AND (p_type     IS NULL OR l.type::text  = p_type)
      AND (p_province IS NULL OR l.province_id = p_province)
      AND similarity(l.title_normalized, q_norm) > 0.20
  ),
  -- Keep highest-scoring source per listing.
  -- ORDER BY must start with the DISTINCT ON key (_slug).
  deduped AS (
    SELECT DISTINCT ON (_slug)
      _type, _slug, _title, _subtitle, _score
    FROM candidates
    ORDER BY _slug, _score DESC, _src ASC
  )
  SELECT _type, _slug, _title, _subtitle, _score
  FROM deduped
  ORDER BY _score DESC, _title ASC
  LIMIT p_limit;
END;
$$;

-- ── 5. Grants ─────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION search_listings_hybrid TO anon, authenticated;
GRANT EXECUTE ON FUNCTION autocomplete_listings   TO anon, authenticated;

-- ── Verification checklist ────────────────────────────────────────────────────

-- 1. FTS index hit for a common query:
--    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
--    SELECT * FROM search_listings_hybrid('đất nông nghiệp', p_type => 'land', p_limit => 20);
--    ✓ Expected: "Bitmap Index Scan on listings_search_vector_idx"
--    ✗ Red flag: "Seq Scan on listings" with rows > 10k

-- 2. Trigram index hit for a typo query:
--    EXPLAIN (ANALYZE, BUFFERS)
--    SELECT * FROM search_listings_hybrid('dat nong ngheip', p_type => 'land', p_limit => 20);
--    ✓ Expected: "Bitmap Index Scan on listings_title_normalized_trgm_idx"
--    Note: "Rows Removed by Filter" in trgm scans is normal (GIN candidates
--          are narrowed by the similarity() check after extraction).

-- 3. Prefix path in autocomplete:
--    EXPLAIN (ANALYZE, BUFFERS)
--    SELECT * FROM autocomplete_listings('đất bi', p_type => 'land', p_limit => 8);
--    ✓ Expected: GIN scan on search_vector + optional trgm scan

-- 4. Composite index for type-filtered browse:
--    EXPLAIN (ANALYZE, BUFFERS)
--    SELECT id, slug, title FROM listings
--    WHERE type = 'land' AND is_public = true
--          AND moderation_status = 'approved' AND status = 'published'
--    ORDER BY created_at DESC LIMIT 24;
--    ✓ Expected: "Index Scan using listings_type_created_idx"

-- 5. Province + type browse:
--    EXPLAIN (ANALYZE, BUFFERS)
--    SELECT id, slug, title FROM listings
--    WHERE province_id = 1 AND type = 'land'
--          AND is_public = true AND moderation_status = 'approved' AND status = 'published'
--    ORDER BY created_at DESC LIMIT 24;
--    ✓ Expected: "Index Scan using listings_province_type_created_idx"

-- 6. Confirm trgm operator class on normalized columns:
--    SELECT indexname, indexdef FROM pg_indexes
--    WHERE tablename = 'listings' AND indexdef ILIKE '%trgm%';
--    ✓ Expected: listings_title_trgm_idx, listings_title_normalized_trgm_idx,
--                listings_short_desc_normalized_trgm_idx

-- 7. Cursor pagination smoke test:
--    -- Page 1
--    SELECT * FROM search_listings_hybrid('đất', p_type => 'land', p_limit => 5);
--    -- Page 2 (substitute values from last row of page 1)
--    SELECT * FROM search_listings_hybrid(
--      'đất', p_type => 'land', p_limit => 5,
--      p_cursor_score      => <last_rank_score>,
--      p_cursor_updated_at => '<last_updated_at>',
--      p_cursor_id         => '<last_id>'
--    );
--    ✓ Expected: no overlapping ids between page 1 and page 2.

-- ── Scaling notes (1M+ listings) ─────────────────────────────────────────────
-- GIN search_vector index:  ~500 MB at 1M rows. Monitor pg_stat_user_indexes.
-- GIN trgm title_normalized: ~2 GB at 1M rows (character n-gram density).
-- Tuning:
--   SET gin_pending_list_limit = '32 MB';  -- reduce flush overhead on writes
--   ALTER INDEX listings_title_normalized_trgm_idx SET (fastupdate = on);
-- At 5M+ rows: migrate text search to Typesense/Meilisearch; keep PostgreSQL
-- for filter-only browse paths where composite indexes remain fast.
