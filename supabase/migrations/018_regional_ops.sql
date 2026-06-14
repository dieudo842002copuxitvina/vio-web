-- ── 018_regional_ops.sql ─────────────────────────────────────────────────────
-- Week 3.5: Regional Operating System.
--
-- Regional commerce operating intelligence — pure PostgreSQL, precomputed.
-- Zero runtime aggregation: every feed is an indexed read against a pre-built table.
--
-- Tables (9):
--   • regional_market_heatmaps       — demand/supply/liquidity/trust composite (0–100)
--   • regional_price_benchmarks      — Tukey-fenced price distribution per region
--   • inventory_pressure_scores      — shortage/oversupply detection per region
--   • seasonal_market_signals        — seasonal multipliers per (category, month)
--   • merchant_operations_metrics    — listing quality, CRM efficiency, op score
--   • supply_routing_edges           — category-level supply→demand routing graph
--   • market_events                  — append-only regional event log
--   • regional_market_summary        — denormalized read-optimised summary table
--   • economic_telemetry             — daily per-province commerce pulse (90-day rolling)
--
-- Required aggregation functions (5):
--   • refresh_market_heatmaps()          — reads pre-aggregated tables
--   • refresh_price_benchmarks()         — reads listings
--   • refresh_inventory_pressure()       — reads pre-aggregated tables
--   • refresh_supply_routes()            — reads pre-aggregated tables
--   • refresh_economic_telemetry()       — SECURITY DEFINER (reads listing_events)
--
-- Bonus aggregation functions (4):
--   • refresh_merchant_operations_metrics() — SECURITY DEFINER (listing_events + crm_leads)
--   • refresh_seasonal_signals()            — SECURITY DEFINER (listing_events)
--   • refresh_market_summary()             — reads pre-aggregated tables
--   • detect_market_events()               — reads pre-aggregated tables
--
-- pg_cron slots (new — no conflicts with migrations 008–017):
--   :04/:34  refresh_price_benchmarks
--   :07/:37  refresh_inventory_pressure
--   :10/:40  refresh_market_heatmaps
--   :13/:43  refresh_economic_telemetry
--   :16/:46  refresh_supply_routes
--   :18/:48  refresh_merchant_operations_metrics
--   :19/:49  refresh_seasonal_signals
--   :20/:50  refresh_market_summary
--   :22/:52  detect_market_events
--
-- Market intelligence formulas (documented inline):
--   heat_index       = demand×30 + scarcity×25 + liquidity×30 + trust×15
--   pressure_score   = (supply−demand) / (supply+demand)  [−1=shortage, +1=oversupply]
--   flow_strength    = demand_magnitude × supply_availability_ratio
--   liquidity_score  = inquiries_7d / GREATEST(1, active_listing_count)
--   price_trend_7d   = avg_price_7d / GREATEST(0.01, avg_price_30d)
--   seasonal_mult    = month_avg_activity / annual_avg_activity
--
-- Depends on: migrations 001–017
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE / DROP IF EXISTS throughout.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  regional_market_heatmaps
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Four-component heat index (0–100):
--   demand_component    (×30) = LEAST(1, demand_score / 10.0)
--   scarcity_component  (×25) = GREATEST(0, −pressure_score)   [shortage = heat]
--   liquidity_component (×30) = LEAST(1, LN(1 + liquidity_score) / LN(6))
--   trust_component     (×15) = avg_merchant_trust / 100.0
--
-- heat_tier:
--   hot  ≥ 70   warm  ≥ 40   cool  ≥ 20   cold < 20

CREATE TABLE IF NOT EXISTS public.regional_market_heatmaps (
  province_id          integer      NOT NULL,
  category_id          integer      NOT NULL,

  -- Normalised components (0–1 each)
  demand_component     numeric(5,4) NOT NULL DEFAULT 0,
  scarcity_component   numeric(5,4) NOT NULL DEFAULT 0,
  liquidity_component  numeric(5,4) NOT NULL DEFAULT 0,
  trust_component      numeric(5,4) NOT NULL DEFAULT 0,

  -- Underlying raw metrics
  demand_score         numeric(8,4) NOT NULL DEFAULT 0,
  liquidity_score      numeric(8,4) NOT NULL DEFAULT 0,  -- inquiries / active_listings
  avg_trust_score      numeric(5,1),
  pressure_score       numeric(5,4),                     -- from inventory_pressure_scores

  -- Composite (0–100)
  heat_index           numeric(5,1) NOT NULL DEFAULT 0,
  heat_tier            text         NOT NULL DEFAULT 'cold'
                         CHECK (heat_tier IN ('hot','warm','cool','cold')),

  updated_at           timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (province_id, category_id)
);

CREATE INDEX IF NOT EXISTS heatmap_heat_index_idx
  ON public.regional_market_heatmaps (heat_index DESC);

CREATE INDEX IF NOT EXISTS heatmap_tier_idx
  ON public.regional_market_heatmaps (heat_tier, heat_index DESC);

CREATE INDEX IF NOT EXISTS heatmap_province_idx
  ON public.regional_market_heatmaps (province_id, heat_index DESC);

CREATE INDEX IF NOT EXISTS heatmap_liquidity_idx
  ON public.regional_market_heatmaps (liquidity_score DESC)
  WHERE heat_tier IN ('hot','warm');

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  regional_price_benchmarks
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Tukey fence for outlier detection:
--   IQR            = p75 − p25
--   fence_low      = p25 − 1.5 × IQR
--   fence_high     = p75 + 1.5 × IQR
--
-- price_trend_7d = avg_price_7d / GREATEST(0.01, avg_price_30d)
--   > 1.0 = prices rising;  < 1.0 = prices falling

CREATE TABLE IF NOT EXISTS public.regional_price_benchmarks (
  province_id       integer      NOT NULL,
  category_id       integer      NOT NULL,

  -- Distribution
  price_count       integer      NOT NULL DEFAULT 0,
  avg_price         numeric(14,2),
  median_price      numeric(14,2),
  p25_price         numeric(14,2),
  p75_price         numeric(14,2),

  -- Tukey outlier fences
  fence_low         numeric(14,2),
  fence_high        numeric(14,2),

  -- Trend
  avg_price_7d      numeric(14,2),
  avg_price_30d     numeric(14,2),
  price_trend_7d    numeric(6,4)  NOT NULL DEFAULT 1.0,

  updated_at        timestamptz   NOT NULL DEFAULT now(),

  PRIMARY KEY (province_id, category_id)
);

CREATE INDEX IF NOT EXISTS price_benchmark_province_idx
  ON public.regional_price_benchmarks (province_id, category_id);

CREATE INDEX IF NOT EXISTS price_trend_idx
  ON public.regional_price_benchmarks (price_trend_7d DESC)
  WHERE price_count >= 3;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  inventory_pressure_scores
-- ══════════════════════════════════════════════════════════════════════════════
--
-- pressure_score = (supply_score − demand_score) / (supply_score + demand_score)
--   range: −1.0 (pure shortage) to +1.0 (pure oversupply)
--
-- shortage_flag  = pressure_score < −0.30
-- oversupply_flag = pressure_score > 0.30
--
-- days_supply = active_listing_count / GREATEST(0.1, inquiries_7d / 7.0)
--   capped at 365 — days until inventory is exhausted at current inquiry rate

CREATE TABLE IF NOT EXISTS public.inventory_pressure_scores (
  province_id      integer      NOT NULL,
  category_id      integer      NOT NULL,

  demand_score     numeric(8,4) NOT NULL DEFAULT 0,
  supply_score     numeric(8,4) NOT NULL DEFAULT 0,
  pressure_score   numeric(5,4) NOT NULL DEFAULT 0,

  active_listing_count integer  NOT NULL DEFAULT 0,
  inquiries_7d         integer  NOT NULL DEFAULT 0,
  days_supply          numeric(6,1),   -- NULL when inquiries_7d = 0

  shortage_flag    boolean      NOT NULL DEFAULT false,
  oversupply_flag  boolean      NOT NULL DEFAULT false,

  updated_at       timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (province_id, category_id)
);

-- Shortage feed (most severe shortage first)
CREATE INDEX IF NOT EXISTS inventory_shortage_idx
  ON public.inventory_pressure_scores (pressure_score ASC)
  WHERE shortage_flag = true;

-- Oversupply feed
CREATE INDEX IF NOT EXISTS inventory_oversupply_idx
  ON public.inventory_pressure_scores (pressure_score DESC)
  WHERE oversupply_flag = true;

