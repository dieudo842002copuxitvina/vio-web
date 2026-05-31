-- ── 011_ctr_quality_ranking.sql ──────────────────────────────────────────────
-- Week 2.4: CTR Learning + Rank Feedback Loop.
--
-- Transforms ranking from static heuristic scoring into adaptive behavioral
-- ranking that learns from real user engagement. Everything is PostgreSQL-native.
--
-- What this migration adds:
--   Tables:
--     • listing_ctr_stats         — 1d / 7d CTR snapshots per listing
--     • listing_quality_scores    — bounce / dwell / conversion quality signals
--
--   Infrastructure:
--     • to_hour_bucket()          — IMMUTABLE UTC-hour helper for dedup index
--     • listing_events dedup index — prevents impression spam per session/hour
--
--   Functions:
--     • refresh_listing_ctr_stats()       — aggregate events → CTR table
--     • refresh_listing_quality_scores()  — aggregate events → quality table
--     • search_listings_hybrid()          — REPLACED with behavioral boosts
--
--   pg_cron jobs:
--     • refresh-listing-ctr-stats       every 15 min
--     • refresh-listing-quality-scores  every 15 min (staggered +8 min)
--
-- Behavioral boost budget in rank formula (hard-capped to preserve text dominance):
--   CTR boost      max +0.40   (impression-normalised; requires ≥50 impressions)
--   Quality boost  max +0.30   (bounce/dwell/conversion composite)
--   Velocity boost max +0.30   (trending_score burst ratio from listing_scores)
--   Cold-start     max +0.25   (new listings < 7 days + < 50 impressions)
--   ────────────────────────
--   Total max      +1.25 behavioral  vs  ~6.0 text max  →  text:behavioral ≈ 5:1
--
-- Depends on: migrations 001–010
-- Safe to re-run: DROP IF EXISTS / CREATE IF NOT EXISTS / OR REPLACE throughout.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  listing_ctr_stats
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.listing_ctr_stats (
  listing_id     uuid         PRIMARY KEY,
  impressions_1d integer      NOT NULL DEFAULT 0,
  impressions_7d integer      NOT NULL DEFAULT 0,
  clicks_1d      integer      NOT NULL DEFAULT 0,
  clicks_7d      integer      NOT NULL DEFAULT 0,
  ctr_1d         numeric(6,4) NOT NULL DEFAULT 0,
  ctr_7d         numeric(6,4) NOT NULL DEFAULT 0,
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  listing_quality_scores
-- ══════════════════════════════════════════════════════════════════════════════
--
-- All metrics derived exclusively from listing_events via SECURITY DEFINER
-- refresh function (raw events are not publicly readable).
--
-- bounce_rate:        fraction of clicks with duration_seconds < 10 s
--                     (only counted when the client reports duration_seconds)
-- avg_dwell_seconds:  mean seconds on listing page (from click metadata)
-- inquiry_rate:       inquiries / clicks (intent conversion)
-- save_rate:          saves / clicks (interest conversion)
-- quality_score:      weighted composite (see refresh_listing_quality_scores)

CREATE TABLE IF NOT EXISTS public.listing_quality_scores (
  listing_id         uuid          PRIMARY KEY,
  bounce_rate        numeric(5,4)  NOT NULL DEFAULT 0,
  avg_dwell_seconds  numeric(8,2)  NOT NULL DEFAULT 0,
  inquiry_rate       numeric(5,4)  NOT NULL DEFAULT 0,
  save_rate          numeric(5,4)  NOT NULL DEFAULT 0,
  quality_score      numeric(10,4) NOT NULL DEFAULT 0,
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  to_hour_bucket() — IMMUTABLE UTC-hour helper
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Converts a timestamptz to a UTC hour-bucket integer.
-- EXTRACT(epoch) from timestamptz is timezone-independent (always UTC seconds),
-- so dividing by 3600 gives a UTC hour number that is truly IMMUTABLE.
-- This wrapper is required because date_trunc(timestamptz) is STABLE in
-- PostgreSQL (timezone-dependent) and cannot be used in index expressions.

CREATE OR REPLACE FUNCTION public.to_hour_bucket(ts timestamptz)
RETURNS bigint
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT EXTRACT(epoch FROM ts)::bigint / 3600 $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  Impression deduplication index
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Prevents impression inflation from the same session within the same UTC hour.
-- Anonymous events (session_id IS NULL) are excluded from dedup — they are
-- naturally limited to one impression per SSR render anyway.
--
-- INSERT on conflict is handled in the TypeScript tracking layer:
--   supabase error code 23505 (unique_violation) is silently swallowed.

CREATE UNIQUE INDEX IF NOT EXISTS listing_events_impression_dedup_idx
  ON public.listing_events (listing_id, session_id, to_hour_bucket(created_at))
  WHERE event_type = 'impression'
    AND session_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  refresh_listing_ctr_stats()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Aggregates impression and click counts for the past 1d and 7d windows.
-- Reads listing_events (no public SELECT) → SECURITY DEFINER required.
-- Impression counts naturally reflect deduplication because the unique index
-- prevented duplicate inserts at write time.

CREATE OR REPLACE FUNCTION public.refresh_listing_ctr_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.listing_ctr_stats (
    listing_id,
    impressions_1d,
    impressions_7d,
    clicks_1d,
    clicks_7d,
    ctr_1d,
    ctr_7d,
    updated_at
  )
  SELECT
    listing_id,

    COUNT(*) FILTER (WHERE event_type = 'impression'
                       AND created_at >= now() - interval '1 day')   AS impressions_1d,
    COUNT(*) FILTER (WHERE event_type = 'impression'
                       AND created_at >= now() - interval '7 days')  AS impressions_7d,
    COUNT(*) FILTER (WHERE event_type = 'click'
                       AND created_at >= now() - interval '1 day')   AS clicks_1d,
    COUNT(*) FILTER (WHERE event_type = 'click'
                       AND created_at >= now() - interval '7 days')  AS clicks_7d,

    -- 1d CTR
    COALESCE(
      COUNT(*) FILTER (WHERE event_type = 'click'
                         AND created_at >= now() - interval '1 day')::numeric
      / NULLIF(
          COUNT(*) FILTER (WHERE event_type = 'impression'
                             AND created_at >= now() - interval '1 day'),
          0),
      0
    )::numeric(6,4)                                                   AS ctr_1d,

    -- 7d CTR
    COALESCE(
      COUNT(*) FILTER (WHERE event_type = 'click'
                         AND created_at >= now() - interval '7 days')::numeric
      / NULLIF(
          COUNT(*) FILTER (WHERE event_type = 'impression'
                             AND created_at >= now() - interval '7 days'),
          0),
      0
    )::numeric(6,4)                                                   AS ctr_7d,

    now()

  FROM public.listing_events
  WHERE created_at >= now() - interval '7 days'
  GROUP BY listing_id

  ON CONFLICT (listing_id) DO UPDATE SET
    impressions_1d = EXCLUDED.impressions_1d,
    impressions_7d = EXCLUDED.impressions_7d,
    clicks_1d      = EXCLUDED.clicks_1d,
    clicks_7d      = EXCLUDED.clicks_7d,
    ctr_1d         = EXCLUDED.ctr_1d,
    ctr_7d         = EXCLUDED.ctr_7d,
    updated_at     = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  refresh_listing_quality_scores()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Computes behavioural quality signals from listing_events over the last 7 days.
--
-- dwell_samples: clicks WHERE the client reported duration_seconds in metadata.
--   Bounce rate and avg dwell are computed only over this sample, not all clicks,
--   to avoid penalising listings where the client did not send dwell data.
--
-- quality_score formula (all components normalised to [0, 1]):
--   non_bounce_score  = 1 − bounce_rate              (lower bounce = better)
--   dwell_score       = LEAST(1, avg_dwell / 120 s)  (ceiling: 2 min)
--   inquiry_conv      = LEAST(1, inquiry_rate / 5%)  (5% rate = max signal)
--   save_conv         = LEAST(1, save_rate / 15%)    (15% rate = max signal)
--
--   raw = non_bounce_score × 0.35
--       + dwell_score       × 0.35
--       + inquiry_conv      × 0.20
--       + save_conv         × 0.10
--
--   quality_score = raw × damping
--   damping = LEAST(1, total_clicks / 20)
--     — requires 20 clicks before the score is fully trusted.
--     — prevents a listing with 1 click + 1 inquiry from scoring perfectly.

CREATE OR REPLACE FUNCTION public.refresh_listing_quality_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH click_signals AS (
    SELECT
      listing_id,
      COUNT(*)                                                            AS total_clicks,
      COUNT(*) FILTER (WHERE metadata ? 'duration_seconds')              AS dwell_samples,
      COUNT(*) FILTER (
        WHERE metadata ? 'duration_seconds'
          AND (metadata->>'duration_seconds')::numeric < 10
      )                                                                   AS bounced_clicks,
      AVG((metadata->>'duration_seconds')::numeric)
        FILTER (WHERE metadata ? 'duration_seconds')                     AS avg_dwell
    FROM public.listing_events
    WHERE event_type = 'click'
      AND created_at >= now() - interval '7 days'
    GROUP BY listing_id
  ),

  conversion_signals AS (
    SELECT
      listing_id,
      COUNT(*) FILTER (WHERE event_type = 'click')   AS clicks,
      COUNT(*) FILTER (WHERE event_type = 'inquiry') AS inquiries,
      COUNT(*) FILTER (WHERE event_type = 'save')    AS saves
    FROM public.listing_events
    WHERE created_at >= now() - interval '7 days'
    GROUP BY listing_id
  ),

  combined AS (
    SELECT
      COALESCE(cl.listing_id, cv.listing_id)                     AS listing_id,
      COALESCE(cl.total_clicks, 0)                               AS total_clicks,

      -- bounce_rate: only meaningful when we have dwell data
      COALESCE(
        cl.bounced_clicks::numeric / NULLIF(cl.dwell_samples, 0),
        0
      )                                                          AS bounce_rate,

      COALESCE(cl.avg_dwell, 0)                                  AS avg_dwell_seconds,

      -- inquiry_rate: inquiries per click
      COALESCE(
        cv.inquiries::numeric / NULLIF(COALESCE(cl.total_clicks, cv.clicks), 0),
        0
      )                                                          AS inquiry_rate,

      -- save_rate: saves per click
      COALESCE(
        cv.saves::numeric / NULLIF(COALESCE(cl.total_clicks, cv.clicks), 0),
        0
      )                                                          AS save_rate

    FROM click_signals cl
    FULL OUTER JOIN conversion_signals cv ON cv.listing_id = cl.listing_id
  )

  INSERT INTO public.listing_quality_scores (
    listing_id,
    bounce_rate,
    avg_dwell_seconds,
    inquiry_rate,
    save_rate,
    quality_score,
    updated_at
  )
  SELECT
    listing_id,
    COALESCE(bounce_rate, 0)::numeric(5,4),
    COALESCE(avg_dwell_seconds, 0)::numeric(8,2),
    COALESCE(inquiry_rate, 0)::numeric(5,4),
    COALESCE(save_rate, 0)::numeric(5,4),

    GREATEST(0.0,
      (
        -- Non-bounce contribution (35%): penalises listings with high bounce
        (1.0 - COALESCE(bounce_rate, 0.5)) * 0.35

        -- Dwell contribution (35%): 2-minute ceiling; longer = better
        + LEAST(1.0, COALESCE(avg_dwell_seconds, 0) / 120.0) * 0.35

        -- Inquiry conversion (20%): 5% rate = full signal
        + LEAST(1.0, COALESCE(inquiry_rate, 0) / 0.05) * 0.20

        -- Save conversion (10%): 15% rate = full signal
        + LEAST(1.0, COALESCE(save_rate, 0) / 0.15) * 0.10
      )
      -- Cold-data damping: score scales up linearly to 20 clicks then is trusted
      * LEAST(1.0, total_clicks::numeric / 20.0)
    )::numeric(10,4)                                            AS quality_score,

    now()

  FROM combined

  ON CONFLICT (listing_id) DO UPDATE SET
    bounce_rate       = EXCLUDED.bounce_rate,
    avg_dwell_seconds = EXCLUDED.avg_dwell_seconds,
    inquiry_rate      = EXCLUDED.inquiry_rate,
    save_rate         = EXCLUDED.save_rate,
    quality_score     = EXCLUDED.quality_score,
    updated_at        = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  search_listings_hybrid() — REPLACED with behavioral boosts
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Replaces the migration-008 version.  All existing logic is preserved.
-- Three LEFT JOINs are added to the browsed/scored CTEs:
--   cs  → listing_ctr_stats        (CTR boost)
--   qs  → listing_quality_scores   (quality boost)
--   ls  → listing_scores           (velocity / trending boost)
--
-- These tables all have public SELECT policies so no extra privilege is needed.
-- Each join is a single PK lookup (uuid primary key) — O(1) per candidate row.
--
-- Behavioral addons to _rank (both browse and scored paths):
--
--   CTR boost (max +0.40):
--     Active only when impressions_7d ≥ 50 (impression-normalised).
--     Baseline CTR = 3 %. Each 1 % above baseline adds 0.05 to rank.
--     Prevents cold listings from being punished for 0-impression / 0-CTR.
--
--   Quality boost (max +0.30):
--     Linear scale of quality_score (0–1 range from refresh function).
--     Rewards low-bounce, high-dwell, high-conversion listings.
--
--   Velocity boost (max +0.30):
--     Derived from listing_scores.trending_score (2d/7d burst ratio from 010).
--     trending_score > 1.0 = above-baseline recent activity.
--     Boost = (trending_score − 1) × 0.20, capped at 0.30.
--     At 1.5× burst: +0.10.  At 2.0× burst: +0.20.  At ≥2.5× burst: +0.30.
--
--   Cold-start floor (max +0.25):
--     Applied when impressions_7d < 50 AND listing age < 7 days.
--     Decays linearly from 0.25 at publish time to 0 at day 7.
--     Prevents new quality listings from being buried below stale popular ones
--     while they accumulate their first impressions.

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

  IF p_area_min IS NOT NULL OR p_area_max IS NOT NULL THEN
    SELECT s.id INTO area_schema_id
    FROM   listing_attribute_schemas s
    WHERE  s.listing_type = 'land' AND s.key = 'area_m2'
    LIMIT  1;
  END IF;

  -- ── Browse-mode path (q = '') ──────────────────────────────────────────────
  -- Skips all text-matching work.
  -- Behavioral signals (CTR, quality, velocity, cold-start) augment the
  -- feature/geo/freshness boosts that drive browse-page ordering.

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
          -- ── Static feature / trust boosts ─────────────────────────────────
          CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
          + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

          -- ── Geo context boosts ─────────────────────────────────────────────
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

          -- ── CTR boost (impression-normalised, max +0.40) ──────────────────
          -- Requires ≥ 50 impressions to activate; baseline CTR = 3 %.
          + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
              THEN LEAST(0.40, GREATEST(0.0,
                     COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
              ELSE 0.0
            END

          -- ── Quality boost (max +0.30) ──────────────────────────────────────
          + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

          -- ── Velocity boost: trending burst ratio (max +0.30) ──────────────
          -- trending_score > 1.0 = above-baseline recent activity (from 010).
          + COALESCE(
              CASE WHEN ls.trending_score > 1.0
                THEN LEAST(0.30, (ls.trending_score::numeric - 1.0) * 0.20)
                ELSE 0.0
              END,
              0.0
            )

          -- ── Cold-start floor (max +0.25, decays over 7 days) ──────────────
          -- Active only for new listings with < 50 impressions and age < 7 d.
          + CASE
              WHEN COALESCE(cs.impressions_7d, 0) < 50
                   AND EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0
              THEN 0.25 * GREATEST(0.0,
                     1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 604800.0)
              ELSE 0.0
            END
        )::float4 AS _rank

      FROM listings l
      LEFT JOIN public.listing_ctr_stats       cs ON cs.listing_id = l.id
      LEFT JOIN public.listing_quality_scores  qs ON qs.listing_id = l.id
      LEFT JOIN public.listing_scores          ls ON ls.listing_id = l.id

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
    RETURN;
  END IF;

  -- ── Scored search path (q ≠ '') ───────────────────────────────────────────
  -- Text signals (FTS, trgm, exact) are the dominant ranking factor.
  -- Behavioral boosts are additive and capped so they cannot bury a highly
  -- relevant low-engagement result below an irrelevant popular one.

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
        -- ── Text relevance signals (dominant, up to ~6.0) ──────────────────
        -- Exact match
        CASE
          WHEN l.title_normalized = q_norm                         THEN 2.0
          WHEN length(q_norm) >= 3
               AND l.title_normalized LIKE (q_norm || '%')         THEN 1.0
          ELSE 0.0
        END
        -- FTS rank (×2 so a strong FTS signal dominates feature boosts)
        + CASE WHEN tsq IS NOT NULL
            THEN ts_rank(l.search_vector, tsq, 1) * 2.0
            ELSE 0.0
          END
        -- Trigram similarity
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

        -- ── Freshness: linear decay over 30 days ───────────────────────────
        + GREATEST(0.0, 0.05 * (
            1.0 - LEAST(
              EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
              1.0
            )
          ))

        -- ── CTR boost (impression-normalised, max +0.40) ──────────────────
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

        -- ── Cold-start floor (max +0.25, decays over 7 days) ──────────────
        + CASE
            WHEN COALESCE(cs.impressions_7d, 0) < 50
                 AND EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0
            THEN 0.25 * GREATEST(0.0,
                   1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 604800.0)
            ELSE 0.0
          END
      )::float4 AS _rank

    FROM listings l
    LEFT JOIN public.listing_ctr_stats       cs ON cs.listing_id = l.id
    LEFT JOIN public.listing_quality_scores  qs ON qs.listing_id = l.id
    LEFT JOIN public.listing_scores          ls ON ls.listing_id = l.id

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

      -- Text match gate (unchanged from migration 008)
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

-- ══════════════════════════════════════════════════════════════════════════════
-- 8.  pg_cron jobs
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Stagger chain:
--   :00/:15/:30/:45  → refresh_listing_signals_daily  (migration 010)
--   :05/:20/:35/:50  → refresh_listing_scores          (migration 010)
--   :08/:23/:38/:53  → refresh_listing_ctr_stats       (this migration)
--   :11/:26/:41/:56  → refresh_listing_quality_scores  (this migration)
--
-- Each job reads tables written by the previous tier, forming a pipeline.
-- Longest end-to-end latency: 11 minutes from event insert to quality_score.

DO $$
BEGIN
  PERFORM cron.schedule(
    'refresh-listing-ctr-stats',
    '8-59/15 * * * *',
    $$SELECT public.refresh_listing_ctr_stats()$$
  );
  PERFORM cron.schedule(
    'refresh-listing-quality-scores',
    '11-59/15 * * * *',
    $$SELECT public.refresh_listing_quality_scores()$$
  );
EXCEPTION WHEN undefined_function OR undefined_schema THEN
  RAISE WARNING
    '[011] pg_cron not enabled — CTR and quality scores will not auto-refresh. '
    'Enable pg_cron, then run cron.schedule() calls manually.';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9.  RLS
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.listing_ctr_stats      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_ctr_stats_public_read"
  ON public.listing_ctr_stats FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "listing_quality_scores_public_read"
  ON public.listing_quality_scores FOR SELECT
  TO anon, authenticated USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 10.  Grants
-- ══════════════════════════════════════════════════════════════════════════════

GRANT SELECT   ON public.listing_ctr_stats      TO anon, authenticated;
GRANT SELECT   ON public.listing_quality_scores TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.to_hour_bucket              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_listing_ctr_stats   TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_listing_quality_scores TO postgres;
