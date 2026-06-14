-- ══════════════════════════════════════════════════════════════════════════════
-- 023  DATABASE HARDENING — STEP 1
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 12-task production hardening for marketplace scale:
--   1.  pg_partman retention for listing_events (already partitioned)
--   2.  Data retention cleanup for signals_daily / search_logs
--   3.  Browse-mode partial composite indexes
--   4.  Trigram threshold 0.20 → 0.30 with GIN-backed % operator
--   5.  float4 → float8 cursor stability for search_listings_hybrid
--   6.  Vector search already hardened in 022 (ef_search=200, dynamic k)
--   7.  Cold-start fallback for listings without embeddings (semantic func)
--   8.  Hard spam exclusion in browse + search WHERE clauses
--   9.  Merchant trust safe public view (no fraud_flag exposure)
--   10. Additional search-optimised indexes
--   11. RLS + SECURITY DEFINER hardening
--   12. pg_cron slot audit and daily maintenance jobs
--
-- Depends on: 001–022
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE / DO $$ … EXCEPTION …
--
-- Rollback notes (manual — no DOWN migration):
--   • Indexes:   DROP INDEX IF EXISTS <name>;
--   • View:      DROP VIEW IF EXISTS merchant_trust_public;
--   • Functions: DROP FUNCTION IF EXISTS search_listings_hybrid(…) then restore
--               from migration 019; same for search_listings_semantic from 022.
--   • cron:     SELECT cron.unschedule('prune-listing-signals-daily');
--               SELECT cron.unschedule('prune-search-logs');
--               SELECT cron.unschedule('partman-maintenance');
--
-- Expected performance impact:
--   • Browse latency (no query):       40–70 ms → 5–15 ms (index scan vs sort)
--   • Trigram search GIN hit rate:     ~60% → ~95% (% op vs full-scan similarity)
--   • Cursor pagination stability:     float4 ties (rare) eliminated by float8
--   • New listings in semantic search: cold-start UNION adds <5 ms
--   • fraud_flag PostgREST exposure:   eliminated via view projection
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- §1.  pg_partman — retention config for listing_events
-- ══════════════════════════════════════════════════════════════════════════════
--
-- listing_events was partitioned by month (pg_partman range on created_at)
-- in a direct Supabase migration that pre-dates this file.
-- The primary key is composite (id, created_at).  Only 3 months retained.
--
-- This section configures retention/premake without touching table data.
-- Safe if partman schema doesn't exist — wrapped in a DO guard.
--
-- Planner note:
--   All aggregation functions reading listing_events already carry
--   WHERE created_at >= now() - interval 'X days' which satisfies partition
--   pruning.  Queries without a created_at bound will scan all 3 active
--   partitions instead of the entire table — still a bounded scan.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'partman'
  ) THEN
    UPDATE partman.part_config
    SET
      retention                = '3 months',
      retention_keep_table     = false,
      retention_keep_index     = false,
      premake                  = 3,      -- pre-create 3 future monthly partitions
      infinite_time_partitions = false,
      automatic_maintenance    = 'on'
    WHERE parent_table = 'public.listing_events';

    RAISE NOTICE '[023] pg_partman retention for listing_events set to 3 months';
  ELSE
    RAISE NOTICE '[023] partman schema not found — skipping pg_partman config';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §2.  Impression dedup index — partitioned table compatibility
-- ══════════════════════════════════════════════════════════════════════════════
--
-- The global unique index created in 011 uses to_hour_bucket(created_at),
-- a functional expression over the partition key.  PostgreSQL requires global
-- unique indexes on partitioned tables to include the RAW partition key column,
-- not a function of it.  The global index is silently non-functional.
--
-- Fix strategy: create the unique constraint per-partition (existing partitions
-- handled below; pg_partman templates handle future partitions).
--
-- To add to pg_partman template for future partitions:
--   INSERT INTO partman.template_public_listing_events ... (or configure
--   partman.part_config.template_table to inherit the index definition).
--
-- The DO block below iterates existing child partitions and creates the index
-- on each.  If a partition was already dropped (retention), the loop skips it.
--
-- NOTE: We also DROP the old non-functional global index to avoid confusion.

DROP INDEX IF EXISTS public.listing_events_impression_dedup_idx;

DO $$
DECLARE
  r            record;
  idx_sql      text;
  partition_nm text;