-- Province pressure overview
CREATE INDEX IF NOT EXISTS inventory_province_idx
  ON public.inventory_pressure_scores (province_id, pressure_score ASC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  seasonal_market_signals
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Per (category_id, month_of_year) — no province dimension (agricultural cycles
-- are broadly consistent nationwide; add province later if needed).
--
-- seasonal_multiplier = weighted composite of inquiry, search, listing multipliers:
--   seasonal_multiplier = inquiry_multiplier × 0.50
--                       + search_multiplier  × 0.30
--                       + listing_multiplier × 0.20
--
-- Multiplier = month_avg / annual_avg.
--   > 1.0 = above-average activity for this month
--   < 1.0 = below-average (off-season)
--
-- observation_count = number of calendar months observed (used to flag sparse data).
-- When < 3 observations, seasonal_multiplier defaults to 1.0 (no signal).

CREATE TABLE IF NOT EXISTS public.seasonal_market_signals (
  category_id           integer      NOT NULL,
  month_of_year         smallint     NOT NULL CHECK (month_of_year BETWEEN 1 AND 12),

  avg_inquiries         numeric(10,2) NOT NULL DEFAULT 0,
  avg_searches          numeric(10,2) NOT NULL DEFAULT 0,
  avg_listings          numeric(10,2) NOT NULL DEFAULT 0,

  inquiry_multiplier    numeric(6,4)  NOT NULL DEFAULT 1.0,
  search_multiplier     numeric(6,4)  NOT NULL DEFAULT 1.0,
  listing_multiplier    numeric(6,4)  NOT NULL DEFAULT 1.0,

  seasonal_multiplier   numeric(6,4)  NOT NULL DEFAULT 1.0,

  observation_count     integer       NOT NULL DEFAULT 0,

  updated_at            timestamptz   NOT NULL DEFAULT now(),

  PRIMARY KEY (category_id, month_of_year)
);

-- Current-month lookup (used in market_summary to annotate with seasonal context)
CREATE INDEX IF NOT EXISTS seasonal_month_idx
  ON public.seasonal_market_signals (month_of_year, seasonal_multiplier DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  merchant_operations_metrics
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Operational quality score (0–100):
--   response_score   (×30) = EXP(−avg_response_hours / 24.0) × 30
--   refresh_score    (×20) = LEAST(1, listing_refresh_rate_7d) × 20
--   quality_score    (×25) = avg of photo_score (0–1) + desc_score (0–1) / 2 × 25
--   crm_score        (×25) = avg(contact_rate, advance_rate) × 25
--
-- primary_province_id = province where merchant has the most active listings.

CREATE TABLE IF NOT EXISTS public.merchant_operations_metrics (
  profile_id               uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Listing quality proxies
  avg_photos_per_listing   numeric(6,2) NOT NULL DEFAULT 0,
  avg_description_length   integer      NOT NULL DEFAULT 0,  -- characters
  listing_refresh_rate_7d  numeric(6,4) NOT NULL DEFAULT 0,  -- fraction of listings updated in 7d

  -- CRM efficiency
  inquiry_contact_rate     numeric(5,4) NOT NULL DEFAULT 0,  -- leads contacted / total leads
  lead_advance_rate        numeric(5,4) NOT NULL DEFAULT 0,  -- leads beyond 'new' / total leads

  -- Response (synced from merchant_metrics for operational view)
  avg_response_hours       numeric(8,2) NOT NULL DEFAULT 0,

  -- Operational score (0–100)
  operational_score        numeric(5,1) NOT NULL DEFAULT 0,

  -- Geographic context
  primary_province_id      integer,
  active_listing_count     integer      NOT NULL DEFAULT 0,

  updated_at               timestamptz  NOT NULL DEFAULT now()
);

-- Regional quality leaderboard
CREATE INDEX IF NOT EXISTS ops_province_score_idx
  ON public.merchant_operations_metrics (primary_province_id, operational_score DESC)
  WHERE operational_score > 0;

-- Global quality ranking
CREATE INDEX IF NOT EXISTS ops_score_idx
  ON public.merchant_operations_metrics (operational_score DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  supply_routing_edges
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Category-specific supply→demand routing.  Unlike logistics_routes (which tracks
-- observed buyer cross-province patterns), these edges represent *suggested*
-- supply flows derived from surplus/deficit analysis.
--
-- flow_strength = demand_magnitude × supply_availability_ratio
--   demand_magnitude       = LEAST(1, LN(1+dest_demand_score) / LN(11))
--   supply_availability    = LEAST(1, source_supply_score / GREATEST(0.1, dest_demand_score))
--
-- Bounded at runtime: at most 5 destination provinces per (source, category).

CREATE TABLE IF NOT EXISTS public.supply_routing_edges (
  source_province_id       integer      NOT NULL,
  destination_province_id  integer      NOT NULL,
  category_id              integer      NOT NULL,

  source_supply_score      numeric(8,4) NOT NULL DEFAULT 0,
  source_active_listings   integer      NOT NULL DEFAULT 0,
  source_merchant_count    integer      NOT NULL DEFAULT 0,

  dest_demand_score        numeric(8,4) NOT NULL DEFAULT 0,

  flow_strength            numeric(6,4) NOT NULL DEFAULT 0,
  is_deficit_route         boolean      NOT NULL DEFAULT false,
  is_surplus_route         boolean      NOT NULL DEFAULT false,

  updated_at               timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (source_province_id, destination_province_id, category_id),
  CONSTRAINT supply_route_no_self_loop CHECK (source_province_id <> destination_province_id)
);

-- Inbound: "which sources can supply my province for this category?"
CREATE INDEX IF NOT EXISTS supply_route_dest_idx
  ON public.supply_routing_edges (destination_province_id, category_id, flow_strength DESC)
  WHERE is_deficit_route = true;

-- Outbound: "where can I sell my surplus?"
CREATE INDEX IF NOT EXISTS supply_route_source_idx
  ON public.supply_routing_edges (source_province_id, category_id, flow_strength DESC)
  WHERE is_surplus_route = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  market_events
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Append-only log of detected regional market events.
-- Events auto-expire after 14 days.
-- Deduplication guard: no two events of same (type, province, category) within 24 h.

CREATE TABLE IF NOT EXISTS public.market_events (
  id              bigserial    PRIMARY KEY,

  event_type      text         NOT NULL
                    CHECK (event_type IN (
                      'demand_spike', 'shortage_alert', 'oversupply_warning',
                      'new_market_opened', 'seasonal_peak', 'price_anomaly',
                      'high_liquidity', 'trust_drop'
                    )),

  province_id     integer,
  category_id     integer,

  severity        text         NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low','medium','high','critical')),

  trigger_value   numeric(10,4),   -- metric value that fired the event
  baseline_value  numeric(10,4),   -- baseline it was compared against

  metadata        jsonb        NOT NULL DEFAULT '{}',
  detected_at     timestamptz  NOT NULL DEFAULT now(),
  expires_at      timestamptz  NOT NULL DEFAULT now() + interval '14 days'
);

-- Active events by type (discovery feed)
CREATE INDEX IF NOT EXISTS market_events_type_idx
  ON public.market_events (event_type, detected_at DESC)
  WHERE expires_at > now();

-- Regional event feed
CREATE INDEX IF NOT EXISTS market_events_region_idx
  ON public.market_events (province_id, category_id, detected_at DESC)
  WHERE expires_at > now();

-- Severity filter (critical → high first)
CREATE INDEX IF NOT EXISTS market_events_severity_idx
  ON public.market_events (severity, detected_at DESC)
  WHERE expires_at > now();

-- Dedup guard index
CREATE INDEX IF NOT EXISTS market_events_dedup_idx
  ON public.market_events (event_type, province_id, category_id, detected_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8.  regional_market_summary
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Denormalised read-optimised summary per (province_id, category_id).
-- Pre-joins heatmap + price + pressure + seasonal + gap into one row.
-- No joins required at read time — all dashboard queries are single-table reads.
--
-- market_status derivation:
--   hot_shortage  → heat_index ≥ 70 AND shortage_flag
--   hot_stable    → heat_index ≥ 70
--   growing       → heat_index ≥ 40 AND trend_7d > 1.2
--   stable        → heat_index ≥ 20
--   oversupplied  → pressure_score > 0.3
--   declining     → heat_index < 20 AND trend_7d < 0.8
--   cold          → otherwise

CREATE TABLE IF NOT EXISTS public.regional_market_summary (
  province_id        integer      NOT NULL,
  category_id        integer      NOT NULL,

  -- Heat
  heat_index         numeric(5,1) NOT NULL DEFAULT 0,
  heat_tier          text         NOT NULL DEFAULT 'cold',

  -- Demand
  demand_score       numeric(8,4) NOT NULL DEFAULT 0,
  trend_7d           numeric(6,4) NOT NULL DEFAULT 1.0,
  searches_7d        integer      NOT NULL DEFAULT 0,
  inquiries_7d       integer      NOT NULL DEFAULT 0,

  -- Supply
  supply_score       numeric(8,4) NOT NULL DEFAULT 0,
  active_listings    integer      NOT NULL DEFAULT 0,
  merchant_count     integer      NOT NULL DEFAULT 0,

  -- Price
  median_price       numeric(14,2),
  price_trend_7d     numeric(6,4)  NOT NULL DEFAULT 1.0,

  -- Pressure
  pressure_score     numeric(5,4)  NOT NULL DEFAULT 0,
  shortage_flag      boolean       NOT NULL DEFAULT false,
  days_supply        numeric(6,1),

  -- Gap opportunity
  opportunity_score  numeric(5,1)  NOT NULL DEFAULT 0,
  gap_tier           text          NOT NULL DEFAULT 'low',

  -- Seasonal context
  seasonal_multiplier numeric(6,4) NOT NULL DEFAULT 1.0,

  -- Composite status label
  market_status      text         NOT NULL DEFAULT 'cold'
                       CHECK (market_status IN (
                         'hot_shortage','hot_stable','growing','stable',
                         'oversupplied','declining','cold'
                       )),

  updated_at         timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (province_id, category_id)
);

-- Hot market global discovery feed
CREATE INDEX IF NOT EXISTS market_summary_heat_idx
  ON public.regional_market_summary (heat_index DESC);

-- Status-filtered discovery
CREATE INDEX IF NOT EXISTS market_summary_status_idx
  ON public.regional_market_summary (market_status, opportunity_score DESC);

-- Province overview: all categories sorted by heat
CREATE INDEX IF NOT EXISTS market_summary_province_idx
  ON public.regional_market_summary (province_id, heat_index DESC);

-- Shortage regions feed
CREATE INDEX IF NOT EXISTS market_summary_shortage_idx
  ON public.regional_market_summary (province_id, category_id)
  WHERE shortage_flag = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9.  economic_telemetry
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Daily commerce pulse per province — 90-day rolling window.
-- liquidity_index = inquiries / GREATEST(1, active_listings)  [per day]
-- inquiry_velocity = inquiries / 24.0                         [per hour]

CREATE TABLE IF NOT EXISTS public.economic_telemetry (
  province_id       integer      NOT NULL,
  telemetry_date    date         NOT NULL,

  -- Active commerce
  active_listings   integer      NOT NULL DEFAULT 0,
  new_listings      integer      NOT NULL DEFAULT 0,
  active_merchants  integer      NOT NULL DEFAULT 0,

  -- Demand flow
  searches          integer      NOT NULL DEFAULT 0,
  inquiries         integer      NOT NULL DEFAULT 0,
  inquiry_velocity  numeric(6,4) NOT NULL DEFAULT 0,  -- per hour

  -- Liquidity
  liquidity_index   numeric(6,4) NOT NULL DEFAULT 0,

  -- Trust
  avg_trust_score   numeric(5,1),

  updated_at        timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (province_id, telemetry_date)
);

-- Province time-series (chart data)
CREATE INDEX IF NOT EXISTS telemetry_province_date_idx
  ON public.economic_telemetry (province_id, telemetry_date DESC);

-- Cross-province: latest snapshot for each province
CREATE INDEX IF NOT EXISTS telemetry_latest_idx
  ON public.economic_telemetry (telemetry_date DESC, province_id);

-- Liquidity dashboard
CREATE INDEX IF NOT EXISTS telemetry_liquidity_idx
  ON public.economic_telemetry (liquidity_index DESC, telemetry_date DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 10.  refresh_price_benchmarks()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Source: public.listings only — no SECURITY DEFINER required.
-- percentile_cont excludes NULLs by design in PostgreSQL.
-- Minimum 3 priced listings required for meaningful percentiles.
--
-- Tukey fence:
--   IQR        = p75 − p25
--   fence_low  = p25 − 1.5 × IQR
--   fence_high = p75 + 1.5 × IQR

CREATE OR REPLACE FUNCTION public.refresh_price_benchmarks()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.regional_price_benchmarks (
    province_id, category_id,
    price_count, avg_price, median_price, p25_price, p75_price,
    fence_low, fence_high,
    avg_price_7d, avg_price_30d, price_trend_7d,
    updated_at
  )
  WITH priced_listings AS (
    SELECT
      province_id,
      category_id,
      price_amount,
      created_at
    FROM public.listings
    WHERE status             = 'published'
      AND is_public          = true
      AND moderation_status  = 'approved'
      AND price_amount       > 0
      AND province_id        IS NOT NULL
      AND category_id        IS NOT NULL
  ),
  distribution AS (
    SELECT
      province_id,
      category_id,
      COUNT(*)                                                         AS price_count,
      AVG(price_amount)                                                AS avg_price,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY price_amount)      AS median_price,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY price_amount)      AS p25_price,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY price_amount)      AS p75_price,
      AVG(price_amount) FILTER (WHERE created_at >= now() - interval '7 days')  AS avg_7d,
      AVG(price_amount) FILTER (WHERE created_at >= now() - interval '30 days') AS avg_30d
    FROM priced_listings
    GROUP BY province_id, category_id
    HAVING COUNT(*) >= 3  -- need at least 3 data points for meaningful percentiles
  )
  SELECT
    province_id,
    category_id,
    price_count,
    ROUND(avg_price::numeric, 2),
    ROUND(median_price::numeric, 2),
    ROUND(p25_price::numeric, 2),
    ROUND(p75_price::numeric, 2),
    -- Tukey fences
    ROUND((p25_price - 1.5 * (p75_price - p25_price))::numeric, 2)  AS fence_low,
    ROUND((p75_price + 1.5 * (p75_price - p25_price))::numeric, 2)  AS fence_high,
    ROUND(avg_7d::numeric,  2)                                        AS avg_price_7d,
    ROUND(avg_30d::numeric, 2)                                        AS avg_price_30d,
    ROUND((avg_7d / GREATEST(0.01, avg_30d))::numeric, 4)            AS price_trend_7d,
    now()
  FROM distribution

  ON CONFLICT (province_id, category_id) DO UPDATE SET
    price_count      = EXCLUDED.price_count,
    avg_price        = EXCLUDED.avg_price,
    median_price     = EXCLUDED.median_price,
    p25_price        = EXCLUDED.p25_price,
    p75_price        = EXCLUDED.p75_price,
    fence_low        = EXCLUDED.fence_low,
    fence_high       = EXCLUDED.fence_high,
    avg_price_7d     = EXCLUDED.avg_price_7d,
    avg_price_30d    = EXCLUDED.avg_price_30d,
    price_trend_7d   = EXCLUDED.price_trend_7d,
    updated_at       = EXCLUDED.updated_at;

  DELETE FROM public.regional_price_benchmarks
  WHERE updated_at < now() - interval '48 hours';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 11.  refresh_inventory_pressure()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Requires: regional_demand_signals (:02) and regional_supply_density (:03).
-- Runs at :07 — both dependencies are guaranteed complete.
--
-- pressure_score = (supply_score − demand_score) / (supply_score + demand_score)
--   −1.0 = pure demand, no supply (critical shortage)
--    0.0 = balanced
--   +1.0 = pure supply, no demand (severe oversupply)
--
-- days_supply = active_listing_count / (inquiries_7d / 7.0)
--   Represents: at the current inquiry rate, how many days until all listings
--   receive at least one inquiry.  Not a sell-through rate, but a liquidity proxy.

CREATE OR REPLACE FUNCTION public.refresh_inventory_pressure()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory_pressure_scores (
    province_id, category_id,
    demand_score, supply_score, pressure_score,
    active_listing_count, inquiries_7d, days_supply,
    shortage_flag, oversupply_flag,
    updated_at
  )
  WITH all_regions AS (
    SELECT province_id, category_id FROM public.regional_demand_signals
    UNION
    SELECT province_id, category_id FROM public.regional_supply_density
  ),
  joined AS (
    SELECT
      ar.province_id,
      ar.category_id,
      COALESCE(d.demand_score,         0) AS demand_score,
      COALESCE(s.supply_score,         0) AS supply_score,
      COALESCE(s.active_listing_count, 0) AS active_listing_count,
      COALESCE(d.inquiries_7d,         0) AS inquiries_7d
    FROM all_regions ar
    LEFT JOIN public.regional_demand_signals d
      ON d.province_id = ar.province_id AND d.category_id = ar.category_id
    LEFT JOIN public.regional_supply_density s
      ON s.province_id = ar.province_id AND s.category_id = ar.category_id
  ),
  scored AS (
    SELECT
      province_id,
      category_id,
      demand_score,
      supply_score,
      active_listing_count,
      inquiries_7d,
      -- Pressure: positive = oversupply, negative = shortage
      ROUND(
        (supply_score - demand_score) /
        GREATEST(0.1, supply_score + demand_score)
      ::numeric, 4)                                                 AS pressure_score,
      -- Days supply: capped at 365
      CASE WHEN inquiries_7d > 0
        THEN LEAST(365.0, ROUND(
          active_listing_count::numeric / GREATEST(0.1, inquiries_7d / 7.0), 1
        ))
        ELSE NULL
      END                                                           AS days_supply
    FROM joined
  )
  SELECT
    province_id,
    category_id,
    demand_score,
    supply_score,
    pressure_score,
    active_listing_count,
    inquiries_7d,
    days_supply,
    pressure_score < -0.30  AS shortage_flag,
    pressure_score >  0.30  AS oversupply_flag,
    now()
  FROM scored

  ON CONFLICT (province_id, category_id) DO UPDATE SET
    demand_score          = EXCLUDED.demand_score,
    supply_score          = EXCLUDED.supply_score,
    pressure_score        = EXCLUDED.pressure_score,
    active_listing_count  = EXCLUDED.active_listing_count,
    inquiries_7d          = EXCLUDED.inquiries_7d,
    days_supply           = EXCLUDED.days_supply,
    shortage_flag         = EXCLUDED.shortage_flag,
    oversupply_flag       = EXCLUDED.oversupply_flag,
    updated_at            = EXCLUDED.updated_at;

  DELETE FROM public.inventory_pressure_scores
  WHERE updated_at < now() - interval '48 hours';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12.  refresh_market_heatmaps()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Requires: regional_demand_signals (:02), regional_supply_density (:03),
--           merchant_trust_scores (:08), inventory_pressure_scores (:07).
-- Runs at :10.
--
-- heat_index = demand_component × 30
--            + scarcity_component × 25   [shortage → scarcity_component high]
--            + liquidity_component × 30
--            + trust_component × 15
--
-- demand_component    = LEAST(1, demand_score / 10.0)
-- scarcity_component  = GREATEST(0, −pressure_score)   [range 0–1]
-- liquidity_component = LEAST(1, LN(1 + liquidity_score) / LN(6))
-- trust_component     = COALESCE(avg_trust, 50) / 100.0

CREATE OR REPLACE FUNCTION public.refresh_market_heatmaps()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.regional_market_heatmaps (
    province_id, category_id,
    demand_component, scarcity_component, liquidity_component, trust_component,
    demand_score, liquidity_score, avg_trust_score, pressure_score,
    heat_index, heat_tier,
    updated_at
  )
  WITH all_regions AS (
    SELECT province_id, category_id FROM public.regional_demand_signals
    UNION
    SELECT province_id, category_id FROM public.regional_supply_density
  ),
  -- Average trust score per (province, category) from active non-fraudulent merchants
  trust_by_region AS (
    SELECT
      l.province_id,
      l.category_id,
      AVG(mts.trust_score) AS avg_trust
    FROM public.listings l
    JOIN public.merchant_trust_scores mts ON mts.profile_id = l.owner_id
    WHERE l.status = 'published'
      AND l.is_public = true
      AND NOT mts.fraud_flag
      AND l.province_id IS NOT NULL
      AND l.category_id IS NOT NULL
    GROUP BY l.province_id, l.category_id
  ),
  base AS (
    SELECT
      ar.province_id,
      ar.category_id,
      COALESCE(d.demand_score,         0)           AS demand_score,
      COALESCE(s.active_listing_count, 0)           AS active_listing_count,
      COALESCE(d.inquiries_7d,         0)           AS inquiries_7d,
      COALESCE(ip.pressure_score,      0)           AS pressure_score,
      tr.avg_trust
    FROM all_regions ar
    LEFT JOIN public.regional_demand_signals  d  ON d.province_id  = ar.province_id AND d.category_id  = ar.category_id
    LEFT JOIN public.regional_supply_density  s  ON s.province_id  = ar.province_id AND s.category_id  = ar.category_id
    LEFT JOIN public.inventory_pressure_scores ip ON ip.province_id = ar.province_id AND ip.category_id = ar.category_id
    LEFT JOIN trust_by_region                 tr ON tr.province_id  = ar.province_id AND tr.category_id  = ar.category_id
  ),
  components AS (
    SELECT
      province_id,
      category_id,
      demand_score,
      pressure_score,
      -- liquidity_score = inquiries / listings (raw; normalized below)
      (inquiries_7d::float / GREATEST(1, active_listing_count))::numeric(8,4) AS liquidity_score,
      avg_trust,
      -- Component scores (0–1 each)
      LEAST(1.0, demand_score / 10.0)::numeric(5,4)                           AS demand_component,
      GREATEST(0.0, -pressure_score)::numeric(5,4)                            AS scarcity_component,
      LEAST(1.0, LN(1.0 + (inquiries_7d::float / GREATEST(1, active_listing_count))) / LN(6.0))
                                                              ::numeric(5,4)   AS liquidity_component,
      (COALESCE(avg_trust, 50.0) / 100.0)::numeric(5,4)                       AS trust_component
    FROM base
  )
  SELECT
    province_id,
    category_id,
    demand_component,
    scarcity_component,
    liquidity_component,
    trust_component,
    demand_score,
    liquidity_score,
    ROUND(avg_trust::numeric, 1)                                  AS avg_trust_score,
    pressure_score,
    -- heat_index (0–100)
    ROUND((
        demand_component    * 30.0
      + scarcity_component  * 25.0
      + liquidity_component * 30.0
      + trust_component     * 15.0
    )::numeric, 1)                                                AS heat_index,
    CASE
      WHEN (demand_component*30 + scarcity_component*25 + liquidity_component*30 + trust_component*15) >= 70
                                                   THEN 'hot'
      WHEN (demand_component*30 + scarcity_component*25 + liquidity_component*30 + trust_component*15) >= 40
                                                   THEN 'warm'
      WHEN (demand_component*30 + scarcity_component*25 + liquidity_component*30 + trust_component*15) >= 20
                                                   THEN 'cool'
      ELSE                                              'cold'
    END                                                           AS heat_tier,
    now()
  FROM components

  ON CONFLICT (province_id, category_id) DO UPDATE SET
    demand_component    = EXCLUDED.demand_component,
    scarcity_component  = EXCLUDED.scarcity_component,
    liquidity_component = EXCLUDED.liquidity_component,
    trust_component     = EXCLUDED.trust_component,
    demand_score        = EXCLUDED.demand_score,
    liquidity_score     = EXCLUDED.liquidity_score,
    avg_trust_score     = EXCLUDED.avg_trust_score,
    pressure_score      = EXCLUDED.pressure_score,
    heat_index          = EXCLUDED.heat_index,
    heat_tier           = EXCLUDED.heat_tier,
    updated_at          = EXCLUDED.updated_at;

  DELETE FROM public.regional_market_heatmaps
  WHERE updated_at < now() - interval '48 hours';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 13.  refresh_economic_telemetry()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- SECURITY DEFINER — reads listing_events (no public SELECT policy).
-- Inserts/updates one row per province for TODAY (CURRENT_DATE UTC).
-- Prunes rows older than 90 days.
--
-- liquidity_index = inquiries / GREATEST(1, active_listings)  [per day]
-- inquiry_velocity = inquiries / 24.0                         [per hour]

CREATE OR REPLACE FUNCTION public.refresh_economic_telemetry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.economic_telemetry (
    province_id, telemetry_date,
    active_listings, new_listings, active_merchants,
    searches, inquiries, inquiry_velocity, liquidity_index,
    avg_trust_score,
    updated_at
  )
  WITH listing_snap AS (
    SELECT
      province_id,
      COUNT(*)                                                           AS active_listings,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)                AS new_listings,
      COUNT(DISTINCT owner_id)                                           AS active_merchants
    FROM public.listings
    WHERE status = 'published' AND is_public = true AND moderation_status = 'approved'
      AND province_id IS NOT NULL
    GROUP BY province_id
  ),
  search_snap AS (
    SELECT
      province_id,
      COUNT(*) AS searches_today
    FROM public.search_queries
    WHERE created_at >= CURRENT_DATE
      AND province_id IS NOT NULL
    GROUP BY province_id
  ),
  event_snap AS (
    SELECT
      l.province_id,
      COUNT(*) FILTER (WHERE e.event_type = 'inquiry') AS inquiries_today
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.created_at >= CURRENT_DATE
      AND l.province_id IS NOT NULL
    GROUP BY l.province_id
  ),
  trust_snap AS (
    SELECT
      l.province_id,
      AVG(mts.trust_score) FILTER (WHERE NOT mts.fraud_flag) AS avg_trust
    FROM public.listings l
    JOIN public.merchant_trust_scores mts ON mts.profile_id = l.owner_id
    WHERE l.status = 'published' AND l.province_id IS NOT NULL
    GROUP BY l.province_id
  ),
  all_provinces AS (
    SELECT province_id FROM listing_snap
    UNION
    SELECT province_id FROM search_snap
    UNION
    SELECT province_id FROM event_snap
  )
  SELECT
    ap.province_id,
    CURRENT_DATE,
    COALESCE(ls.active_listings,  0)                                    AS active_listings,
    COALESCE(ls.new_listings,     0)                                    AS new_listings,
    COALESCE(ls.active_merchants, 0)                                    AS active_merchants,
    COALESCE(ss.searches_today,   0)                                    AS searches,
    COALESCE(es.inquiries_today,  0)                                    AS inquiries,
    ROUND((COALESCE(es.inquiries_today, 0)::numeric / 24.0), 4)        AS inquiry_velocity,
    ROUND((COALESCE(es.inquiries_today, 0)::numeric /
           GREATEST(1, COALESCE(ls.active_listings, 1))), 4)           AS liquidity_index,
    ROUND(ts.avg_trust::numeric, 1)                                     AS avg_trust_score,
    now()
  FROM all_provinces ap
  LEFT JOIN listing_snap ls ON ls.province_id = ap.province_id
  LEFT JOIN search_snap  ss ON ss.province_id = ap.province_id
  LEFT JOIN event_snap   es ON es.province_id = ap.province_id
  LEFT JOIN trust_snap   ts ON ts.province_id = ap.province_id

  ON CONFLICT (province_id, telemetry_date) DO UPDATE SET
    active_listings  = EXCLUDED.active_listings,
    new_listings     = EXCLUDED.new_listings,
    active_merchants = EXCLUDED.active_merchants,
    searches         = EXCLUDED.searches,
    inquiries        = EXCLUDED.inquiries,
    inquiry_velocity = EXCLUDED.inquiry_velocity,
    liquidity_index  = EXCLUDED.liquidity_index,
    avg_trust_score  = EXCLUDED.avg_trust_score,
    updated_at       = EXCLUDED.updated_at;

  -- 90-day rolling window
  DELETE FROM public.economic_telemetry
  WHERE telemetry_date < CURRENT_DATE - interval '90 days';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 14.  refresh_supply_routes()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Requires: regional_supply_density (:03) and regional_demand_signals (:02).
-- Identifies category-specific surplus provinces and deficit provinces,
-- then pairs them as supply routing edges.
--
-- Bounded cross-join: only top-5 deficit destinations per (source, category).
--
-- flow_strength = demand_magnitude × supply_availability_ratio
--   demand_magnitude   = LEAST(1, LN(1 + dest_demand_score) / LN(11))
--   supply_availability = LEAST(1, source_supply_score / GREATEST(0.1, dest_demand_score))

CREATE OR REPLACE FUNCTION public.refresh_supply_routes()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.supply_routing_edges (
    source_province_id, destination_province_id, category_id,
    source_supply_score, source_active_listings, source_merchant_count,
    dest_demand_score,
    flow_strength, is_deficit_route, is_surplus_route,
    updated_at
  )
  WITH surplus_sources AS (
    -- Provinces with clear supply surplus: supply_score > demand_score + 1.0
    SELECT
      rsd.province_id,
      rsd.category_id,
      rsd.supply_score,
      rsd.active_listing_count,
      rsd.merchant_count
    FROM public.regional_supply_density rsd
    JOIN public.regional_demand_signals rds
      ON rds.province_id = rsd.province_id AND rds.category_id = rsd.category_id
    WHERE rsd.supply_score > rds.demand_score + 1.0
      AND rsd.supply_score >= 1.0             -- has actual supply
  ),
  deficit_dests AS (
    -- Provinces with clear demand deficit: demand_score > supply_score + 1.0
    SELECT
      rds.province_id,
      rds.category_id,
      rds.demand_score
    FROM public.regional_demand_signals rds
    LEFT JOIN public.regional_supply_density rsd
      ON rsd.province_id = rds.province_id AND rsd.category_id = rds.category_id
    WHERE rds.demand_score > COALESCE(rsd.supply_score, 0) + 1.0
      AND rds.demand_score >= 1.0             -- has actual demand
  ),
  -- Cross-join same category; rank by dest demand to bound to top-5 per source
  ranked_routes AS (
    SELECT
      ss.province_id     AS source_province_id,
      dd.province_id     AS dest_province_id,
      ss.category_id,
      ss.supply_score,
      ss.active_listing_count,
      ss.merchant_count,
      dd.demand_score,
      ROW_NUMBER() OVER (
        PARTITION BY ss.province_id, ss.category_id
        ORDER BY dd.demand_score DESC
      )                  AS dest_rank
    FROM surplus_sources ss
    JOIN deficit_dests dd
      ON dd.category_id  = ss.category_id
      AND dd.province_id <> ss.province_id
  )
  SELECT
    source_province_id,
    dest_province_id,
    category_id,
    supply_score,
    active_listing_count,
    merchant_count,
    demand_score,
    -- flow_strength: demand magnitude capped by supply availability
    ROUND((
      LEAST(1.0, LN(1.0 + demand_score)   / LN(11.0)) *
      LEAST(1.0, supply_score / GREATEST(0.1, demand_score))
    )::numeric, 4)                                                     AS flow_strength,
    true                                                               AS is_deficit_route,
    true                                                               AS is_surplus_route,
    now()
  FROM ranked_routes
  WHERE dest_rank <= 5   -- bound: at most 5 destinations per (source, category)

  ON CONFLICT (source_province_id, destination_province_id, category_id) DO UPDATE SET
    source_supply_score    = EXCLUDED.source_supply_score,
    source_active_listings = EXCLUDED.source_active_listings,
    source_merchant_count  = EXCLUDED.source_merchant_count,
    dest_demand_score      = EXCLUDED.dest_demand_score,
    flow_strength          = EXCLUDED.flow_strength,
    is_deficit_route       = EXCLUDED.is_deficit_route,
    is_surplus_route       = EXCLUDED.is_surplus_route,
    updated_at             = EXCLUDED.updated_at;

  -- Prune routes where underlying supply/demand has balanced out
  DELETE FROM public.supply_routing_edges
  WHERE updated_at < now() - interval '48 hours';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 15.  refresh_merchant_operations_metrics()  [BONUS]
-- ══════════════════════════════════════════════════════════════════════════════
--
-- SECURITY DEFINER — aggregates crm_leads across all merchants (bypasses owner-only RLS).
--
-- operational_score = response_score×30 + refresh_score×20 + quality_score×25 + crm_score×25
--   response_score  = EXP(−avg_response_hours / 24.0) × 30
--   refresh_score   = LEAST(1, listing_refresh_rate_7d) × 20
--   quality_score   = (photo_norm + desc_norm) / 2 × 25
--     photo_norm = LEAST(1, avg_photos / 5.0)     [5 photos = perfect score]
--     desc_norm  = LEAST(1, avg_desc_chars / 300)  [300 chars = full score]
--   crm_score       = (contact_rate + advance_rate) / 2 × 25

CREATE OR REPLACE FUNCTION public.refresh_merchant_operations_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchant_operations_metrics (
    profile_id,
    avg_photos_per_listing, avg_description_length, listing_refresh_rate_7d,
    inquiry_contact_rate, lead_advance_rate, avg_response_hours,
    operational_score, primary_province_id, active_listing_count,
    updated_at
  )
  WITH listing_quality AS (
    SELECT
      owner_id,
      -- Photos: coalesce metadata->>'photo_count' if available, else estimate from cover_url
      AVG(
        CASE WHEN cover_url IS NOT NULL THEN 1.0 ELSE 0.0 END
      )                                                            AS avg_photos,
      AVG(LENGTH(COALESCE(description, '')))                       AS avg_desc_len,
      COUNT(*)                                                     AS listing_count,
      COUNT(*) FILTER (WHERE updated_at >= now() - interval '7 days')
        ::float / NULLIF(COUNT(*), 0)                              AS refresh_rate_7d
    FROM public.listings
    WHERE status = 'published' AND is_public = true AND moderation_status = 'approved'
    GROUP BY owner_id
  ),
  crm_efficiency AS (
    SELECT
      owner_id,
      COUNT(*) FILTER (WHERE stage != 'new')::float /
        NULLIF(COUNT(*), 0)                                        AS contact_rate,
      COUNT(*) FILTER (WHERE stage NOT IN ('new','lost'))::float /
        NULLIF(COUNT(*), 0)                                        AS advance_rate
    FROM public.crm_leads
    GROUP BY owner_id
  ),
  primary_province AS (
    -- Province where merchant has the most active listings
    SELECT DISTINCT ON (owner_id)
      owner_id,
      province_id
    FROM public.listings
    WHERE status = 'published' AND is_public = true
      AND province_id IS NOT NULL
    GROUP BY owner_id, province_id
    ORDER BY owner_id, COUNT(*) DESC
  ),
  response_data AS (
    SELECT profile_id, avg_response_hours
    FROM public.merchant_metrics
  ),
  scored AS (
    SELECT
      lq.owner_id,
      COALESCE(lq.avg_photos,        0)                            AS avg_photos,
      ROUND(COALESCE(lq.avg_desc_len, 0)::numeric, 0)::integer     AS avg_desc_len,
      ROUND(COALESCE(lq.refresh_rate_7d, 0)::numeric, 4)          AS refresh_rate,
      COALESCE(ce.contact_rate,  0)                                AS contact_rate,
      COALESCE(ce.advance_rate,  0)                                AS advance_rate,
      COALESCE(rd.avg_response_hours, 48)                          AS avg_resp_h,
      lq.listing_count,
      pp.province_id
    FROM listing_quality lq
    LEFT JOIN crm_efficiency    ce ON ce.owner_id   = lq.owner_id
    LEFT JOIN primary_province  pp ON pp.owner_id   = lq.owner_id
    LEFT JOIN response_data     rd ON rd.profile_id = lq.owner_id
  )
  SELECT
    owner_id::uuid,
    ROUND(avg_photos::numeric, 2),
    avg_desc_len,
    refresh_rate,
    ROUND(contact_rate::numeric, 4),
    ROUND(advance_rate::numeric, 4),
    ROUND(avg_resp_h::numeric,   2),
    -- operational_score (0–100)
    ROUND((
      -- Response (30)
      EXP(-avg_resp_h / 24.0) * 30.0
      -- Listing refresh (20)
      + LEAST(1.0, refresh_rate) * 20.0
      -- Quality: photo + description (25)
      + (LEAST(1.0, avg_photos / 5.0) + LEAST(1.0, avg_desc_len::float / 300.0)) / 2.0 * 25.0
      -- CRM (25)
      + (contact_rate + advance_rate) / 2.0 * 25.0
    )::numeric, 1),
    province_id,
    listing_count,
    now()
  FROM scored

  ON CONFLICT (profile_id) DO UPDATE SET
    avg_photos_per_listing  = EXCLUDED.avg_photos_per_listing,
    avg_description_length  = EXCLUDED.avg_description_length,
    listing_refresh_rate_7d = EXCLUDED.listing_refresh_rate_7d,
    inquiry_contact_rate    = EXCLUDED.inquiry_contact_rate,
    lead_advance_rate       = EXCLUDED.lead_advance_rate,
    avg_response_hours      = EXCLUDED.avg_response_hours,
    operational_score       = EXCLUDED.operational_score,
    primary_province_id     = EXCLUDED.primary_province_id,
    active_listing_count    = EXCLUDED.active_listing_count,
    updated_at              = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 16.  refresh_seasonal_signals()  [BONUS]
-- ══════════════════════════════════════════════════════════════════════════════
--
-- SECURITY DEFINER — reads listing_events for inquiry seasonality.
-- Uses last 12 months of data; months with < 3 observations → multiplier = 1.0.
--
-- seasonal_multiplier = inquiry_mult×0.50 + search_mult×0.30 + listing_mult×0.20

CREATE OR REPLACE FUNCTION public.refresh_seasonal_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seasonal_market_signals (
    category_id, month_of_year,
    avg_inquiries, avg_searches, avg_listings,
    inquiry_multiplier, search_multiplier, listing_multiplier,
    seasonal_multiplier, observation_count,
    updated_at
  )
  WITH inquiry_monthly AS (
    SELECT
      l.category_id,
      EXTRACT(month FROM e.created_at)::smallint    AS mth,
      COUNT(*)                                       AS inquiry_count
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.event_type = 'inquiry'
      AND e.created_at >= now() - interval '12 months'
      AND l.category_id IS NOT NULL
    GROUP BY l.category_id, EXTRACT(month FROM e.created_at)
  ),
  search_monthly AS (
    SELECT
      category_id,
      EXTRACT(month FROM created_at)::smallint  AS mth,
      COUNT(*)                                   AS search_count
    FROM public.search_queries
    WHERE created_at >= now() - interval '12 months'
      AND category_id IS NOT NULL
    GROUP BY category_id, EXTRACT(month FROM created_at)
  ),
  listing_monthly AS (
    SELECT
      category_id,
      EXTRACT(month FROM created_at)::smallint  AS mth,
      COUNT(*)                                   AS listing_count
    FROM public.listings
    WHERE created_at >= now() - interval '12 months'
      AND category_id IS NOT NULL
    GROUP BY category_id, EXTRACT(month FROM created_at)
  ),
  -- Annual averages per category
  inq_annual_avg AS (
    SELECT category_id, AVG(inquiry_count) AS annual_avg
    FROM inquiry_monthly GROUP BY category_id
  ),
  srch_annual_avg AS (
    SELECT category_id, AVG(search_count) AS annual_avg
    FROM search_monthly GROUP BY category_id
  ),
  list_annual_avg AS (
    SELECT category_id, AVG(listing_count) AS annual_avg
    FROM listing_monthly GROUP BY category_id
  ),
  -- All (category, month) pairs that appear in any source
  all_cat_months AS (
    SELECT category_id, mth FROM inquiry_monthly
    UNION
    SELECT category_id, mth FROM search_monthly
    UNION
    SELECT category_id, mth FROM listing_monthly
  ),
  observation_counts AS (
    SELECT category_id, COUNT(DISTINCT mth) AS obs_count
    FROM all_cat_months GROUP BY category_id
  )
  SELECT
    acm.category_id,
    acm.mth,
    COALESCE(im.inquiry_count,  0)::numeric(10,2)                  AS avg_inquiries,
    COALESCE(sm.search_count,   0)::numeric(10,2)                  AS avg_searches,
    COALESCE(lm.listing_count,  0)::numeric(10,2)                  AS avg_listings,
    -- Multipliers default to 1.0 when no annual average (< 3 months observed)
    CASE WHEN oc.obs_count >= 3
      THEN ROUND((COALESCE(im.inquiry_count, 0)::numeric /
                  GREATEST(0.1, iaa.annual_avg)), 4)
      ELSE 1.0
    END                                                            AS inquiry_mult,
    CASE WHEN oc.obs_count >= 3
      THEN ROUND((COALESCE(sm.search_count, 0)::numeric /
                  GREATEST(0.1, saa.annual_avg)), 4)
      ELSE 1.0
    END                                                            AS search_mult,
    CASE WHEN oc.obs_count >= 3
      THEN ROUND((COALESCE(lm.listing_count, 0)::numeric /
                  GREATEST(0.1, laa.annual_avg)), 4)
      ELSE 1.0
    END                                                            AS listing_mult,
    -- Composite seasonal multiplier
    CASE WHEN oc.obs_count >= 3
      THEN ROUND((
        (COALESCE(im.inquiry_count,0)::float / GREATEST(0.1, iaa.annual_avg)) * 0.50 +
        (COALESCE(sm.search_count, 0)::float / GREATEST(0.1, saa.annual_avg)) * 0.30 +
        (COALESCE(lm.listing_count,0)::float / GREATEST(0.1, laa.annual_avg)) * 0.20
      )::numeric, 4)
      ELSE 1.0
    END                                                            AS seasonal_mult,
    COALESCE(oc.obs_count, 0),
    now()
  FROM all_cat_months acm
  LEFT JOIN inquiry_monthly  im  ON im.category_id = acm.category_id AND im.mth = acm.mth
  LEFT JOIN search_monthly   sm  ON sm.category_id = acm.category_id AND sm.mth = acm.mth
  LEFT JOIN listing_monthly  lm  ON lm.category_id = acm.category_id AND lm.mth = acm.mth
  LEFT JOIN inq_annual_avg   iaa ON iaa.category_id = acm.category_id
  LEFT JOIN srch_annual_avg  saa ON saa.category_id = acm.category_id
  LEFT JOIN list_annual_avg  laa ON laa.category_id = acm.category_id
  LEFT JOIN observation_counts oc ON oc.category_id = acm.category_id

  ON CONFLICT (category_id, month_of_year) DO UPDATE SET
    avg_inquiries       = EXCLUDED.avg_inquiries,
    avg_searches        = EXCLUDED.avg_searches,
    avg_listings        = EXCLUDED.avg_listings,
    inquiry_multiplier  = EXCLUDED.inquiry_multiplier,
    search_multiplier   = EXCLUDED.search_multiplier,
    listing_multiplier  = EXCLUDED.listing_multiplier,
    seasonal_multiplier = EXCLUDED.seasonal_multiplier,
    observation_count   = EXCLUDED.observation_count,
    updated_at          = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 17.  refresh_market_summary()  [BONUS]
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Denormalises heatmap + price + pressure + demand + supply + gap + seasonal
-- into one read-optimised row per (province, category).
-- All source tables have been refreshed earlier in the 30-min cycle.
-- Runs at :20 — all dependencies are complete by then.

CREATE OR REPLACE FUNCTION public.refresh_market_summary()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current_month smallint := EXTRACT(month FROM CURRENT_DATE);
BEGIN
  INSERT INTO public.regional_market_summary (
    province_id, category_id,
    heat_index, heat_tier,
    demand_score, trend_7d, searches_7d, inquiries_7d,
    supply_score, active_listings, merchant_count,
    median_price, price_trend_7d,
    pressure_score, shortage_flag, days_supply,
    opportunity_score, gap_tier,
    seasonal_multiplier,
    market_status,
    updated_at
  )
  WITH all_regions AS (
    SELECT province_id, category_id FROM public.regional_market_heatmaps
    UNION
    SELECT province_id, category_id FROM public.regional_demand_signals
    UNION
    SELECT province_id, category_id FROM public.regional_supply_density
  )
  SELECT
    ar.province_id,
    ar.category_id,

    COALESCE(h.heat_index,  0)                                          AS heat_index,
    COALESCE(h.heat_tier,   'cold')                                     AS heat_tier,

    COALESCE(d.demand_score, 0)                                         AS demand_score,
    COALESCE(d.trend_7d,     1.0)                                       AS trend_7d,
    COALESCE(d.searches_7d,  0)                                         AS searches_7d,
    COALESCE(d.inquiries_7d, 0)                                         AS inquiries_7d,

    COALESCE(s.supply_score,         0)                                 AS supply_score,
    COALESCE(s.active_listing_count, 0)                                 AS active_listings,
    COALESCE(s.merchant_count,       0)                                 AS merchant_count,

    pb.median_price,
    COALESCE(pb.price_trend_7d, 1.0)                                    AS price_trend_7d,

    COALESCE(ip.pressure_score, 0)                                      AS pressure_score,
    COALESCE(ip.shortage_flag,  false)                                  AS shortage_flag,
    ip.days_supply,

    COALESCE(mg.opportunity_score, 0)                                   AS opportunity_score,
    COALESCE(mg.gap_tier,         'low')                                AS gap_tier,

    COALESCE(ss.seasonal_multiplier, 1.0)                               AS seasonal_multiplier,

    -- market_status derived from composite signals
    CASE
      WHEN COALESCE(h.heat_index, 0) >= 70 AND COALESCE(ip.shortage_flag, false)
                                                   THEN 'hot_shortage'
      WHEN COALESCE(h.heat_index, 0) >= 70         THEN 'hot_stable'
      WHEN COALESCE(h.heat_index, 0) >= 40
       AND COALESCE(d.trend_7d, 1.0) > 1.2         THEN 'growing'
      WHEN COALESCE(h.heat_index, 0) >= 20         THEN 'stable'
      WHEN COALESCE(ip.pressure_score, 0) > 0.3    THEN 'oversupplied'
      WHEN COALESCE(h.heat_index, 0) < 20
       AND COALESCE(d.trend_7d, 1.0) < 0.8         THEN 'declining'
      ELSE                                               'cold'
    END                                                                 AS market_status,

    now()

  FROM all_regions ar
  LEFT JOIN public.regional_market_heatmaps    h  ON h.province_id  = ar.province_id AND h.category_id  = ar.category_id
  LEFT JOIN public.regional_demand_signals     d  ON d.province_id  = ar.province_id AND d.category_id  = ar.category_id
  LEFT JOIN public.regional_supply_density     s  ON s.province_id  = ar.province_id AND s.category_id  = ar.category_id
  LEFT JOIN public.regional_price_benchmarks   pb ON pb.province_id = ar.province_id AND pb.category_id = ar.category_id
  LEFT JOIN public.inventory_pressure_scores   ip ON ip.province_id = ar.province_id AND ip.category_id = ar.category_id
  LEFT JOIN public.market_gap_scores           mg ON mg.province_id = ar.province_id AND mg.category_id = ar.category_id
  LEFT JOIN public.seasonal_market_signals     ss ON ss.category_id = ar.category_id AND ss.month_of_year = v_current_month

  ON CONFLICT (province_id, category_id) DO UPDATE SET
    heat_index          = EXCLUDED.heat_index,
    heat_tier           = EXCLUDED.heat_tier,
    demand_score        = EXCLUDED.demand_score,
    trend_7d            = EXCLUDED.trend_7d,
    searches_7d         = EXCLUDED.searches_7d,
    inquiries_7d        = EXCLUDED.inquiries_7d,
    supply_score        = EXCLUDED.supply_score,
    active_listings     = EXCLUDED.active_listings,
    merchant_count      = EXCLUDED.merchant_count,
    median_price        = EXCLUDED.median_price,
    price_trend_7d      = EXCLUDED.price_trend_7d,
    pressure_score      = EXCLUDED.pressure_score,
    shortage_flag       = EXCLUDED.shortage_flag,
    days_supply         = EXCLUDED.days_supply,
    opportunity_score   = EXCLUDED.opportunity_score,
    gap_tier            = EXCLUDED.gap_tier,
    seasonal_multiplier = EXCLUDED.seasonal_multiplier,
    market_status       = EXCLUDED.market_status,
    updated_at          = EXCLUDED.updated_at;

  DELETE FROM public.regional_market_summary
  WHERE updated_at < now() - interval '48 hours';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 18.  detect_market_events()  [BONUS]
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Reads pre-aggregated tables (no SECURITY DEFINER required).
-- Dedup guard: no two events of the same (type, province, category) within 24 h.
-- Runs at :22 — after market_summary (:20) is complete.

CREATE OR REPLACE FUNCTION public.detect_market_events()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- ── Demand spikes (trend_7d > 2.0 with meaningful volume) ─────────────────
  INSERT INTO public.market_events
    (event_type, province_id, category_id, severity, trigger_value, baseline_value, metadata)
  SELECT
    'demand_spike',
    province_id,
    category_id,
    CASE WHEN trend_7d >= 4.0 THEN 'critical'
         WHEN trend_7d >= 3.0 THEN 'high'
         ELSE                      'medium' END,
    trend_7d,
    1.0,
    jsonb_build_object('searches_7d', searches_7d, 'inquiries_7d', inquiries_7d)
  FROM public.regional_market_summary
  WHERE trend_7d > 2.0
    AND searches_7d >= 5
    AND NOT EXISTS (
      SELECT 1 FROM public.market_events me
      WHERE me.event_type  = 'demand_spike'
        AND me.province_id = regional_market_summary.province_id
        AND me.category_id = regional_market_summary.category_id
        AND me.detected_at >= now() - interval '24 hours'
    );

  -- ── Shortage alerts (pressure_score < −0.4) ───────────────────────────────
  INSERT INTO public.market_events
    (event_type, province_id, category_id, severity, trigger_value, baseline_value, metadata)
  SELECT
    'shortage_alert',
    province_id,
    category_id,
    CASE WHEN pressure_score < -0.7 THEN 'critical'
         WHEN pressure_score < -0.5 THEN 'high'
         ELSE                             'medium' END,
    pressure_score,
    0.0,
    jsonb_build_object('days_supply', days_supply, 'active_listings', active_listings)
  FROM public.regional_market_summary
  WHERE shortage_flag = true
    AND pressure_score < -0.4
    AND NOT EXISTS (
      SELECT 1 FROM public.market_events me
      WHERE me.event_type  = 'shortage_alert'
        AND me.province_id = regional_market_summary.province_id
        AND me.category_id = regional_market_summary.category_id
        AND me.detected_at >= now() - interval '24 hours'
    );

  -- ── Oversupply warnings (pressure_score > 0.5) ────────────────────────────
  INSERT INTO public.market_events
    (event_type, province_id, category_id, severity, trigger_value, baseline_value, metadata)
  SELECT
    'oversupply_warning',
    province_id,
    category_id,
    'low',
    pressure_score,
    0.0,
    jsonb_build_object('active_listings', active_listings, 'merchant_count', merchant_count)
  FROM public.regional_market_summary
  WHERE pressure_score > 0.5
    AND supply_score >= 2.0
    AND NOT EXISTS (
      SELECT 1 FROM public.market_events me
      WHERE me.event_type  = 'oversupply_warning'
        AND me.province_id = regional_market_summary.province_id
        AND me.category_id = regional_market_summary.category_id
        AND me.detected_at >= now() - interval '24 hours'
    );

  -- ── Price anomalies (trend_7d > 1.3 or < 0.7) ────────────────────────────
  INSERT INTO public.market_events
    (event_type, province_id, category_id, severity, trigger_value, baseline_value, metadata)
  SELECT
    'price_anomaly',
    province_id,
    category_id,
    CASE WHEN price_trend_7d > 1.5 OR price_trend_7d < 0.6 THEN 'high'
         ELSE                                                    'medium' END,
    price_trend_7d,
    1.0,
    jsonb_build_object('median_price', median_price)
  FROM public.regional_market_summary
  WHERE (price_trend_7d > 1.3 OR price_trend_7d < 0.7)
    AND median_price IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.market_events me
      WHERE me.event_type  = 'price_anomaly'
        AND me.province_id = regional_market_summary.province_id
        AND me.category_id = regional_market_summary.category_id
        AND me.detected_at >= now() - interval '24 hours'
    );

  -- ── High-liquidity alerts (liquidity_score > 3.0) ─────────────────────────
  INSERT INTO public.market_events
    (event_type, province_id, category_id, severity, trigger_value, baseline_value, metadata)
  SELECT
    'high_liquidity',
    h.province_id,
    h.category_id,
    CASE WHEN h.liquidity_score > 5.0 THEN 'high' ELSE 'medium' END,
    h.liquidity_score,
    1.0,
    jsonb_build_object('heat_index', h.heat_index, 'inquiries_7d', rms.inquiries_7d)
  FROM public.regional_market_heatmaps h
  JOIN public.regional_market_summary  rms
    ON rms.province_id = h.province_id AND rms.category_id = h.category_id
  WHERE h.liquidity_score > 3.0
    AND NOT EXISTS (
      SELECT 1 FROM public.market_events me
      WHERE me.event_type  = 'high_liquidity'
        AND me.province_id = h.province_id
        AND me.category_id = h.category_id
        AND me.detected_at >= now() - interval '24 hours'
    );

  -- Prune expired events
  DELETE FROM public.market_events WHERE expires_at < now();
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 19.  pg_cron — Regional OS pipeline
-- ══════════════════════════════════════════════════════════════════════════════
--
-- All slots are new — no conflicts with migrations 008–017.
-- Dependency chain is respected via slot ordering:
--   demand (:02) + supply (:03) → pressure (:07) → heatmaps (:10) → summary (:20) → events (:22)
--   price (:04) feeds into summary (:20) and events (:22)

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE command LIKE '%refresh_price_benchmarks%'
   OR command LIKE '%refresh_inventory_pressure%'
   OR command LIKE '%refresh_market_heatmaps%'
   OR command LIKE '%refresh_economic_telemetry%'
   OR command LIKE '%refresh_supply_routes%'
   OR command LIKE '%refresh_merchant_operations_metrics%'
   OR command LIKE '%refresh_seasonal_signals%'
   OR command LIKE '%refresh_market_summary%'
   OR command LIKE '%detect_market_events%';

