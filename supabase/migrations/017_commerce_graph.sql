-- ── 017_commerce_graph.sql ───────────────────────────────────────────────────
-- Week 3.0: Local Commerce Graph.
--
-- Regional commerce intelligence built entirely in PostgreSQL.
-- All edges are precomputed by pg_cron — zero runtime graph traversal.
--
-- Tables (8):
--   • merchant_relationships    — co-location / competitor / partner graph
--   • regional_demand_signals   — province × category demand windows
--   • regional_supply_density   — listing + merchant density per region
--   • market_gap_scores         — demand ÷ supply gap + opportunity ranking
--   • buyer_interest_edges      — per-buyer province/category affinities
--   • merchant_similarity       — Jaccard + co-buyer similarity scores
--   • logistics_routes          — cross-province trade flow graph
--   • wholesale_requests        — B2B bulk purchase request board
--
-- Aggregation functions (pg_cron at :02/:03/:06/:09/:12/:15 and +30):
--   • refresh_regional_demand_signals()   — SECURITY DEFINER
--   • refresh_regional_supply_density()
--   • refresh_market_gap_scores()
--   • refresh_buyer_interest_edges()      — SECURITY DEFINER
--   • refresh_merchant_similarity()       — SECURITY DEFINER (also fills merchant_relationships)
--   • refresh_logistics_routes()          — SECURITY DEFINER
--
-- Graph formulas (documented inline in each function):
--   demand_score    = LN(1+searches)×1 + LN(1+inquiries)×3 + LN(1+views)×0.5
--   supply_score    = LN(1+active_listings)×1 + LN(1+verified_merchants)×1.5
--   gap_score       = demand_score / GREATEST(0.1, supply_score)
--   similarity      = cat_jaccard×0.50 + prov_jaccard×0.30 + buyer_norm×0.20
--   buyer_weight    = Σ(view×1 + click×2 + save×3 + inquiry×5) × EXP(-age_days/14)
--   route_strength  = LN(1+inquiry_count) × EXP(-age_days/90)
--
-- Depends on: migrations 001–016
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE / DROP IF EXISTS throughout.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  merchant_relationships
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Merchant co-occurrence graph.  One row per canonical pair (a < b).
-- relationship_type is the dominant signal for this pair:
--   competitor    — same province + same category
--   complementary — same province, different categories (cross-sell potential)
--   co_buyer      — different province but shared buyer sessions
--   cross_region  — category overlap across provinces
--
-- Populated by refresh_merchant_similarity() — no separate refresh function.

CREATE TABLE IF NOT EXISTS public.merchant_relationships (
  merchant_a_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_b_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  relationship_type     text         NOT NULL
                          CHECK (relationship_type IN ('competitor','complementary','co_buyer','cross_region')),
  strength              numeric(5,4) NOT NULL DEFAULT 0,
  shared_province_count integer      NOT NULL DEFAULT 0,
  shared_category_count integer      NOT NULL DEFAULT 0,
  co_view_count         integer      NOT NULL DEFAULT 0,
  co_inquiry_count      integer      NOT NULL DEFAULT 0,
  last_seen_at          timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (merchant_a_id, merchant_b_id),
  CONSTRAINT merchant_rel_canonical CHECK (merchant_a_id < merchant_b_id)
);

-- Reverse-direction lookup
CREATE INDEX IF NOT EXISTS merchant_rel_reverse_idx
  ON public.merchant_relationships (merchant_b_id, strength DESC);