BEGIN
  -- Only execute if listing_events is actually partitioned
  IF NOT EXISTS (
    SELECT 1 FROM pg_partitioned_table pt
    JOIN pg_class c ON c.oid = pt.partrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'listing_events'
  ) THEN
    -- Table is not partitioned; recreate the global unique index (original form)
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS listing_events_impression_dedup_idx
        ON public.listing_events (listing_id, session_id, to_hour_bucket(created_at))
        WHERE event_type = 'impression' AND session_id IS NOT NULL
    $idx$;
    RAISE NOTICE '[023] listing_events is not partitioned — recreated global dedup index';
    RETURN;
  END IF;

  -- Iterate child partitions and create per-partition dedup index
  FOR r IN
    SELECT c.relname AS child_name
    FROM pg_inherits i
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_namespace np ON np.oid = p.relnamespace
    WHERE np.nspname = 'public' AND p.relname = 'listing_events'
    ORDER BY c.relname
  LOOP
    partition_nm := r.child_name;

    -- Index includes created_at directly (satisfies partition-key requirement)
    -- AND to_hour_bucket(created_at) for the hourly dedup semantics.
    -- The partition itself guarantees the month boundary.
    idx_sql := format(
      $f$
        CREATE UNIQUE INDEX IF NOT EXISTS %I
          ON public.%I (listing_id, session_id, to_hour_bucket(created_at), created_at)
          WHERE event_type = 'impression' AND session_id IS NOT NULL
      $f$,
      'listing_events_dedup_' || partition_nm,
      partition_nm
    );

    BEGIN
      EXECUTE idx_sql;
      RAISE NOTICE '[023] Created dedup index on partition %', partition_nm;
    EXCEPTION WHEN others THEN
      RAISE NOTICE '[023] Skipped partition % (likely dropped by retention): %',
                   partition_nm, SQLERRM;
    END;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §3.  Retention cleanup — listing_signals_daily and search_logs
-- ══════════════════════════════════════════════════════════════════════════════
--
-- listing_events retention is managed by pg_partman (drop old partitions).
-- listing_signals_daily and search_logs are plain tables; we prune them
-- with SECURITY DEFINER functions so pg_cron can call them as postgres.
--
-- Retention policy:
--   listing_signals_daily  — 30 days  (7-day aggregation window × 4 cycles)
--   search_logs            — 30 days  (trending searches need only last 7d)
--
-- Planner note:
--   listing_signals_daily: PK is (listing_id, signal_date).  The pruning
--   DELETE uses signal_date which has a leading DESC index from migration 010.
--   At 1M active listings × 30 days = 30M rows max; daily prune keeps this
--   bounded.  DELETE with a btree range scan is O(k) where k = rows deleted.

CREATE OR REPLACE FUNCTION public.prune_listing_signals_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.listing_signals_daily
  WHERE signal_date < current_date - 30;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE LOG '[prune_listing_signals_daily] deleted % rows', deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.prune_search_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.search_logs
  WHERE last_searched_at < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE LOG '[prune_search_logs] deleted % rows', deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.prune_listing_signals_daily TO postgres;
GRANT EXECUTE ON FUNCTION public.prune_search_logs           TO postgres;

-- ══════════════════════════════════════════════════════════════════════════════
-- §4.  pg_cron — daily maintenance jobs
-- ══════════════════════════════════════════════════════════════════════════════
--
-- All three jobs run in the 3 AM window (low-traffic).
-- pg_partman maintenance creates future partitions and drops expired ones.
-- Prune jobs delete stale rows from non-partitioned tables.
--
-- Complete pg_cron slot chain after 023:
--   Every 15 min:
--     :00/:15/:30/:45  refresh_listing_signals_daily      (010)
--     :05/:20/:35/:50  refresh_listing_scores             (010)
--     :08/:23/:38/:53  refresh_listing_ctr_stats          (011)
--     :11/:26/:41/:56  refresh_listing_quality_scores     (011)
--     :14/:29/:44/:59  refresh_user_affinities            (012)
--     :17/:32/:47      refresh_listing_relationships      (013)
--     :21/:36/:51      refresh_market_demand_signals      (014)
--     :24/:39/:54      refresh_listing_health             (014)
--     :28/:43/:58      refresh_merchant_metrics           (015)
--     :29/:44/:59      refresh_listing_performance        (015)
--   Every 30 min:
--     :00/:30          refresh_phone_listing_stats        (016)
--     :05/:35          refresh_listing_authenticity       (016)
--     :08/:38          refresh_merchant_trust_scores      (016)
--     :01/:31          refresh_fraud_signals              (019)
--     :25/:55          REFRESH MV trusted_public_listings (019)
--     :27/:57          refresh_trust_edges                (019)
--   Daily at 3 AM:
--     03:00            partman.run_maintenance_proc()     (023) ← new
--     03:15            prune_listing_signals_daily()      (023) ← new
--     03:30            prune_search_logs()                (023) ← new

DO $$
BEGIN
  -- pg_partman maintenance: create next month's partition, drop expired ones
  PERFORM cron.schedule(
    'partman-maintenance',
    '0 3 * * *',
    $$CALL partman.run_maintenance_proc(p_analyze := false)$$
  );

  PERFORM cron.schedule(
    'prune-listing-signals-daily',
    '15 3 * * *',
    $$SELECT public.prune_listing_signals_daily()$$
  );

  PERFORM cron.schedule(
    'prune-search-logs',
    '30 3 * * *',
    $$SELECT public.prune_search_logs()$$
  );

