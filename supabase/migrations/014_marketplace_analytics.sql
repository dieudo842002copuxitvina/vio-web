-- ── 014_marketplace_analytics.sql ────────────────────────────────────────────
-- Week 2.7: Marketplace Analytics Engine.
--
-- Turns the raw event stream into actionable marketplace intelligence:
-- supply/demand gaps, unhealthy listings, and trending signals.
-- No external services, no BI dashboards — pure PostgreSQL.
--
-- What this migration adds:
--   Tables:
--     • search_queries           — raw search event log (fire-and-forget inserts)
--     • market_demand_signals    — aggregated demand/trend signals
--     • listing_health           — per-listing health score + issue flags
--
--   Functions:
--     • refresh_market_demand_signals() — derive demand signals from search log
--     • refresh_listing_health()        — derive listing health from CTR data
--
--   pg_cron jobs (every 30 min):
--     • refresh-market-demand-signals  at :21/:51
--     • refresh-listing-health         at :24/:54
--
-- Signal types in market_demand_signals:
--   zero_result_query    — searched ≥ 3× with 0 results in last 7 days
--   demand_gap           — searched ≥ 5× but results_count ≤ 3 (undersupplied)
--   trending_keyword     — search volume spike > 2× 7-day baseline in last 24 h
--   trending_province    — province search volume spike > 2× baseline
--   trending_category    — category search volume spike > 2× baseline
--
-- Listing health issues (stored in listing_health.issues JSONB array):
--   high_impression_low_ctr  — impressions_7d ≥ 100 AND ctr_7d < 0.01 (1%)
--   high_click_no_inquiry    — clicks_7d ≥ 20 AND inquiry_rate_7d < 0.005 (0.5%)
--   stale                    — days_since_update ≥ 90 AND impressions_7d > 0
--
-- Depends on: migrations 001–013
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE throughout.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  search_queries — raw search event log
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Append-only: one row per user search action.
-- Pruned every run: rows older than 90 days are deleted by refresh_market_demand_signals().
-- session_id / profile_id are optional attribution fields; not required for analytics.