-- Type-filtered traversal (e.g. "all competitors in province X")
CREATE INDEX IF NOT EXISTS merchant_rel_type_strength_idx
  ON public.merchant_relationships (relationship_type, strength DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  regional_demand_signals
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Pre-aggregated demand per (province, category) — refreshed every 30 min.
-- trend_7d = searches_7d / GREATEST(1, searches_30d / 4)
--   > 1.0 means demand is accelerating vs 30-day baseline
--   < 1.0 means demand is cooling

CREATE TABLE IF NOT EXISTS public.regional_demand_signals (
  province_id             integer      NOT NULL,
  category_id             integer      NOT NULL,

  -- 7-day window
  searches_7d             integer      NOT NULL DEFAULT 0,
  unique_searches_7d      integer      NOT NULL DEFAULT 0,
  zero_result_searches_7d integer      NOT NULL DEFAULT 0,
  inquiries_7d            integer      NOT NULL DEFAULT 0,
  views_7d                integer      NOT NULL DEFAULT 0,

  -- 30-day window (for trend baseline)
  searches_30d            integer      NOT NULL DEFAULT 0,
  inquiries_30d           integer      NOT NULL DEFAULT 0,
  views_30d               integer      NOT NULL DEFAULT 0,

  -- Derived
  demand_score            numeric(8,4) NOT NULL DEFAULT 0,
  trend_7d                numeric(6,4) NOT NULL DEFAULT 1,

  updated_at              timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (province_id, category_id)
);

-- Trending feed (highest trend ratio first)
CREATE INDEX IF NOT EXISTS regional_demand_trend_idx
  ON public.regional_demand_signals (trend_7d DESC, demand_score DESC);

-- Province page: all categories sorted by demand
CREATE INDEX IF NOT EXISTS regional_demand_province_idx
  ON public.regional_demand_signals (province_id, demand_score DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  regional_supply_density
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Pre-aggregated supply (listings + merchants) per (province, category).
-- saturation_level is determined by absolute thresholds on active_listing_count:
--   > 100 → oversupplied   (competitive market)
--   10–100 → balanced
--   < 10   → undersupplied (gap opportunity)

CREATE TABLE IF NOT EXISTS public.regional_supply_density (
  province_id               integer      NOT NULL,
  category_id               integer      NOT NULL,

  listing_count             integer      NOT NULL DEFAULT 0,  -- all published + approved
  active_listing_count      integer      NOT NULL DEFAULT 0,  -- is_public = true
  merchant_count            integer      NOT NULL DEFAULT 0,
  verified_merchant_count   integer      NOT NULL DEFAULT 0,

  avg_price_amount          numeric(14,2),

  -- Derived
  supply_score              numeric(8,4) NOT NULL DEFAULT 0,
  saturation_level          text         NOT NULL DEFAULT 'undersupplied'
                              CHECK (saturation_level IN ('undersupplied','balanced','oversupplied')),

  updated_at                timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (province_id, category_id)
);

CREATE INDEX IF NOT EXISTS regional_supply_score_idx
  ON public.regional_supply_density (supply_score DESC);

CREATE INDEX IF NOT EXISTS regional_supply_province_idx
  ON public.regional_supply_density (province_id, saturation_level);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  market_gap_scores
-- ══════════════════════════════════════════════════════════════════════════════
--
-- gap_score      = demand_score / GREATEST(0.1, supply_score)
-- opportunity_score (0–100) = LEAST(100, gap_score × 20)
-- gap_tier:
--   critical  gap_score ≥ 5.0  — severe undersupply, high-value expansion target
--   high      gap_score ≥ 2.0  — clear opportunity
--   medium    gap_score ≥ 1.0  — mild imbalance
--   low       gap_score < 1.0  — balanced or oversupplied

CREATE TABLE IF NOT EXISTS public.market_gap_scores (
  province_id       integer      NOT NULL,
  category_id       integer      NOT NULL,

  demand_score_7d   numeric(8,4) NOT NULL DEFAULT 0,
  supply_score      numeric(8,4) NOT NULL DEFAULT 0,
  gap_score         numeric(8,4) NOT NULL DEFAULT 0,
  opportunity_score numeric(5,1) NOT NULL DEFAULT 0,
  gap_tier          text         NOT NULL DEFAULT 'low'
                      CHECK (gap_tier IN ('critical','high','medium','low')),

  -- Snapshot of supply counts for display
  listing_count     integer      NOT NULL DEFAULT 0,
  merchant_count    integer      NOT NULL DEFAULT 0,

  updated_at        timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (province_id, category_id)
);

-- Global discovery feed: underserved markets sorted by opportunity
CREATE INDEX IF NOT EXISTS market_gap_opportunity_idx
  ON public.market_gap_scores (gap_tier, opportunity_score DESC)
  WHERE gap_tier IN ('critical','high');

-- Province page: gaps within one province
CREATE INDEX IF NOT EXISTS market_gap_province_idx
  ON public.market_gap_scores (province_id, opportunity_score DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  buyer_interest_edges
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Per-buyer interest graph.  One row per (buyer, interest_type, interest_key).
-- buyer_type = 'profile' for authenticated users (buyer_id = profile_id::text)
--           = 'session'  for anonymous       (buyer_id = session_id::text)
--
-- raw_weight     = Σ(view×1, click×2, save×3, inquiry×5) over all events
-- decayed_weight = raw_weight × EXP(-age_seconds / (14 × 86400))
--   where age_seconds = EXTRACT(epoch FROM now() − last_seen_at)

CREATE TABLE IF NOT EXISTS public.buyer_interest_edges (
  buyer_id       text         NOT NULL,
  buyer_type     text         NOT NULL CHECK (buyer_type IN ('profile','session')),
  interest_type  text         NOT NULL CHECK (interest_type IN ('province','category')),
  interest_key   text         NOT NULL,  -- province_id::text or category_id::text

  raw_weight     numeric(10,4) NOT NULL DEFAULT 0,
  decayed_weight numeric(10,4) NOT NULL DEFAULT 0,
  event_count    integer       NOT NULL DEFAULT 0,
  last_seen_at   timestamptz   NOT NULL DEFAULT now(),

  PRIMARY KEY (buyer_id, buyer_type, interest_type, interest_key)
);

-- Top interests lookup (used in personalization layer)
CREATE INDEX IF NOT EXISTS buyer_interest_lookup_idx
  ON public.buyer_interest_edges (buyer_id, buyer_type, decayed_weight DESC);

-- Category/province interest maps (graph analytics)
CREATE INDEX IF NOT EXISTS buyer_interest_type_idx
  ON public.buyer_interest_edges (interest_type, interest_key, decayed_weight DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  merchant_similarity
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Scored merchant pairs — one row per canonical pair (a < b).
-- similarity_score = cat_jaccard × 0.50
--                  + prov_jaccard × 0.30
--                  + buyer_norm   × 0.20
-- where:
--   cat_jaccard  = |shared_cats|  / |cats_A ∪ cats_B|
--   prov_jaccard = |shared_provs| / |provs_A ∪ provs_B|
--   buyer_norm   = LEAST(1, LN(1 + shared_buyers) / LN(11))   [LN(11) ≈ log-ceiling of 10 co-sessions]

CREATE TABLE IF NOT EXISTS public.merchant_similarity (
  merchant_a_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_b_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  similarity_score    numeric(5,4) NOT NULL DEFAULT 0,
  shared_provinces    integer      NOT NULL DEFAULT 0,
  shared_categories   integer      NOT NULL DEFAULT 0,
  shared_buyer_count  integer      NOT NULL DEFAULT 0,

  similarity_type     text         NOT NULL DEFAULT 'cross_region'
                        CHECK (similarity_type IN ('competitor','complementary','co_buyer','cross_region')),

  updated_at          timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (merchant_a_id, merchant_b_id),
  CONSTRAINT merchant_sim_canonical CHECK (merchant_a_id < merchant_b_id)
);

-- Forward + reverse similarity lookup (both directions query from one direction)
CREATE INDEX IF NOT EXISTS merchant_sim_a_score_idx
  ON public.merchant_similarity (merchant_a_id, similarity_score DESC);

CREATE INDEX IF NOT EXISTS merchant_sim_b_score_idx
  ON public.merchant_similarity (merchant_b_id, similarity_score DESC);

-- Type-filtered (find all competitors of a merchant)
CREATE INDEX IF NOT EXISTS merchant_sim_type_idx
  ON public.merchant_similarity (similarity_type, similarity_score DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  logistics_routes
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Cross-province trade flow graph — derived from cross-province inquiry patterns.
-- route_strength = LN(1 + inquiry_count) × EXP(-age_days / 90)
-- A route is "active" when it had an inquiry in the last 30 days.
-- estimated_days: NULL until calibrated with carrier distance data.

CREATE TABLE IF NOT EXISTS public.logistics_routes (
  origin_province_id       integer      NOT NULL,
  destination_province_id  integer      NOT NULL,

  route_strength           numeric(6,4) NOT NULL DEFAULT 0,
  inquiry_count            integer      NOT NULL DEFAULT 0,
  listing_count            integer      NOT NULL DEFAULT 0,  -- listings in origin sold to destination

  estimated_days           smallint,    -- NULL until distance data available
  is_active                boolean      NOT NULL DEFAULT false,  -- inquiry in last 30 days

  last_active_at           timestamptz,
  updated_at               timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (origin_province_id, destination_province_id),
  CONSTRAINT logistics_no_self_loop CHECK (origin_province_id <> destination_province_id)
);

-- Routes from a province (outbound trade)
CREATE INDEX IF NOT EXISTS logistics_origin_idx
  ON public.logistics_routes (origin_province_id, route_strength DESC)
  WHERE is_active = true;

-- Routes to a province (inbound demand)
CREATE INDEX IF NOT EXISTS logistics_dest_idx
  ON public.logistics_routes (destination_province_id, route_strength DESC)
  WHERE is_active = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8.  wholesale_requests
-- ══════════════════════════════════════════════════════════════════════════════
--
-- B2B bulk purchase request board.
-- Buyers post open requests; suppliers browse and respond.
-- status lifecycle: open → matched → closed | expired

CREATE TABLE IF NOT EXISTS public.wholesale_requests (
  id                    bigserial    PRIMARY KEY,
  requester_id          uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  category_id           integer      NOT NULL,
  province_id           integer,                -- delivery destination (NULL = nationwide)

  title                 text         NOT NULL,
  quantity_text         text,                   -- free-form: "10 tấn", "500 giỏ/tháng"
  budget_min            numeric(14,0),
  budget_max            numeric(14,0),

  status                text         NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','matched','closed','expired')),

  matched_merchant_id   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,

  expires_at            timestamptz  NOT NULL DEFAULT now() + interval '30 days',
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

-- Discovery feed: open requests by category + province
CREATE INDEX IF NOT EXISTS wholesale_open_category_idx
  ON public.wholesale_requests (category_id, province_id, created_at DESC)
  WHERE status = 'open';

-- Merchant's own requests
CREATE INDEX IF NOT EXISTS wholesale_requester_idx
  ON public.wholesale_requests (requester_id, status, created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 9.  refresh_regional_demand_signals()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Sources:
--   • public.search_queries       (province_id + category_id — both must be non-NULL)
--   • public.listing_events JOIN listings  (SECURITY DEFINER: no public SELECT on listing_events)
--
-- demand_score formula:
--   LN(1 + searches_7d)   × 1.0   — discovery intent
--   LN(1 + inquiries_7d)  × 3.0   — purchase intent (3× weight)
--   LN(1 + views_7d)      × 0.5   — passive interest
--
-- trend_7d:
--   searches_7d / GREATEST(1, searches_30d / 4.0)
--   > 1.0 = accelerating demand;  < 1.0 = cooling demand

CREATE OR REPLACE FUNCTION public.refresh_regional_demand_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.regional_demand_signals (
    province_id, category_id,
    searches_7d, unique_searches_7d, zero_result_searches_7d,
    searches_30d,
    inquiries_7d, inquiries_30d,
    views_7d, views_30d,
    demand_score, trend_7d,
    updated_at
  )
  WITH sq_agg AS (
    SELECT
      province_id,
      category_id,
      COUNT(*)           FILTER (WHERE created_at >= now() - interval '7 days')   AS searches_7d,
      COUNT(DISTINCT query) FILTER (WHERE created_at >= now() - interval '7 days') AS unique_7d,
      COUNT(*)           FILTER (WHERE results_count = 0
                                   AND created_at >= now() - interval '7 days')   AS zero_7d,
      COUNT(*)           FILTER (WHERE created_at >= now() - interval '30 days')  AS searches_30d
    FROM public.search_queries
    WHERE created_at >= now() - interval '30 days'
      AND province_id IS NOT NULL
      AND category_id IS NOT NULL
    GROUP BY province_id, category_id
  ),
  ev_agg AS (
    SELECT
      l.province_id,
      l.category_id,
      COUNT(*) FILTER (WHERE e.event_type = 'view'
                         AND e.created_at >= now() - interval '7 days')            AS views_7d,
      COUNT(*) FILTER (WHERE e.event_type = 'view'
                         AND e.created_at >= now() - interval '30 days')           AS views_30d,
      COUNT(*) FILTER (WHERE e.event_type = 'inquiry'
                         AND e.created_at >= now() - interval '7 days')            AS inquiries_7d,
      COUNT(*) FILTER (WHERE e.event_type = 'inquiry'
                         AND e.created_at >= now() - interval '30 days')           AS inquiries_30d
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.created_at >= now() - interval '30 days'
      AND l.province_id IS NOT NULL
      AND l.category_id IS NOT NULL
    GROUP BY l.province_id, l.category_id
  ),
  -- Deduped union of all known (province, category) pairs
  all_pairs AS (
    SELECT province_id, category_id FROM sq_agg
    UNION
    SELECT province_id, category_id FROM ev_agg
  ),
  combined AS (
    SELECT
      ap.province_id,
      ap.category_id,
      COALESCE(sq.searches_7d,   0) AS searches_7d,
      COALESCE(sq.unique_7d,     0) AS unique_searches_7d,
      COALESCE(sq.zero_7d,       0) AS zero_result_searches_7d,
      COALESCE(sq.searches_30d,  0) AS searches_30d,
      COALESCE(ev.inquiries_7d,  0) AS inquiries_7d,
      COALESCE(ev.inquiries_30d, 0) AS inquiries_30d,
      COALESCE(ev.views_7d,      0) AS views_7d,
      COALESCE(ev.views_30d,     0) AS views_30d
    FROM all_pairs ap
    LEFT JOIN sq_agg sq ON sq.province_id = ap.province_id AND sq.category_id = ap.category_id
    LEFT JOIN ev_agg ev ON ev.province_id = ap.province_id AND ev.category_id = ap.category_id
  )
  SELECT
    province_id,
    category_id,
    searches_7d,
    unique_searches_7d,
    zero_result_searches_7d,
    searches_30d,
    inquiries_7d,
    inquiries_30d,
    views_7d,
    views_30d,
    ROUND((
        LN(1.0 + searches_7d)  * 1.0
      + LN(1.0 + inquiries_7d) * 3.0
      + LN(1.0 + views_7d)     * 0.5
    )::numeric, 4)                                                        AS demand_score,
    ROUND((searches_7d::numeric / GREATEST(1, searches_30d / 4.0)), 4)   AS trend_7d,
    now()
  FROM combined

  ON CONFLICT (province_id, category_id) DO UPDATE SET
    searches_7d               = EXCLUDED.searches_7d,
    unique_searches_7d        = EXCLUDED.unique_searches_7d,
    zero_result_searches_7d   = EXCLUDED.zero_result_searches_7d,
    searches_30d              = EXCLUDED.searches_30d,
    inquiries_7d              = EXCLUDED.inquiries_7d,
    inquiries_30d             = EXCLUDED.inquiries_30d,
    views_7d                  = EXCLUDED.views_7d,
    views_30d                 = EXCLUDED.views_30d,
    demand_score              = EXCLUDED.demand_score,
    trend_7d                  = EXCLUDED.trend_7d,
    updated_at                = EXCLUDED.updated_at;

  -- Prune rows stale for > 48 h (no recent search/inquiry activity)
  DELETE FROM public.regional_demand_signals
  WHERE updated_at < now() - interval '48 hours';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10.  refresh_regional_supply_density()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Source: public.listings only — no SECURITY DEFINER required.
--
-- supply_score formula:
--   LN(1 + active_listing_count)    × 1.0
--   LN(1 + verified_merchant_count) × 1.5   (verified supply weighted higher)
--
-- saturation_level thresholds (absolute, on active_listing_count):
--   > 100  → oversupplied
--   10–100 → balanced
--   < 10   → undersupplied

CREATE OR REPLACE FUNCTION public.refresh_regional_supply_density()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.regional_supply_density (
    province_id, category_id,
    listing_count, active_listing_count,
    merchant_count, verified_merchant_count,
    avg_price_amount,
    supply_score, saturation_level,
    updated_at
  )
  WITH supply AS (
    SELECT
      l.province_id,
      l.category_id,
      COUNT(*)                                                AS listing_count,
      COUNT(*) FILTER (WHERE l.is_public = true)             AS active_listing_count,
      COUNT(DISTINCT l.owner_id)                             AS merchant_count,
      COUNT(DISTINCT l.owner_id)
        FILTER (WHERE mts.identity_verified = true)          AS verified_merchant_count,
      AVG(l.price_amount) FILTER (WHERE l.price_amount > 0)  AS avg_price_amount
    FROM public.listings l
    LEFT JOIN public.merchant_trust_scores mts ON mts.profile_id = l.owner_id
    WHERE l.status             = 'published'
      AND l.moderation_status  = 'approved'
      AND l.province_id IS NOT NULL
      AND l.category_id IS NOT NULL
    GROUP BY l.province_id, l.category_id
  )
  SELECT
    province_id,
    category_id,
    listing_count,
    active_listing_count,
    merchant_count,
    verified_merchant_count,
    ROUND(avg_price_amount::numeric, 2),
    ROUND((
        LN(1.0 + active_listing_count)    * 1.0
      + LN(1.0 + verified_merchant_count) * 1.5
    )::numeric, 4)                                           AS supply_score,
    CASE
      WHEN active_listing_count > 100 THEN 'oversupplied'
      WHEN active_listing_count >= 10 THEN 'balanced'
      ELSE                                 'undersupplied'
    END                                                      AS saturation_level,
    now()
  FROM supply

  ON CONFLICT (province_id, category_id) DO UPDATE SET
    listing_count           = EXCLUDED.listing_count,
    active_listing_count    = EXCLUDED.active_listing_count,
    merchant_count          = EXCLUDED.merchant_count,
    verified_merchant_count = EXCLUDED.verified_merchant_count,
    avg_price_amount        = EXCLUDED.avg_price_amount,
    supply_score            = EXCLUDED.supply_score,
    saturation_level        = EXCLUDED.saturation_level,
    updated_at              = EXCLUDED.updated_at;

  -- Remove rows for province/category combos that no longer have any listings
  DELETE FROM public.regional_supply_density
  WHERE updated_at < now() - interval '48 hours';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 11.  refresh_market_gap_scores()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Requires refresh_regional_demand_signals() and refresh_regional_supply_density()
-- to have run first (cron at :02 and :03; this runs at :06).
--
-- gap_score      = demand_score / GREATEST(0.1, supply_score)
-- opportunity    = LEAST(100, ROUND(gap_score × 20, 1))
-- gap_tier tiers:
--   critical  ≥ 5.0   severe undersupply — top expansion target
--   high      ≥ 2.0   clear opportunity
--   medium    ≥ 1.0   mild imbalance
--   low       < 1.0   balanced / oversupplied

CREATE OR REPLACE FUNCTION public.refresh_market_gap_scores()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.market_gap_scores (
    province_id, category_id,
    demand_score_7d, supply_score,
    gap_score, opportunity_score, gap_tier,
    listing_count, merchant_count,
    updated_at
  )
  WITH all_regions AS (
    -- All province+category pairs from either demand or supply side
    SELECT province_id, category_id FROM public.regional_demand_signals
    UNION
    SELECT province_id, category_id FROM public.regional_supply_density
  ),
  joined AS (
    SELECT
      ar.province_id,
      ar.category_id,
      COALESCE(d.demand_score, 0)           AS demand_score,
      COALESCE(s.supply_score, 0)           AS supply_score,
      COALESCE(s.active_listing_count, 0)   AS listing_count,
      COALESCE(s.merchant_count, 0)         AS merchant_count
    FROM all_regions ar
    LEFT JOIN public.regional_demand_signals d
      ON d.province_id = ar.province_id AND d.category_id = ar.category_id
    LEFT JOIN public.regional_supply_density s
      ON s.province_id = ar.province_id AND s.category_id = ar.category_id
  ),
  scored AS (
    SELECT
      *,
      ROUND((demand_score / GREATEST(0.1, supply_score))::numeric, 4)    AS gap_score
    FROM joined
  )
  SELECT
    province_id,
    category_id,
    demand_score,
    supply_score,
    gap_score,
    LEAST(100.0, ROUND((gap_score * 20)::numeric, 1))                     AS opportunity_score,
    CASE
      WHEN gap_score >= 5.0 THEN 'critical'
      WHEN gap_score >= 2.0 THEN 'high'
      WHEN gap_score >= 1.0 THEN 'medium'
      ELSE                       'low'
    END                                                                    AS gap_tier,
    listing_count,
    merchant_count,
    now()
  FROM scored

  ON CONFLICT (province_id, category_id) DO UPDATE SET
    demand_score_7d   = EXCLUDED.demand_score_7d,
    supply_score      = EXCLUDED.supply_score,
    gap_score         = EXCLUDED.gap_score,
    opportunity_score = EXCLUDED.opportunity_score,
    gap_tier          = EXCLUDED.gap_tier,
    listing_count     = EXCLUDED.listing_count,
    merchant_count    = EXCLUDED.merchant_count,
    updated_at        = EXCLUDED.updated_at;

  -- Stale rows with no underlying data
  DELETE FROM public.market_gap_scores
  WHERE updated_at < now() - interval '48 hours';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12.  refresh_buyer_interest_edges()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Aggregates listing_events into per-buyer interest vectors (province + category).
-- SECURITY DEFINER: listing_events has no public SELECT RLS policy.
--
-- buyer_id  = profile_id::text (authenticated) or session_id::text (anonymous)
-- buyer_type = 'profile' | 'session'
-- interest_key = province_id::text or category_id::text
--
-- raw_weight = Σ event weights:
--   view=1, click=2, save=3, inquiry=5
-- decayed_weight = raw_weight × EXP(-age_seconds / (14 × 86400))
--   14-day half-life — interests fade if not reinforced

CREATE OR REPLACE FUNCTION public.refresh_buyer_interest_edges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.buyer_interest_edges (
    buyer_id, buyer_type,
    interest_type, interest_key,
    raw_weight, decayed_weight,
    event_count, last_seen_at
  )
  WITH event_weights AS (
    SELECT
      -- Prefer profile over session for the buyer key
      CASE
        WHEN e.profile_id IS NOT NULL THEN e.profile_id::text
        ELSE e.session_id::text
      END                                                        AS buyer_id,
      CASE
        WHEN e.profile_id IS NOT NULL THEN 'profile'
        ELSE                               'session'
      END                                                        AS buyer_type,
      l.province_id,
      l.category_id,
      CASE e.event_type
        WHEN 'view'    THEN 1
        WHEN 'click'   THEN 2
        WHEN 'save'    THEN 3
        WHEN 'inquiry' THEN 5
        ELSE 1
      END                                                        AS weight,
      e.created_at
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.created_at >= now() - interval '30 days'
      AND l.province_id IS NOT NULL
      AND l.category_id IS NOT NULL
      AND (e.profile_id IS NOT NULL OR e.session_id IS NOT NULL)
  ),
  -- Province interest edges
  province_edges AS (
    SELECT
      buyer_id,
      buyer_type,
      'province'                                                 AS interest_type,
      province_id::text                                          AS interest_key,
      SUM(weight)                                                AS raw_weight,
      COUNT(*)                                                   AS event_count,
      MAX(created_at)                                            AS last_seen_at
    FROM event_weights
    GROUP BY buyer_id, buyer_type, province_id
  ),
  -- Category interest edges
  category_edges AS (
    SELECT
      buyer_id,
      buyer_type,
      'category'                                                 AS interest_type,
      category_id::text                                          AS interest_key,
      SUM(weight)                                                AS raw_weight,
      COUNT(*)                                                   AS event_count,
      MAX(created_at)                                            AS last_seen_at
    FROM event_weights
    GROUP BY buyer_id, buyer_type, category_id
  ),
  all_edges AS (
    SELECT * FROM province_edges
    UNION ALL
    SELECT * FROM category_edges
  )
  SELECT
    buyer_id,
    buyer_type,
    interest_type,
    interest_key,
    raw_weight,
    ROUND((
      raw_weight * EXP(
        -EXTRACT(epoch FROM now() - last_seen_at) / (14.0 * 86400.0)
      )
    )::numeric, 4)                                               AS decayed_weight,
    event_count,
    last_seen_at
  FROM all_edges

  ON CONFLICT (buyer_id, buyer_type, interest_type, interest_key) DO UPDATE SET
    raw_weight     = EXCLUDED.raw_weight,
    decayed_weight = EXCLUDED.decayed_weight,
    event_count    = EXCLUDED.event_count,
    last_seen_at   = EXCLUDED.last_seen_at;

  -- Prune fully decayed edges (< 0.01 weight) and edges older than 45 days
  DELETE FROM public.buyer_interest_edges
  WHERE decayed_weight < 0.01
     OR last_seen_at < now() - interval '45 days';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 13.  refresh_merchant_similarity()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Populates BOTH merchant_similarity AND merchant_relationships in one pass.
-- SECURITY DEFINER: reads listing_events for co-buyer signal.
--
-- similarity_score = cat_jaccard × 0.50 + prov_jaccard × 0.30 + buyer_norm × 0.20
--
--   cat_jaccard  = shared_categories / (cat_a + cat_b − shared_categories)
--   prov_jaccard = shared_provinces  / (prov_a + prov_b − shared_provinces)
--   buyer_norm   = LEAST(1, LN(1 + shared_buyer_count) / LN(11))
--
-- Bot guard: sessions with > 20 distinct merchants excluded.
-- Co-buyer threshold: pair must share ≥ 2 distinct sessions.
-- Only pairs with at least one non-zero signal are stored.

CREATE OR REPLACE FUNCTION public.refresh_merchant_similarity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchant_similarity (
    merchant_a_id, merchant_b_id,
    similarity_score,
    shared_provinces, shared_categories, shared_buyer_count,
    similarity_type,
    updated_at
  )
  WITH
  -- ── Feature sets ────────────────────────────────────────────────────────
  merchant_cats AS (
    SELECT DISTINCT owner_id, category_id
    FROM public.listings
    WHERE status = 'published' AND is_public = true AND moderation_status = 'approved'
      AND category_id IS NOT NULL
  ),
  merchant_provs AS (
    SELECT DISTINCT owner_id, province_id
    FROM public.listings
    WHERE status = 'published' AND is_public = true AND moderation_status = 'approved'
      AND province_id IS NOT NULL
  ),
  merchant_cat_counts AS (
    SELECT owner_id, COUNT(*) AS cat_count FROM merchant_cats GROUP BY owner_id
  ),
  merchant_prov_counts AS (
    SELECT owner_id, COUNT(*) AS prov_count FROM merchant_provs GROUP BY owner_id
  ),
  -- ── Category pairs ───────────────────────────────────────────────────────
  cat_pairs AS (
    SELECT
      LEAST(a.owner_id,    b.owner_id)    AS merchant_a,
      GREATEST(a.owner_id, b.owner_id)    AS merchant_b,
      COUNT(*)                            AS shared_cats
    FROM merchant_cats a
    JOIN merchant_cats b ON a.category_id = b.category_id AND a.owner_id < b.owner_id
    GROUP BY 1, 2
  ),
  -- ── Province pairs ───────────────────────────────────────────────────────
  prov_pairs AS (
    SELECT
      LEAST(a.owner_id,    b.owner_id)    AS merchant_a,
      GREATEST(a.owner_id, b.owner_id)    AS merchant_b,
      COUNT(*)                            AS shared_provs
    FROM merchant_provs a
    JOIN merchant_provs b ON a.province_id = b.province_id AND a.owner_id < b.owner_id
    GROUP BY 1, 2
  ),
  -- ── Co-buyer pairs (from listing_events) ────────────────────────────────
  session_merchants AS (
    SELECT e.session_id, l.owner_id
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.created_at >= now() - interval '30 days'
      AND e.session_id IS NOT NULL
    GROUP BY e.session_id, l.owner_id
  ),
  valid_sessions AS (
    -- Bot guard: sessions with 2–20 distinct merchants
    SELECT session_id FROM session_merchants
    GROUP BY session_id
    HAVING COUNT(DISTINCT owner_id) BETWEEN 2 AND 20
  ),
  cobuyer_pairs AS (
    SELECT
      LEAST(a.owner_id,    b.owner_id)    AS merchant_a,
      GREATEST(a.owner_id, b.owner_id)    AS merchant_b,
      COUNT(DISTINCT a.session_id)        AS shared_buyers
    FROM session_merchants a
    JOIN valid_sessions vs ON vs.session_id = a.session_id
    JOIN session_merchants b
      ON b.session_id = a.session_id AND a.owner_id < b.owner_id
    GROUP BY 1, 2
    HAVING COUNT(DISTINCT a.session_id) >= 2   -- at least 2 shared sessions
  ),
  -- ── Merge all pair sources ───────────────────────────────────────────────
  all_pairs AS (
    SELECT merchant_a, merchant_b FROM cat_pairs
    UNION
    SELECT merchant_a, merchant_b FROM prov_pairs
    UNION
    SELECT merchant_a, merchant_b FROM cobuyer_pairs
  ),
  enriched AS (
    SELECT
      ap.merchant_a,
      ap.merchant_b,
      COALESCE(cp.shared_cats,    0)  AS shared_categories,
      COALESCE(pp.shared_provs,   0)  AS shared_provinces,
      COALESCE(cb.shared_buyers,  0)  AS shared_buyer_count
    FROM all_pairs ap
    LEFT JOIN cat_pairs     cp ON cp.merchant_a = ap.merchant_a AND cp.merchant_b = ap.merchant_b
    LEFT JOIN prov_pairs    pp ON pp.merchant_a = ap.merchant_a AND pp.merchant_b = ap.merchant_b
    LEFT JOIN cobuyer_pairs cb ON cb.merchant_a = ap.merchant_a AND cb.merchant_b = ap.merchant_b
  ),
  -- ── Score ────────────────────────────────────────────────────────────────
  scored AS (
    SELECT
      e.merchant_a,
      e.merchant_b,
      e.shared_categories,
      e.shared_provinces,
      e.shared_buyer_count,
      -- Category Jaccard
      CASE WHEN mca.cat_count + mcb.cat_count > 0
        THEN e.shared_categories::float /
             GREATEST(1, mca.cat_count + mcb.cat_count - e.shared_categories)
        ELSE 0
      END                                                      AS cat_j,
      -- Province Jaccard
      CASE WHEN COALESCE(mpa.prov_count,0) + COALESCE(mpb.prov_count,0) > 0
        THEN e.shared_provinces::float /
             GREATEST(1, COALESCE(mpa.prov_count,0) + COALESCE(mpb.prov_count,0) - e.shared_provinces)
        ELSE 0
      END                                                      AS prov_j,
      -- Co-buyer log-normalized (LN(11) ≈ log-ceiling for 10 shared sessions)
      LEAST(1.0, LN(1.0 + e.shared_buyer_count::float) / LN(11.0))
                                                               AS buyer_s
    FROM enriched e
    JOIN merchant_cat_counts mca ON mca.owner_id = e.merchant_a
    JOIN merchant_cat_counts mcb ON mcb.owner_id = e.merchant_b
    LEFT JOIN merchant_prov_counts mpa ON mpa.owner_id = e.merchant_a
    LEFT JOIN merchant_prov_counts mpb ON mpb.owner_id = e.merchant_b
  )
  SELECT
    merchant_a::uuid,
    merchant_b::uuid,
    ROUND((cat_j * 0.50 + prov_j * 0.30 + buyer_s * 0.20)::numeric, 4) AS similarity_score,
    shared_provinces,
    shared_categories,
    shared_buyer_count,
    CASE
      WHEN shared_provinces > 0 AND shared_categories > 0 THEN 'competitor'
      WHEN shared_provinces > 0 AND shared_categories = 0 THEN 'complementary'
      WHEN shared_buyer_count > 5                          THEN 'co_buyer'
      ELSE                                                      'cross_region'
    END                                                        AS similarity_type,
    now()
  FROM scored
  WHERE cat_j > 0 OR prov_j > 0 OR buyer_s > 0.1

  ON CONFLICT (merchant_a_id, merchant_b_id) DO UPDATE SET
    similarity_score   = EXCLUDED.similarity_score,
    shared_provinces   = EXCLUDED.shared_provinces,
    shared_categories  = EXCLUDED.shared_categories,
    shared_buyer_count = EXCLUDED.shared_buyer_count,
    similarity_type    = EXCLUDED.similarity_type,
    updated_at         = EXCLUDED.updated_at;

  -- ── Backfill merchant_relationships from freshly scored pairs ────────────
  INSERT INTO public.merchant_relationships (
    merchant_a_id, merchant_b_id,
    relationship_type, strength,
    shared_province_count, shared_category_count,
    last_seen_at
  )
  SELECT
    merchant_a_id,
    merchant_b_id,
    similarity_type,
    similarity_score,
    shared_provinces,
    shared_categories,
    now()
  FROM public.merchant_similarity
  WHERE updated_at >= now() - interval '5 minutes'

  ON CONFLICT (merchant_a_id, merchant_b_id) DO UPDATE SET
    relationship_type     = EXCLUDED.relationship_type,
    strength              = EXCLUDED.strength,
    shared_province_count = EXCLUDED.shared_province_count,
    shared_category_count = EXCLUDED.shared_category_count,
    last_seen_at          = EXCLUDED.last_seen_at;

  -- Prune stale low-signal pairs
  DELETE FROM public.merchant_similarity
  WHERE updated_at < now() - interval '60 days' AND similarity_score < 0.05;

  DELETE FROM public.merchant_relationships
  WHERE last_seen_at < now() - interval '60 days' AND strength < 0.05;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 14.  refresh_logistics_routes()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Derives cross-province trade routes from buyer behaviour:
--   origin      = the province a buyer most frequently views listings in
--   destination = the province of listings they actually inquire about
-- Routes are recorded when origin ≠ destination and ≥ 2 cross-province inquiries.
--
-- route_strength = LN(1 + inquiry_count) × EXP(-age_seconds / (90 × 86400))
--   90-day half-life — stale routes decay and are pruned when strength < 0.01.
--
-- SECURITY DEFINER: reads listing_events.

CREATE OR REPLACE FUNCTION public.refresh_logistics_routes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.logistics_routes (
    origin_province_id, destination_province_id,
    route_strength, inquiry_count, listing_count,
    is_active, last_active_at,
    updated_at
  )
  WITH
  -- Per-session: most-viewed province = proxy for origin
  session_view_counts AS (
    SELECT
      e.session_id,
      l.province_id,
      COUNT(*) AS view_count
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.created_at >= now() - interval '90 days'
      AND e.session_id IS NOT NULL
      AND l.province_id IS NOT NULL
      AND e.event_type IN ('view','click')
    GROUP BY e.session_id, l.province_id
  ),
  session_home AS (
    -- Pick the most-viewed province as the session's home province
    SELECT DISTINCT ON (session_id)
      session_id,
      province_id AS home_province
    FROM session_view_counts
    ORDER BY session_id, view_count DESC
  ),
  session_inquiries AS (
    SELECT DISTINCT
      e.session_id,
      l.province_id  AS inquiry_province,
      l.id           AS listing_id,
      e.created_at
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.event_type = 'inquiry'
      AND e.created_at >= now() - interval '90 days'
      AND e.session_id IS NOT NULL
      AND l.province_id IS NOT NULL
  ),
  -- Cross-province routes: home ≠ inquiry province
  raw_routes AS (
    SELECT
      sh.home_province                              AS origin_province_id,
      si.inquiry_province                           AS destination_province_id,
      COUNT(*)                                      AS inquiry_count,
      COUNT(DISTINCT si.listing_id)                 AS listing_count,
      MAX(si.created_at)                            AS last_inquiry_at
    FROM session_home sh
    JOIN session_inquiries si ON si.session_id = sh.session_id
    WHERE sh.home_province <> si.inquiry_province
    GROUP BY 1, 2
    HAVING COUNT(*) >= 2                            -- at least 2 cross-province inquiries
  )
  SELECT
    origin_province_id,
    destination_province_id,
    ROUND((
      LN(1.0 + inquiry_count) *
      EXP(-EXTRACT(epoch FROM now() - last_inquiry_at) / (90.0 * 86400.0))
    )::numeric, 4)                                  AS route_strength,
    inquiry_count,
    listing_count,
    last_inquiry_at > now() - interval '30 days'    AS is_active,
    last_inquiry_at                                 AS last_active_at,
    now()
  FROM raw_routes

  ON CONFLICT (origin_province_id, destination_province_id) DO UPDATE SET
    route_strength   = EXCLUDED.route_strength,
    inquiry_count    = EXCLUDED.inquiry_count,
    listing_count    = EXCLUDED.listing_count,
    is_active        = EXCLUDED.is_active,
    last_active_at   = EXCLUDED.last_active_at,
    updated_at       = EXCLUDED.updated_at;

  -- Prune fully decayed routes
  DELETE FROM public.logistics_routes
  WHERE route_strength < 0.01
    AND updated_at < now() - interval '7 days';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 15.  pg_cron — commerce graph pipeline
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Existing pipeline occupies: :00/:05/:08/:11/:14/:17/:21/:24/:28/:29 (and +30).
-- New slots chosen to avoid all conflicts and respect dependency order:
--   :02/:32  refresh_regional_demand_signals  (reads search_queries + listing_events)
--   :03/:33  refresh_regional_supply_density  (reads listings only)
--   :06/:36  refresh_market_gap_scores        (needs demand + supply — runs AFTER :02/:03)
--   :09/:39  refresh_buyer_interest_edges     (reads listing_events)
--   :12/:42  refresh_merchant_similarity      (reads listing_events + writes 2 tables)
--   :15/:45  refresh_logistics_routes         (reads listing_events)

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE command LIKE '%refresh_regional_demand_signals%'
   OR command LIKE '%refresh_regional_supply_density%'
   OR command LIKE '%refresh_market_gap_scores%'
   OR command LIKE '%refresh_buyer_interest_edges%'
   OR command LIKE '%refresh_merchant_similarity%'
   OR command LIKE '%refresh_logistics_routes%';

SELECT cron.schedule(
  'refresh_regional_demand_signals',
  '2-59/30 * * * *',
  $$SELECT public.refresh_regional_demand_signals()$$
);

SELECT cron.schedule(
  'refresh_regional_supply_density',
  '3-59/30 * * * *',
  $$SELECT public.refresh_regional_supply_density()$$
);

SELECT cron.schedule(
  'refresh_market_gap_scores',
  '6-59/30 * * * *',
  $$SELECT public.refresh_market_gap_scores()$$
);

SELECT cron.schedule(
  'refresh_buyer_interest_edges',
  '9-59/30 * * * *',
  $$SELECT public.refresh_buyer_interest_edges()$$
);

SELECT cron.schedule(
  'refresh_merchant_similarity',
  '12-59/30 * * * *',
  $$SELECT public.refresh_merchant_similarity()$$
);

SELECT cron.schedule(
  'refresh_logistics_routes',
  '15-59/30 * * * *',
  $$SELECT public.refresh_logistics_routes()$$
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 16.  Row-level security
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.merchant_relationships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_demand_signals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_supply_density   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_gap_scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_interest_edges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_similarity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_routes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_requests        ENABLE ROW LEVEL SECURITY;

-- ── Public read tables ────────────────────────────────────────────────────────
-- Aggregated intelligence is not sensitive — buyers + merchants can read all.

DROP POLICY IF EXISTS "merchant_rel_public_read"      ON public.merchant_relationships;
CREATE POLICY "merchant_rel_public_read" ON public.merchant_relationships
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "demand_signals_public_read"    ON public.regional_demand_signals;
CREATE POLICY "demand_signals_public_read" ON public.regional_demand_signals
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "supply_density_public_read"    ON public.regional_supply_density;
CREATE POLICY "supply_density_public_read" ON public.regional_supply_density
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "market_gap_public_read"        ON public.market_gap_scores;
CREATE POLICY "market_gap_public_read" ON public.market_gap_scores
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "merchant_sim_public_read"      ON public.merchant_similarity;
CREATE POLICY "merchant_sim_public_read" ON public.merchant_similarity
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "logistics_public_read"         ON public.logistics_routes;
CREATE POLICY "logistics_public_read" ON public.logistics_routes
  FOR SELECT TO anon, authenticated USING (true);

-- ── buyer_interest_edges: per-buyer isolation ─────────────────────────────────
-- Profile buyers can only read their own edge set.
-- Session edges are not directly accessible via RLS (internal use only).

DROP POLICY IF EXISTS "buyer_interest_owner_read"     ON public.buyer_interest_edges;
CREATE POLICY "buyer_interest_owner_read" ON public.buyer_interest_edges
  FOR SELECT TO authenticated
  USING (buyer_type = 'profile' AND buyer_id = auth.uid()::text);

-- ── wholesale_requests ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "wholesale_open_read"           ON public.wholesale_requests;
CREATE POLICY "wholesale_open_read" ON public.wholesale_requests
  FOR SELECT TO anon, authenticated
  USING (status = 'open' OR (auth.uid() IS NOT NULL AND requester_id = auth.uid()));

DROP POLICY IF EXISTS "wholesale_owner_insert"        ON public.wholesale_requests;
CREATE POLICY "wholesale_owner_insert" ON public.wholesale_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "wholesale_owner_update"        ON public.wholesale_requests;
CREATE POLICY "wholesale_owner_update" ON public.wholesale_requests
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- 17.  Maintenance
-- ══════════════════════════════════════════════════════════════════════════════

-- Expire wholesale_requests that have passed their expiry date (daily at 04:00)
SELECT cron.schedule(
  'expire_wholesale_requests',
  '0 4 * * *',
  $$
    UPDATE public.wholesale_requests
    SET status = 'expired', updated_at = now()
    WHERE status = 'open' AND expires_at < now()
  $$
);

-- ══════════════════════════════════════════════════════════════════════════════
-- END 017_commerce_graph.sql
-- ══════════════════════════════════════════════════════════════════════════════