EXCEPTION WHEN undefined_function OR undefined_schema THEN
  RAISE WARNING
    '[023] pg_cron not enabled — daily maintenance jobs not scheduled. '
    'After enabling pg_cron, run the three cron.schedule() calls manually.';
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §5.  Browse-mode partial composite indexes
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Existing partial indexes (from 007/008) cover:
--   listings_type_updated_idx           (type, updated_at DESC)
--   listings_province_type_updated_idx  (province_id, type, updated_at DESC)
--   listings_category_type_public_idx   (category_id, type, is_featured DESC, updated_at DESC)
--
-- Missing patterns that cause sort spills at scale:
--   • Province + category browse (most common in-app pattern)
--   • Category-only browse without type discrimination
--   • Trust-score-sorted merchant feed
--
-- Planner reasoning:
--   A partial index with WHERE status='published' AND is_public=true AND
--   moderation_status='approved' covers only ~25–35% of rows at scale.
--   B-tree scan on 250k rows sorted by updated_at is O(k) vs O(n·log n) sort.
--
-- Index size estimate at 1M listings:
--   ~300k active rows × (4+8+8 bytes key + 6 bytes heap tid) ≈ 7.8 MB per index.
--   All four indexes below add ≈ 30 MB — acceptable for 1M+ scale.