SELECT cron.schedule('refresh_price_benchmarks',           '4-59/30 * * * *',
  $$SELECT public.refresh_price_benchmarks()$$);

SELECT cron.schedule('refresh_inventory_pressure',         '7-59/30 * * * *',
  $$SELECT public.refresh_inventory_pressure()$$);

SELECT cron.schedule('refresh_market_heatmaps',            '10-59/30 * * * *',
  $$SELECT public.refresh_market_heatmaps()$$);

SELECT cron.schedule('refresh_economic_telemetry',         '13-59/30 * * * *',
  $$SELECT public.refresh_economic_telemetry()$$);

SELECT cron.schedule('refresh_supply_routes',              '16-59/30 * * * *',
  $$SELECT public.refresh_supply_routes()$$);

SELECT cron.schedule('refresh_merchant_operations_metrics','18-59/30 * * * *',
  $$SELECT public.refresh_merchant_operations_metrics()$$);

SELECT cron.schedule('refresh_seasonal_signals',           '19-59/30 * * * *',
  $$SELECT public.refresh_seasonal_signals()$$);

SELECT cron.schedule('refresh_market_summary',             '20-59/30 * * * *',
  $$SELECT public.refresh_market_summary()$$);

SELECT cron.schedule('detect_market_events',               '22-59/30 * * * *',
  $$SELECT public.detect_market_events()$$);

