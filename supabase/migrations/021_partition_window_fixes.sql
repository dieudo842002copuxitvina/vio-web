-- ══════════════════════════════════════════════════════════════════════════════
-- 021  PARTITION WINDOW FIXES
-- ══════════════════════════════════════════════════════════════════════════════
--
-- listing_events was partitioned by month (pg_partman) and retains only 3 months
-- of data (~90 days).  Two functions referenced longer windows that now exceed
-- the available data.  This migration replaces those functions with corrected
-- window sizes so they never request data outside the live partitions.
--
-- Changes:
--   1. refresh_trust_edges()     — 180 days → 90 days
--                                  (prune DELETE: 180 days → 90 days)
--   2. refresh_seasonal_signals() — listing_events inquiry_monthly CTE:
--                                  12 months → 3 months
--                                  search_queries / listings windows unchanged
--                                  (those tables are not partitioned)
--
-- NOTE on impression dedup index (011_ctr_quality_ranking.sql):
--   listing_events_impression_dedup_idx uses to_hour_bucket(created_at), a
--   function expression, not the raw partition key column.  PostgreSQL requires
--   global unique indexes on partitioned tables to include the partition key
--   directly.  pg_partman may have silently dropped this index during the
--   partition migration.  Verify with:
--     SELECT indexname, indexdef FROM pg_indexes
--     WHERE tablename = 'listing_events'
--       AND indexname LIKE '%impression_dedup%';
--   If the index is absent, impression deduplication is non-functional and a
--   per-partition index strategy must be adopted in a separate migration.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  refresh_trust_edges()  (replaces 019_trust_quality.sql version)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Window reduced from 180 days to 90 days to match partition retention.
-- The prune threshold is reduced to match so stale edges are still cleaned up.

CREATE OR REPLACE FUNCTION public.refresh_trust_edges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchant_trust_edges (
    merchant_a_id, merchant_b_id,
    interaction_count, successful_inquiries,
    trust_strength, last_interaction_at, updated_at
  )
  WITH inquiry_pairs AS (
    -- (inquirer → seller) pairs from listing_events — 90-day window matches partition retention
    SELECT
      e.profile_id                                AS inquirer_id,
      l.owner_id                                  AS seller_id,
      COUNT(*)                                    AS inquiry_count,
      MAX(e.created_at)                           AS last_at
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.event_type   = 'inquiry'
      AND e.profile_id   IS NOT NULL
      AND e.profile_id   <> l.owner_id
      AND e.created_at   >= now() - interval '90 days'
    GROUP BY e.profile_id, l.owner_id
    HAVING COUNT(*) >= 1
  ),
  -- Only keep pairs where BOTH sides have inquired each other
  mutual AS (
    SELECT
      LEAST(a.inquirer_id, a.seller_id)::uuid    AS merchant_a,
      GREATEST(a.inquirer_id, a.seller_id)::uuid AS merchant_b,
      a.inquiry_count + b.inquiry_count          AS total_interactions,
      GREATEST(a.last_at, b.last_at)             AS last_interaction_at
    FROM inquiry_pairs a
    JOIN inquiry_pairs b
      ON b.inquirer_id = a.seller_id
      AND b.seller_id  = a.inquirer_id
    WHERE a.inquirer_id < a.seller_id  -- canonical pair; process each once
  )
  SELECT
    merchant_a,
    merchant_b,
    total_interactions,
    total_interactions,  -- all inquiry-based → all count as successful_inquiries
    LEAST(1.0, LN(1.0 + total_interactions::float) / LN(11.0))::numeric(5,4),
    last_interaction_at,
    now()
  FROM mutual
  WHERE total_interactions >= 2  -- require at least 2 total cross-interactions

  ON CONFLICT (merchant_a_id, merchant_b_id) DO UPDATE SET
    interaction_count    = EXCLUDED.interaction_count,
    successful_inquiries = EXCLUDED.successful_inquiries,
    trust_strength       = EXCLUDED.trust_strength,
    last_interaction_at  = EXCLUDED.last_interaction_at,
    updated_at           = EXCLUDED.updated_at;

  -- Prune stale low-strength edges — align threshold with partition retention
  DELETE FROM public.merchant_trust_edges
  WHERE last_interaction_at < now() - interval '90 days'
    AND trust_strength < 0.30;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  refresh_seasonal_signals()  (replaces 018_regional_ops.sql version)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- inquiry_monthly CTE reduced from 12 months to 3 months (listing_events only).
-- search_monthly  reads search_queries  — not partitioned, 12-month window kept.
-- listing_monthly reads listings        — not partitioned, 12-month window kept.
--
-- Side-effect: with only 3 months of inquiry data, obs_count for inquiry-driven
-- months will be ≤ 3.  The existing guard (obs_count >= 3 → use multiplier,
-- else 1.0) is preserved, so months with insufficient inquiry data safely
-- default to a neutral multiplier.

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
    -- 3-month window matches listing_events partition retention
    SELECT
      l.category_id,
      EXTRACT(month FROM e.created_at)::smallint    AS mth,
      COUNT(*)                                       AS inquiry_count
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.event_type = 'inquiry'
      AND e.created_at >= now() - interval '3 months'
      AND l.category_id IS NOT NULL
    GROUP BY l.category_id, EXTRACT(month FROM e.created_at)
  ),
  search_monthly AS (
    -- search_queries is NOT partitioned; 12-month window is valid
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
    -- listings is NOT partitioned; 12-month window is valid
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
    -- Multipliers default to 1.0 when obs_count < 3
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