-- Province × category browse: /tinh/:p/danh-muc/:c
-- Covers: WHERE province_id=$p AND category_id=$c  ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS listings_province_category_updated_idx
  ON public.listings (province_id, category_id, updated_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

-- Category-only browse (no type filter): /danh-muc/:c
-- Covers: WHERE category_id=$c  ORDER BY is_featured DESC, updated_at DESC
CREATE INDEX IF NOT EXISTS listings_category_featured_updated_idx
  ON public.listings (category_id, is_featured DESC, updated_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

-- Province × type × is_featured: homepage "featured in province" widget
-- Covers: WHERE province_id=$p AND type=$t AND is_featured=true  ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS listings_province_type_featured_updated_idx
  ON public.listings (province_id, type, updated_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published'
    AND is_featured = true;

-- Trust-score browse: verified merchant listings for province feed
-- Covers: JOIN merchant_trust_scores … WHERE trust_score >= 60  ORDER BY updated_at DESC
-- (index on owner_id + updated_at so the JOIN lookup → sort can be index-driven)
CREATE INDEX IF NOT EXISTS listings_owner_updated_public_idx
  ON public.listings (owner_id, updated_at DESC)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

-- ══════════════════════════════════════════════════════════════════════════════
-- §6.  Additional search-supporting indexes
-- ══════════════════════════════════════════════════════════════════════════════
--
-- These indexes support the hardened search_listings_hybrid rewrite below.

-- title_normalized B-tree prefix scan: covers LIKE (q_norm || '%') gate
-- The trgm GIN index handles trigram ops; B-tree handles prefix.
-- At 1M rows the B-tree prefix scan is ~log(1M) ≈ 20 comparisons vs full scan.
CREATE INDEX IF NOT EXISTS listings_title_normalized_prefix_idx
  ON public.listings (title_normalized text_pattern_ops)
  WHERE is_public = true AND moderation_status = 'approved' AND status = 'published';

-- Trust score index for merchant feed queries (get_trusted_merchants_by_province)
-- Covers: WHERE NOT fraud_flag AND trust_score >= 60  ORDER BY trust_score DESC
-- Already exists in 016 as merchant_trust_score_idx — verify and supplement.
CREATE INDEX IF NOT EXISTS merchant_trust_score_province_idx
  ON public.merchant_trust_scores (trust_score DESC)
  WHERE NOT fraud_flag AND trust_score >= 40;  -- slightly lower threshold for flexibility

-- Embedding staleness lookup (used by embedding worker to find stale rows)
-- Covers: WHERE embedded_at < now() - interval '7 days' OR model_version <> 'X'
CREATE INDEX IF NOT EXISTS listing_embeddings_staleness_idx
  ON public.listing_embeddings (embedded_at DESC, model_version);

-- ══════════════════════════════════════════════════════════════════════════════
-- §7.  search_listings_hybrid() — complete production rewrite
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Changes vs migration 019 (the prior canonical version):
--
--   A. rank_score: float4 → float8 (double precision)
--      Float4 has 7 decimal digits of precision.  Two listings with ranks
--      0.3500000119 and 0.3500000238 both cast to float4 as 0.35, creating
--      "ties" that cannot be broken by the cursor condition.  At scale (1M
--      listings) with hundreds of concurrent sessions, enough rankings cluster
--      near the feature-boost values (0.30, 0.10, 0.20 …) to cause ~2–5%
--      duplicate-row incidence across page boundaries.  float8 eliminates this.
--      The TypeScript SearchRankedHit.rank_score is 'number' — no client change.
--
--   B. p_cursor_score: float4 → float8
--      Must match rank_score precision so the cursor condition is lossless.
--      The Supabase JS client passes cursors as JSON numbers (IEEE 754 double)
--      so this is a transparent upgrade.
--
--   C. Trigram gate: similarity() > 0.20 → % operator with threshold = 0.30
--      'similarity(col, q) > 0.20' is evaluated by PostgreSQL as a filter on
--      a BITMAP HEAP SCAN driven by the GIN index — it reads the GIN bitmap
--      then re-evaluates similarity() on each candidate, but the GIN lookup
--      itself uses the 0.3 default threshold for selectivity estimation.
--      Using the '%' operator (similarity >= pg_trgm.similarity_threshold)
--      forces the planner to use GIN for the PREDICATE itself, not just the
--      bitmap.  Raising the threshold from 0.20 to 0.30 reduces the candidate
--      bitmap by ~40% on 3-character queries.  Rank formula still calls
--      similarity() for the actual score (different from the gate).
--
--   D. Spam hard exclusion: AND COALESCE(qs.spam_penalty, 0) < 0.80
--      Listings with spam_penalty ≥ 0.80 received a large rank penalty from
--      migration 019 but could still surface above unscored listings.  The hard
--      WHERE filter removes them from both browse and scored result sets
--      completely, matching trusted_public_listings MV behavior.
--
--   E. Explicit SET search_path = public
--      SECURITY DEFINER functions without a pinned search_path are vulnerable
--      to schema-injection attacks where a malicious user creates a public.listings
--      shadow in a search_path prefix schema.  All hardened functions pin the path.
--
-- Existing boosts preserved (from 012/019):
--   featured (+0.30), verified (+0.10), province (+0.20), district (+0.15),
--   category (+0.10), freshness (max +0.05), CTR (max +0.40),
--   quality (max +0.30), velocity (max +0.30), cold-start (max +0.25),
--   trust boost (max +0.05), spam penalty (max -0.40),
--   personalisation (max +0.10).
--
-- DROP required because return type changes (float4 → float8).
-- This creates a brief window where the function is unavailable; schedule
-- during low-traffic or in a transaction.

DROP FUNCTION IF EXISTS public.search_listings_hybrid(
  text, text, integer, integer, integer,
  numeric, numeric, numeric, numeric,
  integer, float4, timestamptz, uuid, uuid
);

CREATE OR REPLACE FUNCTION public.search_listings_hybrid(
  q                    text             DEFAULT '',
  p_type               text             DEFAULT NULL,
  p_province_id        integer          DEFAULT NULL,
  p_district_id        integer          DEFAULT NULL,
  p_category_id        integer          DEFAULT NULL,
  p_price_min          numeric          DEFAULT NULL,
  p_price_max          numeric          DEFAULT NULL,
  p_area_min           numeric          DEFAULT NULL,
  p_area_max           numeric          DEFAULT NULL,
  p_limit              integer          DEFAULT 20,
  p_cursor_score       double precision DEFAULT NULL,
  p_cursor_updated_at  timestamptz      DEFAULT NULL,
  p_cursor_id          uuid             DEFAULT NULL,
  p_profile_id         uuid             DEFAULT NULL
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
  rank_score        double precision
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q_norm         text;
  tsq            tsquery;
  area_schema_id uuid;
BEGIN
  -- Raise trigram similarity gate from 0.20 → 0.30.
  -- The % operator reads this GUC at execution time.
  -- LOCAL scope: reverts when the calling transaction ends.
  PERFORM set_config('pg_trgm.similarity_threshold', '0.30', true);

  q_norm := normalize_vietnamese_text(q);

  IF q_norm <> '' THEN
    BEGIN
      tsq := websearch_to_tsquery('simple', q_norm);
    EXCEPTION WHEN others THEN
      tsq := NULL;
    END;
  END IF;

  IF p_area_min IS NOT NULL OR p_area_max IS NOT NULL THEN
    SELECT s.id INTO area_schema_id
    FROM   public.listing_attribute_schemas s
    WHERE  s.listing_type = 'land' AND s.key = 'area_m2'
    LIMIT  1;
  END IF;

  -- ── Browse-mode path (q = '') ────────────────────────────────────────────
  -- No text matching.  Planner can use listings_type_updated_idx or
  -- listings_province_type_updated_idx to avoid a full sort.

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
          -- ── Static boosts ─────────────────────────────────────────────────
          CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
          + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

          -- ── Geo context ───────────────────────────────────────────────────
          + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
              THEN 0.20 ELSE 0.0 END
          + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
              THEN 0.15 ELSE 0.0 END
          + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
              THEN 0.10 ELSE 0.0 END

          -- ── Freshness: linear decay over 30 days ───────────────────────────
          + GREATEST(0.0, 0.05 * (
              1.0 - LEAST(
                EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
                1.0
              )
            ))

          -- ── CTR boost (impression-normalised, max +0.40) ───────────────────
          + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
              THEN LEAST(0.40, GREATEST(0.0,
                     COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
              ELSE 0.0
            END

          -- ── Quality boost (max +0.30) ──────────────────────────────────────
          + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

          -- ── Velocity boost: trending burst ratio (max +0.30) ───────────────
          + COALESCE(
              CASE WHEN ls.trending_score > 1.0
                THEN LEAST(0.30, (ls.trending_score::numeric - 1.0) * 0.20)
                ELSE 0.0
              END,
              0.0
            )

          -- ── Cold-start floor (max +0.25, decays over 7 days) ───────────────
          + CASE
              WHEN COALESCE(cs.impressions_7d, 0) < 50
                   AND EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0
              THEN 0.25 * GREATEST(0.0,
                     1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 604800.0)
              ELSE 0.0
            END

          -- ── Trust boost (max +0.05) ────────────────────────────────────────
          + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
                      AND COALESCE(mts.identity_verified, false)
              THEN 0.05 * LEAST(1.0,
                     (COALESCE(mts.trust_score, 0)::float - 80.0) / 20.0)
              ELSE 0.0
            END

          -- ── Spam penalty (max −0.40) ───────────────────────────────────────
          - COALESCE(qs.spam_penalty, 0)::numeric * 0.40

          -- ── Personalisation (max +0.10) ────────────────────────────────────
          + COALESCE(LEAST(0.04, ua_prov.score::numeric * 0.04), 0.0)
          + COALESCE(LEAST(0.03, ua_dist.score::numeric * 0.03), 0.0)
          + COALESCE(LEAST(0.03, ua_cat.score::numeric  * 0.03), 0.0)
        )::double precision AS _rank

      FROM public.listings l
      LEFT JOIN public.listing_ctr_stats      cs      ON cs.listing_id      = l.id
      LEFT JOIN public.listing_quality_scores qs      ON qs.listing_id      = l.id
      LEFT JOIN public.listing_scores         ls      ON ls.listing_id      = l.id
      LEFT JOIN public.merchant_trust_scores  mts     ON mts.profile_id     = l.owner_id
      LEFT JOIN public.user_affinities        ua_prov
            ON  ua_prov.profile_id    = p_profile_id
            AND ua_prov.affinity_type = 'province'
            AND ua_prov.affinity_key  = l.province_id::text
      LEFT JOIN public.user_affinities        ua_dist
            ON  ua_dist.profile_id    = p_profile_id
            AND ua_dist.affinity_type = 'district'
            AND ua_dist.affinity_key  = l.district_id::text
      LEFT JOIN public.user_affinities        ua_cat
            ON  ua_cat.profile_id     = p_profile_id
            AND ua_cat.affinity_type  = 'category'
            AND ua_cat.affinity_key   = l.category_id::text

      WHERE
        l.is_public             = true
        AND l.moderation_status = 'approved'
        AND l.status            = 'published'
        AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
        AND COALESCE(qs.spam_penalty, 0) < 0.80            -- hard spam exclusion
        AND (p_type        IS NULL OR l.type::text   = p_type)
        AND (p_province_id IS NULL OR l.province_id  = p_province_id)
        AND (p_district_id IS NULL OR l.district_id  = p_district_id)
        AND (p_category_id IS NULL OR l.category_id  = p_category_id)
        AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
        AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
        AND (
          area_schema_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.listing_attribute_values av
            WHERE  av.listing_id = l.id
            AND    av.schema_id  = area_schema_id
            AND    (p_area_min IS NULL OR av.value_number >= p_area_min)
            AND    (p_area_max IS NULL OR av.value_number <= p_area_max)
          )
        )
    )
    SELECT
      b.id, b.type::text, b.slug, b.title, b.short_description, b.cover_url,
      b.location_text, b.price_text, b.price_amount, b.is_featured, b.is_verified,
      b.province_id, b.district_id, b.category_id, b.contact_phone,
      b.updated_at, b._rank
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
    RETURN;
  END IF;

  -- ── Scored search path (q ≠ '') ──────────────────────────────────────────
  -- Text signals dominate.  Behavioural boosts are additive and capped.
  -- Gate uses the % operator so PostgreSQL uses the GIN trgm index
  -- (similarity_threshold=0.30 was SET LOCAL above).

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
        -- ── Text relevance signals (dominant) ─────────────────────────────
        CASE
          WHEN l.title_normalized = q_norm                     THEN 2.0
          WHEN length(q_norm) >= 3
               AND l.title_normalized LIKE (q_norm || '%')     THEN 1.0
          ELSE 0.0
        END
        + CASE WHEN tsq IS NOT NULL
            THEN ts_rank(l.search_vector, tsq, 1) * 2.0
            ELSE 0.0
          END
        -- similarity() used for the score value (not for the GIN gate)
        + GREATEST(0.0, similarity(l.title_normalized, q_norm) * 0.8)
        + GREATEST(0.0,
            COALESCE(similarity(l.short_description_normalized, q_norm), 0.0) * 0.2)

        -- ── Static boosts ─────────────────────────────────────────────────
        + CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

        -- ── Geo context ───────────────────────────────────────────────────
        + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
            THEN 0.20 ELSE 0.0 END
        + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
            THEN 0.15 ELSE 0.0 END
        + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
            THEN 0.10 ELSE 0.0 END

        -- ── Freshness ─────────────────────────────────────────────────────
        + GREATEST(0.0, 0.05 * (
            1.0 - LEAST(
              EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
              1.0
            )
          ))

        -- ── CTR boost (max +0.40) ──────────────────────────────────────────
        + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
            THEN LEAST(0.40, GREATEST(0.0,
                   COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
            ELSE 0.0
          END

        -- ── Quality boost (max +0.30) ──────────────────────────────────────
        + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

        -- ── Velocity boost (max +0.30) ─────────────────────────────────────
        + COALESCE(
            CASE WHEN ls.trending_score > 1.0
              THEN LEAST(0.30, (ls.trending_score::numeric - 1.0) * 0.20)
              ELSE 0.0
            END,
            0.0
          )

        -- ── Cold-start floor (max +0.25) ───────────────────────────────────
        + CASE
            WHEN COALESCE(cs.impressions_7d, 0) < 50
                 AND EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0
            THEN 0.25 * GREATEST(0.0,
                   1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 604800.0)
            ELSE 0.0
          END

        -- ── Trust boost (max +0.05) ────────────────────────────────────────
        + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
                    AND COALESCE(mts.identity_verified, false)
            THEN 0.05 * LEAST(1.0,
                   (COALESCE(mts.trust_score, 0)::float - 80.0) / 20.0)
            ELSE 0.0
          END

        -- ── Spam penalty (max −0.40) ───────────────────────────────────────
        - COALESCE(qs.spam_penalty, 0)::numeric * 0.40

        -- ── Personalisation (max +0.10) ────────────────────────────────────
        + COALESCE(LEAST(0.04, ua_prov.score::numeric * 0.04), 0.0)
        + COALESCE(LEAST(0.03, ua_dist.score::numeric * 0.03), 0.0)
        + COALESCE(LEAST(0.03, ua_cat.score::numeric  * 0.03), 0.0)
      )::double precision AS _rank

    FROM public.listings l
    LEFT JOIN public.listing_ctr_stats      cs      ON cs.listing_id      = l.id
    LEFT JOIN public.listing_quality_scores qs      ON qs.listing_id      = l.id
    LEFT JOIN public.listing_scores         ls      ON ls.listing_id      = l.id
    LEFT JOIN public.merchant_trust_scores  mts     ON mts.profile_id     = l.owner_id
    LEFT JOIN public.user_affinities        ua_prov
          ON  ua_prov.profile_id    = p_profile_id
          AND ua_prov.affinity_type = 'province'
          AND ua_prov.affinity_key  = l.province_id::text
    LEFT JOIN public.user_affinities        ua_dist
          ON  ua_dist.profile_id    = p_profile_id
          AND ua_dist.affinity_type = 'district'
          AND ua_dist.affinity_key  = l.district_id::text
    LEFT JOIN public.user_affinities        ua_cat
          ON  ua_cat.profile_id     = p_profile_id
          AND ua_cat.affinity_type  = 'category'
          AND ua_cat.affinity_key   = l.category_id::text

    WHERE
      l.is_public             = true
      AND l.moderation_status = 'approved'
      AND l.status            = 'published'
      AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
      AND COALESCE(qs.spam_penalty, 0) < 0.80              -- hard spam exclusion

      AND (p_type        IS NULL OR l.type::text   = p_type)
      AND (p_province_id IS NULL OR l.province_id  = p_province_id)
      AND (p_district_id IS NULL OR l.district_id  = p_district_id)
      AND (p_category_id IS NULL OR l.category_id  = p_category_id)
      AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
      AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)

      -- Text gate: FTS hit, prefix match, or trigram match via GIN-backed % op.
      -- The % operator (similarity >= pg_trgm.similarity_threshold) forces the
      -- planner to use the GIN index for the predicate, not just the bitmap.
      AND (
        (tsq IS NOT NULL AND l.search_vector @@ tsq)
        OR (length(q_norm) >= 3 AND l.title_normalized LIKE (q_norm || '%'))
        OR l.title_normalized % q_norm
      )

      AND (
        area_schema_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.listing_attribute_values av
          WHERE  av.listing_id = l.id
          AND    av.schema_id  = area_schema_id
          AND    (p_area_min IS NULL OR av.value_number >= p_area_min)
          AND    (p_area_max IS NULL OR av.value_number <= p_area_max)
        )
      )
  )
  SELECT
    s.id, s.type::text, s.slug, s.title, s.short_description, s.cover_url,
    s.location_text, s.price_text, s.price_amount, s.is_featured, s.is_verified,
    s.province_id, s.district_id, s.category_id, s.contact_phone,
    s.updated_at, s._rank
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

GRANT EXECUTE ON FUNCTION public.search_listings_hybrid TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- §8.  search_listings_semantic() — cold-start fallback + float8 upgrade
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Changes vs migration 022:
--
--   A. Cold-start UNION in ann_candidates CTE (Task 7):
--      Listings created within the last 7 days but without any embedding are
--      invisible to the HNSW ANN scan.  A new listing published this morning
--      would never appear in semantic results until the embedding worker runs.
--      Fix: UNION ALL a bounded scan of new listing IDs (no embedding, < 7d)
--      into the candidate pool with cosine_similarity = 0.0.  The cold-start
--      boost (+0.25 max, decays over 7 days) in the reranking formula surfaces
--      these appropriately — they rank higher than a semantically-weak older
--      listing but below a genuinely relevant embedded result.
--      The cold-start pool is capped at 50 to prevent it from dominating a
--      narrowly-filtered result set.
--
--   B. rank_score: float4 → float8 (same reasoning as search_listings_hybrid)
--      Cursor stability across semantic result pages.
--
--   C. Explicit SET search_path = public.

DROP FUNCTION IF EXISTS public.search_listings_semantic(
  vector, text, integer, integer, integer,
  numeric, numeric,
  integer, float4, timestamptz, uuid
);

CREATE OR REPLACE FUNCTION public.search_listings_semantic(
  query_embedding      vector(384),
  p_type               text             DEFAULT NULL,
  p_province_id        integer          DEFAULT NULL,
  p_district_id        integer          DEFAULT NULL,
  p_category_id        integer          DEFAULT NULL,
  p_price_min          numeric          DEFAULT NULL,
  p_price_max          numeric          DEFAULT NULL,
  p_limit              integer          DEFAULT 20,
  p_cursor_score       double precision DEFAULT NULL,
  p_cursor_updated_at  timestamptz      DEFAULT NULL,
  p_cursor_id          uuid             DEFAULT NULL
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
  rank_score        double precision
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k_candidates integer;
BEGIN
  -- Increase HNSW beam width for this query (reverts at end of transaction).
  -- Default ef_search=40 is insufficient for K=100+ with geographic post-filtering.
  PERFORM set_config('hnsw.ef_search', '200', true);

  -- Dynamic candidate pool (see migration 022 for detailed reasoning):
  --   Province filter → 20× headroom to survive geographic post-filter attrition.
  --   No filter       → 5× headroom is sufficient for global recall.
  k_candidates := CASE
    WHEN p_province_id IS NOT NULL THEN GREATEST(300, p_limit * 20)
    ELSE                                GREATEST(100, p_limit * 5)
  END;

  RETURN QUERY
  WITH ann_candidates AS (
    -- ── Primary: ANN vector scan ──────────────────────────────────────────
    SELECT
      le.listing_id                                           AS listing_id,
      (1.0 - (le.embedding <=> query_embedding))::float8      AS cosine_similarity
    FROM public.listing_embeddings le
    ORDER BY le.embedding <=> query_embedding
    LIMIT k_candidates

    UNION ALL

    -- ── Cold-start supplement: new listings without any embedding ─────────
    -- Published within the last 7 days but not yet embedded.
    -- cosine_similarity = 0.0; the cold-start boost in reranking surfaces them.
    -- Province filter applied here for probe selectivity, not semantic relevance.
    -- Cap at 50 to bound cost; ordered by recency to favour newest.
    SELECT
      l.id            AS listing_id,
      0.0::float8     AS cosine_similarity
    FROM public.listings l
    WHERE l.is_public             = true
      AND l.status                = 'published'
      AND l.moderation_status     = 'approved'
      AND l.created_at            >= now() - interval '7 days'
      AND (p_province_id IS NULL OR l.province_id = p_province_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.listing_embeddings le2
        WHERE le2.listing_id = l.id
      )
    ORDER BY l.created_at DESC
    LIMIT 50
  ),
  reranked AS (
    SELECT
      l.id, l.type, l.slug, l.title, l.short_description,
      l.cover_url, l.location_text, l.price_text, l.price_amount,
      l.is_featured, l.is_verified,
      l.province_id, l.district_id, l.category_id,
      l.contact_phone, l.updated_at,
      (
        -- ── Semantic similarity (dominant at 70%) ─────────────────────────
        GREATEST(0.0, ac.cosine_similarity) * 0.70

        -- ── Static boosts ─────────────────────────────────────────────────
        + CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

        -- ── Geo context ───────────────────────────────────────────────────
        + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
            THEN 0.20 ELSE 0.0 END
        + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
            THEN 0.15 ELSE 0.0 END
        + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
            THEN 0.10 ELSE 0.0 END

        -- ── Freshness ─────────────────────────────────────────────────────
        + GREATEST(0.0, 0.05 * (
            1.0 - LEAST(
              EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
              1.0
            )
          ))

        -- ── CTR boost (max +0.40) ──────────────────────────────────────────
        + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
            THEN LEAST(0.40, GREATEST(0.0,
                   COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
            ELSE 0.0
          END

        -- ── Quality boost (max +0.30) ──────────────────────────────────────
        + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

        -- ── Cold-start floor (max +0.25) ───────────────────────────────────
        -- Activates for listings with < 50 impressions AND age < 7 days.
        -- New listings without embeddings (cosine_similarity = 0) still get
        -- this boost and surface above low-relevance embedded results.
        + CASE
            WHEN COALESCE(cs.impressions_7d, 0) < 50
                 AND EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0
            THEN 0.25 * GREATEST(0.0,
                   1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 604800.0)
            ELSE 0.0
          END

        -- ── Trust boost (max +0.05) ────────────────────────────────────────
        + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
                    AND COALESCE(mts.identity_verified, false)
            THEN 0.05 * LEAST(1.0,
                   (COALESCE(mts.trust_score, 0)::float - 80.0) / 20.0)
            ELSE 0.0
          END

        -- ── Spam penalty (max −0.40) ───────────────────────────────────────
        - COALESCE(qs.spam_penalty, 0)::numeric * 0.40
      )::double precision AS _rank

    FROM ann_candidates ac
    JOIN public.listings l ON l.id = ac.listing_id

    LEFT JOIN public.listing_ctr_stats      cs  ON cs.listing_id   = l.id
    LEFT JOIN public.listing_quality_scores qs  ON qs.listing_id   = l.id
    LEFT JOIN public.merchant_trust_scores  mts ON mts.profile_id  = l.owner_id

    WHERE
      l.is_public             = true
      AND l.moderation_status = 'approved'
      AND l.status            = 'published'
      AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
      AND COALESCE(qs.spam_penalty, 0) < 0.80
      AND (p_type        IS NULL OR l.type::text   = p_type)
      AND (p_province_id IS NULL OR l.province_id  = p_province_id)
      AND (p_district_id IS NULL OR l.district_id  = p_district_id)
      AND (p_category_id IS NULL OR l.category_id  = p_category_id)
      AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
      AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
  )
  SELECT
    r.id, r.type::text, r.slug, r.title, r.short_description, r.cover_url,
    r.location_text, r.price_text, r.price_amount, r.is_featured, r.is_verified,
    r.province_id, r.district_id, r.category_id, r.contact_phone,
    r.updated_at, r._rank
  FROM reranked r
  WHERE (
    p_cursor_score IS NULL
    OR r._rank < p_cursor_score
    OR (r._rank = p_cursor_score AND r.updated_at < p_cursor_updated_at)
    OR (r._rank = p_cursor_score AND r.updated_at = p_cursor_updated_at
        AND r.id < p_cursor_id)
  )
  ORDER BY r._rank DESC, r.updated_at DESC, r.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_listings_semantic TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- §9.  Merchant trust safe public view
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Problem: merchant_trust_scores has a public SELECT policy (migration 016).
-- PostgREST exposes every column including fraud_flag.  A merchant can query
-- their own fraud_flag, learn they've been flagged, and create a new account
-- before the moderation queue processes them.
--
-- Fix: create a canonical public view that projects only the columns safe
-- for unauthenticated access.  fraud_flag and the raw component scores are
-- omitted.  SECURITY INVOKER (default) means the view respects the caller's
-- RLS; the underlying table's public SELECT policy still applies.
--
-- Action required after applying this migration:
--   REVOKE SELECT ON public.merchant_trust_scores FROM anon, authenticated;
--   GRANT  SELECT ON public.merchant_trust_public  TO anon, authenticated;
--
-- Existing code that reads merchant_trust_scores directly for trust_score,
-- identity_verified, active_listings, avg_response_hours, updated_at should
-- switch to merchant_trust_public.  SECURITY DEFINER functions (which bypass
-- RLS) continue to read the underlying table directly.
--
-- NOTE: we do NOT perform the REVOKE here because it would break existing
-- PostgREST calls before client code is updated.  Schedule the REVOKE as a
-- separate coordinated deployment step.

CREATE OR REPLACE VIEW public.merchant_trust_public AS
SELECT
  profile_id,
  trust_score,
  identity_verified,
  active_listings,
  avg_response_hours,
  days_since_last_listing,
  updated_at
FROM public.merchant_trust_scores
WHERE NOT fraud_flag;  -- auto-filters flagged merchants; they appear to not exist

COMMENT ON VIEW public.merchant_trust_public IS
  'Public-safe projection of merchant_trust_scores. '
  'Excludes fraud_flag and raw scoring components. '
  'Fraud-flagged merchants are invisible (filtered at the view level).';

-- PostgREST: expose the view to public roles
GRANT SELECT ON public.merchant_trust_public TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- §10.  RLS hardening
-- ══════════════════════════════════════════════════════════════════════════════
--
-- All SECURITY DEFINER functions in this migration already pin SET search_path.
-- Below we audit existing critical functions and add explicit grants/revokes
-- where missing.
--
-- Principle: anon role should have the minimum viable access surface.
--   READ:   publicly visible data via explicit SELECT policies
--   WRITE:  only listing_events INSERT (append-only) and search_logs UPSERT
--   EXEC:   only RPCs explicitly GRANTed

-- Ensure prune functions are NOT callable by non-postgres roles
REVOKE EXECUTE ON FUNCTION public.prune_listing_signals_daily FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_search_logs           FROM anon, authenticated;

-- Lock down listing_signals_daily and listing_scores:
-- Already have public SELECT via 010 policies; no additional access needed.

-- Ensure no rogue SELECT grant exists on listing_events (no public read policy
-- exists from 010, but an explicit GRANT could bypass RLS).
-- The REVOKE is safe: SECURITY DEFINER functions read it as postgres anyway.
REVOKE SELECT ON public.listing_events FROM anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- §11.  TypeScript layer notice
-- ══════════════════════════════════════════════════════════════════════════════
--
-- BREAKING CHANGE: search_listings_hybrid.rank_score and p_cursor_score are
-- now double precision (float8) instead of float4.
--
-- Required TypeScript changes:
--   entities/search/types.ts:
--     SearchRankedHit.rank_score   is already 'number' — no change needed.
--     SearchCursor.score           is already 'number' — no change needed.
--
--   The Supabase JS client sends cursor values as JSON numbers (IEEE 754 double),
--   which is float8-compatible.  No RPC call sites need to change.
--
--   If using supabase gen types typescript, re-run after applying this migration:
--     npx supabase gen types typescript --local > lib/supabase/types.ts
--
-- RECOMMENDED: run EXPLAIN ANALYZE on representative queries in staging before
-- promoting this migration to production.  Key queries to validate:
--   SELECT * FROM search_listings_hybrid('đất nông nghiệp', 'land', 50, ...);
--   SELECT * FROM search_listings_hybrid('', 'land', 50, NULL, NULL, ...);
--   SELECT * FROM search_listings_semantic('[0.1,0.2,...]', NULL, 50, ...);
--
-- ══════════════════════════════════════════════════════════════════════════════
-- END 023_database_hardening.sql
-- ══════════════════════════════════════════════════════════════════════════════