-- Daily: expire old market events (redundant safety — detect_market_events already prunes)
SELECT cron.schedule('prune_market_events', '0 5 * * *',
  $$DELETE FROM public.market_events WHERE expires_at < now()$$);

-- ══════════════════════════════════════════════════════════════════════════════
-- 20.  Row-level security
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.regional_market_heatmaps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_price_benchmarks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_pressure_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_market_signals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_operations_metrics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_routing_edges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_events                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_market_summary        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_telemetry             ENABLE ROW LEVEL SECURITY;

-- ── Public intelligence tables (aggregated, non-sensitive) ───────────────────

DROP POLICY IF EXISTS "heatmaps_public_read"         ON public.regional_market_heatmaps;
CREATE POLICY "heatmaps_public_read" ON public.regional_market_heatmaps
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "price_benchmarks_public_read" ON public.regional_price_benchmarks;
CREATE POLICY "price_benchmarks_public_read" ON public.regional_price_benchmarks
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "inv_pressure_public_read"     ON public.inventory_pressure_scores;
CREATE POLICY "inv_pressure_public_read" ON public.inventory_pressure_scores
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "seasonal_signals_public_read" ON public.seasonal_market_signals;
CREATE POLICY "seasonal_signals_public_read" ON public.seasonal_market_signals
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "supply_routes_public_read"    ON public.supply_routing_edges;
CREATE POLICY "supply_routes_public_read" ON public.supply_routing_edges
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "market_events_public_read"    ON public.market_events;
CREATE POLICY "market_events_public_read" ON public.market_events
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "market_summary_public_read"   ON public.regional_market_summary;
CREATE POLICY "market_summary_public_read" ON public.regional_market_summary
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "telemetry_public_read"        ON public.economic_telemetry;
CREATE POLICY "telemetry_public_read" ON public.economic_telemetry
  FOR SELECT TO anon, authenticated USING (true);

-- ── merchant_operations_metrics: owner reads own row ────────────────────────

DROP POLICY IF EXISTS "ops_metrics_owner_read"       ON public.merchant_operations_metrics;
CREATE POLICY "ops_metrics_owner_read" ON public.merchant_operations_metrics
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- END 018_regional_ops.sql
-- ══════════════════════════════════════════════════════════════════════════════