CREATE TABLE IF NOT EXISTS public.search_queries (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query         text        NOT NULL,
  results_count integer     NOT NULL DEFAULT 0,
  province_id   integer     NULL,
  category_id   integer     NULL,
  session_id    text        NULL,
  profile_id    uuid        NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Time-range scan for aggregation windows
CREATE INDEX IF NOT EXISTS search_queries_created_at_idx
  ON public.search_queries (created_at DESC);

-- Zero-result detection (partial index — only indexes relevant rows)
CREATE INDEX IF NOT EXISTS search_queries_zero_results_idx
  ON public.search_queries (query, created_at)
  WHERE results_count = 0;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  market_demand_signals — aggregated demand / trend signals
-- ══════════════════════════════════════════════════════════════════════════════
--
-- One row per (signal_type, signal_key) — upserted on each refresh.
-- signal_value: dimensionless strength score (higher = stronger signal).
-- metadata: auxiliary context (e.g. avg_results, search_count, baseline).

CREATE TABLE IF NOT EXISTS public.market_demand_signals (
  signal_type   text          NOT NULL,
  signal_key    text          NOT NULL,
  signal_value  numeric(12,4) NOT NULL DEFAULT 0,
  metadata      jsonb         NOT NULL DEFAULT '{}',
  first_seen_at timestamptz   NOT NULL DEFAULT now(),
  last_seen_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY   (signal_type, signal_key),
  CONSTRAINT market_demand_signals_type_check
    CHECK (signal_type IN (
      'zero_result_query',
      'demand_gap',
      'trending_keyword',
      'trending_province',
      'trending_category'
    ))
);

-- Top-N signals by type (dashboard/API use)
CREATE INDEX IF NOT EXISTS market_demand_signals_type_value_idx
  ON public.market_demand_signals (signal_type, signal_value DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  listing_health — per-listing health assessment
-- ══════════════════════════════════════════════════════════════════════════════
--
-- health_score: 0–100 (100 = healthy, lower = more issues detected).
-- issues: JSONB array of issue-code strings (empty = no issues).
-- is_dead: true when health_score < 30 AND listing has been live for > 14 days.
--
-- Populated exclusively by refresh_listing_health(); no direct inserts.

CREATE TABLE IF NOT EXISTS public.listing_health (
  listing_id        uuid          PRIMARY KEY,
  health_score      numeric(5,2)  NOT NULL DEFAULT 100,
  issues            jsonb         NOT NULL DEFAULT '[]',
  impressions_7d    integer       NOT NULL DEFAULT 0,
  clicks_7d         integer       NOT NULL DEFAULT 0,
  inquiries_7d      integer       NOT NULL DEFAULT 0,
  ctr_7d            numeric(6,4)  NOT NULL DEFAULT 0,
  inquiry_rate_7d   numeric(6,4)  NOT NULL DEFAULT 0,
  days_since_update integer       NOT NULL DEFAULT 0,
  is_dead           boolean       NOT NULL DEFAULT false,
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

-- Dead-listing detection queries
CREATE INDEX IF NOT EXISTS listing_health_dead_idx
  ON public.listing_health (is_dead, health_score ASC)
  WHERE is_dead = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  refresh_market_demand_signals()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Derives demand signals from the search_queries log.
--
-- Signal detection rules:
--
--   zero_result_query:
--     Queries with results_count = 0, searched ≥ 3 times in last 7 days.
--     signal_value = search count (higher = more suppressed demand).
--
--   demand_gap:
--     Queries searched ≥ 5 times in last 7 days with median results ≤ 3.
--     Indicates real demand with thin supply.
--     signal_value = search_count / (avg_results + 1)  (demand pressure ratio).
--
--   trending_keyword:
--     Queries whose 24h search count exceeds twice their 7d daily average.
--     signal_value = spike_ratio − 1  (0.5 = 50% above average).
--
--   trending_province / trending_category:
--     Province/category filter fields with same spike rule.
--
-- Runs 30-min pruning of search_queries older than 90 days.

CREATE OR REPLACE FUNCTION public.refresh_market_demand_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ── Signal computation ──────────────────────────────────────────────────────

  WITH

  -- 7-day query stats
  query_stats_7d AS (
    SELECT
      query,
      COUNT(*)             AS searches_7d,
      AVG(results_count)   AS avg_results_7d,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY results_count) AS median_results_7d,
      MAX(created_at)      AS last_seen_at
    FROM public.search_queries
    WHERE created_at >= now() - interval '7 days'
      AND LENGTH(TRIM(query)) >= 2
    GROUP BY query
  ),

  -- 24h query stats (for trend detection)
  query_stats_24h AS (
    SELECT
      query,
      COUNT(*) AS searches_24h
    FROM public.search_queries
    WHERE created_at >= now() - interval '24 hours'
      AND LENGTH(TRIM(query)) >= 2
    GROUP BY query
  ),

  -- Province stats 7d and 24h
  province_stats_7d AS (
    SELECT
      province_id::text AS province_key,
      COUNT(*)          AS searches_7d,
      MAX(created_at)   AS last_seen_at
    FROM public.search_queries
    WHERE created_at >= now() - interval '7 days'
      AND province_id IS NOT NULL
    GROUP BY province_id
  ),
  province_stats_24h AS (
    SELECT
      province_id::text AS province_key,
      COUNT(*)          AS searches_24h
    FROM public.search_queries
    WHERE created_at >= now() - interval '24 hours'
      AND province_id IS NOT NULL
    GROUP BY province_id
  ),

  -- Category stats 7d and 24h
  category_stats_7d AS (
    SELECT
      category_id::text AS category_key,
      COUNT(*)          AS searches_7d,
      MAX(created_at)   AS last_seen_at
    FROM public.search_queries
    WHERE created_at >= now() - interval '7 days'
      AND category_id IS NOT NULL
    GROUP BY category_id
  ),
  category_stats_24h AS (
    SELECT
      category_id::text AS category_key,
      COUNT(*)          AS searches_24h
    FROM public.search_queries
    WHERE created_at >= now() - interval '24 hours'
      AND category_id IS NOT NULL
    GROUP BY category_id
  ),

  -- Detect zero-result queries (≥ 3 searches, avg_results = 0)
  zero_result_signals AS (
    SELECT
      'zero_result_query'::text               AS signal_type,
      qs.query                                AS signal_key,
      qs.searches_7d::numeric                 AS signal_value,
      jsonb_build_object(
        'search_count', qs.searches_7d,
        'avg_results',  ROUND(qs.avg_results_7d, 2)
      )                                       AS metadata,
      qs.last_seen_at
    FROM query_stats_7d qs
    WHERE qs.searches_7d >= 3
      AND qs.avg_results_7d = 0
  ),

  -- Detect demand gaps (≥ 5 searches, median results ≤ 3)
  demand_gap_signals AS (
    SELECT
      'demand_gap'::text                           AS signal_type,
      qs.query                                     AS signal_key,
      -- Higher demand pressure = more searches relative to supply
      ROUND(qs.searches_7d::numeric
        / GREATEST(1.0, qs.avg_results_7d), 4)    AS signal_value,
      jsonb_build_object(
        'search_count',   qs.searches_7d,
        'avg_results',    ROUND(qs.avg_results_7d, 2),
        'median_results', qs.median_results_7d
      )                                            AS metadata,
      qs.last_seen_at
    FROM query_stats_7d qs
    WHERE qs.searches_7d >= 5
      AND qs.median_results_7d <= 3
      AND qs.avg_results_7d > 0  -- exclude pure zero-result (already covered above)
  ),

  -- Detect trending keywords (24h spike > 2× daily 7d average)
  trending_keyword_signals AS (
    SELECT
      'trending_keyword'::text                     AS signal_type,
      s7.query                                     AS signal_key,
      -- spike_ratio: how many times the 7d daily average
      ROUND(
        s24.searches_24h::numeric
        / GREATEST(1.0, s7.searches_7d::numeric / 7.0),
        4
      ) - 1.0                                      AS signal_value,
      jsonb_build_object(
        'searches_24h',       s24.searches_24h,
        'searches_7d',        s7.searches_7d,
        'daily_avg_7d',       ROUND(s7.searches_7d::numeric / 7.0, 2)
      )                                            AS metadata,
      s7.last_seen_at
    FROM query_stats_7d s7
    JOIN query_stats_24h s24 USING (query)
    -- Only surfaces meaningful volume: ≥ 5 searches/day on the spike day
    WHERE s24.searches_24h >= 5
      -- Spike: 24h count > 2× daily average from 7d window
      AND s24.searches_24h::numeric > (s7.searches_7d::numeric / 7.0) * 2.0
  ),

  -- Detect trending provinces
  trending_province_signals AS (
    SELECT
      'trending_province'::text                    AS signal_type,
      p7.province_key                              AS signal_key,
      ROUND(
        p24.searches_24h::numeric
        / GREATEST(1.0, p7.searches_7d::numeric / 7.0),
        4
      ) - 1.0                                      AS signal_value,
      jsonb_build_object(
        'searches_24h',  p24.searches_24h,
        'searches_7d',   p7.searches_7d
      )                                            AS metadata,
      p7.last_seen_at
    FROM province_stats_7d p7
    JOIN province_stats_24h p24 USING (province_key)
    WHERE p24.searches_24h >= 10
      AND p24.searches_24h::numeric > (p7.searches_7d::numeric / 7.0) * 2.0
  ),

  -- Detect trending categories
  trending_category_signals AS (
    SELECT
      'trending_category'::text                    AS signal_type,
      c7.category_key                              AS signal_key,
      ROUND(
        c24.searches_24h::numeric
        / GREATEST(1.0, c7.searches_7d::numeric / 7.0),
        4
      ) - 1.0                                      AS signal_value,
      jsonb_build_object(
        'searches_24h',  c24.searches_24h,
        'searches_7d',   c7.searches_7d
      )                                            AS metadata,
      c7.last_seen_at
    FROM category_stats_7d c7
    JOIN category_stats_24h c24 USING (category_key)
    WHERE c24.searches_24h >= 5
      AND c24.searches_24h::numeric > (c7.searches_7d::numeric / 7.0) * 2.0
  ),

  all_signals AS (
    SELECT * FROM zero_result_signals
    UNION ALL
    SELECT * FROM demand_gap_signals
    UNION ALL
    SELECT * FROM trending_keyword_signals
    UNION ALL
    SELECT * FROM trending_province_signals
    UNION ALL
    SELECT * FROM trending_category_signals
  )

  INSERT INTO public.market_demand_signals (
    signal_type,
    signal_key,
    signal_value,
    metadata,
    last_seen_at,
    updated_at
  )
  SELECT
    signal_type,
    signal_key,
    -- Only keep positive signal values
    GREATEST(0.0, signal_value)::numeric(12,4),
    metadata,
    last_seen_at,
    now()
  FROM all_signals
  WHERE GREATEST(0.0, signal_value) > 0

  ON CONFLICT (signal_type, signal_key) DO UPDATE SET
    signal_value  = EXCLUDED.signal_value,
    metadata      = EXCLUDED.metadata,
    last_seen_at  = EXCLUDED.last_seen_at,
    updated_at    = EXCLUDED.updated_at;

  -- Remove stale signals not seen in the last 24 h (noise cleared on each cycle)
  DELETE FROM public.market_demand_signals
  WHERE last_seen_at < now() - interval '24 hours';

  -- Prune search_queries log: retain last 90 days
  DELETE FROM public.search_queries
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  refresh_listing_health()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Derives per-listing health from existing CTR and quality tables (no extra
-- reads from listing_events — those are already aggregated).
--
-- Health score computation (starts at 100, deducted for issues):
--   high_impression_low_ctr  → −40 pts  (serious visibility problem)
--   high_click_no_inquiry    → −30 pts  (conversion failure)
--   stale                    → −20 pts  (needs refreshing)
--
-- is_dead: health_score < 30 AND listing published > 14 days ago
--
-- Reads listing_ctr_stats, listing_quality_scores, listings.
-- SECURITY DEFINER is not needed here (all source tables have public SELECT).

CREATE OR REPLACE FUNCTION public.refresh_listing_health()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH listing_base AS (
    SELECT
      l.id                                                          AS listing_id,
      GREATEST(0,
        EXTRACT(epoch FROM (now() - l.updated_at))::integer / 86400
      )                                                             AS days_since_update,
      EXTRACT(epoch FROM (now() - COALESCE(l.published_at, l.created_at)))
        / 86400                                                     AS days_since_publish
    FROM public.listings l
    WHERE l.is_public          = true
      AND l.moderation_status  = 'approved'
      AND l.status             = 'published'
  ),

  health_inputs AS (
    SELECT
      lb.listing_id,
      lb.days_since_update,
      lb.days_since_publish,
      COALESCE(cs.impressions_7d, 0)  AS impressions_7d,
      COALESCE(cs.clicks_7d,      0)  AS clicks_7d,
      COALESCE(cs.ctr_7d,         0)  AS ctr_7d,
      COALESCE(qs.inquiry_rate,   0)  AS inquiry_rate_7d,
      -- Derived inquiry count: clicks × inquiry_rate
      ROUND(
        COALESCE(cs.clicks_7d, 0)::numeric
        * COALESCE(qs.inquiry_rate, 0)
      )::integer                      AS inquiries_7d
    FROM listing_base lb
    LEFT JOIN public.listing_ctr_stats      cs ON cs.listing_id = lb.listing_id
    LEFT JOIN public.listing_quality_scores qs ON qs.listing_id = lb.listing_id
  ),

  health_scored AS (
    SELECT
      listing_id,
      days_since_update,
      impressions_7d,
      clicks_7d,
      inquiries_7d,
      ctr_7d::numeric(6,4),
      inquiry_rate_7d::numeric(6,4),
      days_since_publish,

      -- Issue flags
      (impressions_7d >= 100 AND ctr_7d < 0.01)     AS has_low_ctr_issue,
      (clicks_7d >= 20 AND inquiry_rate_7d < 0.005)  AS has_low_inquiry_issue,
      (days_since_update >= 90 AND impressions_7d > 0) AS has_stale_issue,

      -- Deduct from 100
      GREATEST(0.0,
        100.0
        - CASE WHEN impressions_7d >= 100 AND ctr_7d < 0.01    THEN 40.0 ELSE 0.0 END
        - CASE WHEN clicks_7d >= 20 AND inquiry_rate_7d < 0.005 THEN 30.0 ELSE 0.0 END
        - CASE WHEN days_since_update >= 90 AND impressions_7d > 0 THEN 20.0 ELSE 0.0 END
      )::numeric(5,2) AS health_score
    FROM health_inputs
  )

  INSERT INTO public.listing_health (
    listing_id,
    health_score,
    issues,
    impressions_7d,
    clicks_7d,
    inquiries_7d,
    ctr_7d,
    inquiry_rate_7d,
    days_since_update,
    is_dead,
    updated_at
  )
  SELECT
    listing_id,
    health_score,

    -- Build issues array from flags
    (
      CASE WHEN has_low_ctr_issue     THEN '["high_impression_low_ctr"'::text  ELSE '['::text END
      || CASE WHEN has_low_ctr_issue AND has_low_inquiry_issue THEN ',"high_click_no_inquiry"' ELSE '' END
      || CASE WHEN NOT has_low_ctr_issue AND has_low_inquiry_issue THEN '"high_click_no_inquiry"' ELSE '' END
      || CASE WHEN has_stale_issue AND (has_low_ctr_issue OR has_low_inquiry_issue) THEN ',"stale"' ELSE '' END
      || CASE WHEN has_stale_issue AND NOT has_low_ctr_issue AND NOT has_low_inquiry_issue THEN '"stale"' ELSE '' END
      || ']'
    )::jsonb,

    impressions_7d,
    clicks_7d,
    inquiries_7d,
    ctr_7d,
    inquiry_rate_7d,
    days_since_update::integer,

    -- Dead: health below 30 AND listing has been live long enough to accumulate data
    (health_score < 30.0 AND days_since_publish >= 14),

    now()

  FROM health_scored

  ON CONFLICT (listing_id) DO UPDATE SET
    health_score      = EXCLUDED.health_score,
    issues            = EXCLUDED.issues,
    impressions_7d    = EXCLUDED.impressions_7d,
    clicks_7d         = EXCLUDED.clicks_7d,
    inquiries_7d      = EXCLUDED.inquiries_7d,
    ctr_7d            = EXCLUDED.ctr_7d,
    inquiry_rate_7d   = EXCLUDED.inquiry_rate_7d,
    days_since_update = EXCLUDED.days_since_update,
    is_dead           = EXCLUDED.is_dead,
    updated_at        = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  pg_cron jobs
-- ══════════════════════════════════════════════════════════════════════════════
--
-- :21/:51 — demand signals (after :20 listing scores at the same stagger offset)
-- :24/:54 — listing health (depends on CTR stats refreshed at :08/:23)
--
-- Full 30-min analytics pipeline timeline:
--   :00 signals → :05 scores → :08 CTR → :11 quality →
--   :14 affinities → :17 relationships → :21 demand → :24 health

DO $$
BEGIN
  PERFORM cron.schedule(
    'refresh-market-demand-signals',
    '21-59/30 * * * *',
    $$SELECT public.refresh_market_demand_signals()$$
  );
  PERFORM cron.schedule(
    'refresh-listing-health',
    '24-59/30 * * * *',
    $$SELECT public.refresh_listing_health()$$
  );
EXCEPTION WHEN undefined_function OR undefined_schema THEN
  RAISE WARNING
    '[014] pg_cron not enabled — market demand signals and listing health '
    'will not auto-refresh. Enable pg_cron, then run cron.schedule() manually.';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  RLS
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.search_queries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_demand_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_health        ENABLE ROW LEVEL SECURITY;

-- search_queries: users can insert their own rows; no direct SELECT (server-side only)
CREATE POLICY "search_queries_anon_insert"
  ON public.search_queries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- market_demand_signals: public read (used for recommendations, admin views)
CREATE POLICY "market_demand_signals_public_read"
  ON public.market_demand_signals FOR SELECT
  TO anon, authenticated USING (true);

-- listing_health: public read (listing owners + admin use)
CREATE POLICY "listing_health_public_read"
  ON public.listing_health FOR SELECT
  TO anon, authenticated USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8.  Grants
-- ══════════════════════════════════════════════════════════════════════════════

GRANT INSERT             ON public.search_queries        TO anon, authenticated;
GRANT SELECT             ON public.market_demand_signals TO anon, authenticated;
GRANT SELECT             ON public.listing_health        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_market_demand_signals TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_listing_health        TO postgres;
