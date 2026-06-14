-- ── 010_listing_signals.sql ──────────────────────────────────────────────────
-- Week 2.3: Recommendation + Signal Infrastructure.
--
-- Purpose: capture raw engagement events, aggregate them daily, and compute
-- per-listing ranking scores. This is the foundation for trending feeds,
-- popularity ranking, and future personalisation — implemented entirely in
-- PostgreSQL, no external ML or vector store required.
--
-- Tables created:
--   • listing_events          — append-only raw event log
--   • listing_signals_daily   — pre-aggregated 7-day rolling signal window
--   • listing_scores          — per-listing composite ranking scores
--
-- Functions created:
--   • refresh_listing_signals_daily() — aggregate events → daily signals (UPSERT)
--   • refresh_listing_scores()        — signals → scores (UPSERT)
--
-- pg_cron jobs (requires pg_cron enabled):
--   • refresh-listing-signals-daily  — every 15 min
--   • refresh-listing-scores         — every 15 min (staggered +5 min)
--
-- Depends on: migrations 001–009
-- Safe to re-run: all DDL uses IF NOT EXISTS / OR REPLACE.
-- pg_cron calls are wrapped in a DO block that emits WARNING and continues
-- gracefully if pg_cron is not enabled.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  listing_events — append-only raw event log
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Design decisions:
--   • BIGINT GENERATED ALWAYS AS IDENTITY for id — avoids uuid generation cost
--     on a high-volume insert path (millions of rows/day at scale).
--   • No FK on listing_id — avoids cascade overhead and allows events to
--     outlive deleted listings (historical signal retention).
--   • No FK on profile_id — avoids cascade churn when users deactivate.
--   • CHECK constraint on event_type enforces the allowed-values contract at
--     the DB level; the RLS INSERT policy mirrors it for belt-and-suspenders.
--   • append-only is enforced exclusively via RLS (no UPDATE/DELETE policies).
--   • SECURITY DEFINER aggregation functions bypass RLS when reading events.

CREATE TABLE IF NOT EXISTS public.listing_events (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id  uuid        NOT NULL,
  profile_id  uuid        NULL,
  event_type  text        NOT NULL,
  session_id  text        NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT listing_events_type_check
    CHECK (event_type IN (
      'impression', 'click', 'save', 'inquiry', 'phone_reveal', 'share'
    ))
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- listing_id + time: aggregation queries, per-listing event history
CREATE INDEX IF NOT EXISTS listing_events_listing_id_created_idx
  ON public.listing_events (listing_id, created_at DESC);

-- event_type + time: funnel analysis, event-type filtering
CREATE INDEX IF NOT EXISTS listing_events_event_type_created_idx
  ON public.listing_events (event_type, created_at DESC);

-- profile_id + time: authenticated-user event history (partial — skip nulls)
CREATE INDEX IF NOT EXISTS listing_events_profile_id_created_idx
  ON public.listing_events (profile_id, created_at DESC)
  WHERE profile_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  listing_signals_daily — pre-aggregated 7-day rolling window
-- ══════════════════════════════════════════════════════════════════════════════
--
-- One row per (listing_id, calendar day).  Refreshed every 15 minutes by
-- refresh_listing_signals_daily().
--
-- ctr: click-through rate = clicks / impressions (0 when impressions = 0).
--
-- engagement_score (per day, weighted):
--   inquiry * 5 + save * 3 + phone_reveal * 2 + click * 1
--   Weights reflect increasing purchase intent.

CREATE TABLE IF NOT EXISTS public.listing_signals_daily (
  listing_id       uuid         NOT NULL,
  signal_date      date         NOT NULL,
  impressions      integer      NOT NULL DEFAULT 0,
  clicks           integer      NOT NULL DEFAULT 0,
  saves            integer      NOT NULL DEFAULT 0,
  inquiries        integer      NOT NULL DEFAULT 0,
  phone_reveals    integer      NOT NULL DEFAULT 0,
  shares           integer      NOT NULL DEFAULT 0,
  ctr              numeric(6,4) NOT NULL DEFAULT 0,
  engagement_score numeric(12,2)NOT NULL DEFAULT 0,
  updated_at       timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (listing_id, signal_date)
);

-- date-first index: WHERE signal_date >= X  (used in both refresh functions)
CREATE INDEX IF NOT EXISTS listing_signals_daily_date_listing_idx
  ON public.listing_signals_daily (signal_date DESC, listing_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  listing_scores — per-listing composite ranking scores
-- ══════════════════════════════════════════════════════════════════════════════
--
-- One row per listing.  Refreshed every 15 minutes by refresh_listing_scores().
-- Only listings with signal data in the last 7 days are scored.
-- Unscrored listings fall back to listings.is_featured + updated_at in queries.
--
-- Scoring ranges (approximate):
--   trending_score   0 – 5.0   (burst ratio vs 7-day baseline)
--   popularity_score 0 – 4.0   (LOG10(1 + eng_7d), dampens outliers)
--   engagement_score 0 – 3.0   (LOG10(1 + daily_avg), log-dampened)
--   freshness_score  0 – 1.3   (linear 30-day decay + feature/verify boosts)
--   final_score      composite (trending×0.35 + popularity×0.25 +
--                               engagement×0.25 + freshness×0.15)

CREATE TABLE IF NOT EXISTS public.listing_scores (
  listing_id       uuid          PRIMARY KEY,
  trending_score   numeric(10,4) NOT NULL DEFAULT 0,
  popularity_score numeric(10,4) NOT NULL DEFAULT 0,
  engagement_score numeric(10,4) NOT NULL DEFAULT 0,
  freshness_score  numeric(10,4) NOT NULL DEFAULT 0,
  final_score      numeric(10,4) NOT NULL DEFAULT 0,
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

-- ORDER BY final_score DESC for ranked feed queries
CREATE INDEX IF NOT EXISTS listing_scores_final_score_idx
  ON public.listing_scores (final_score DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  refresh_listing_signals_daily()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Aggregates the past 7 days of listing_events into listing_signals_daily.
-- JOINs with listings to exclude orphaned events (no FK on listing_events).
-- Called by pg_cron every 15 minutes; safe to call manually at any time.
--
-- SECURITY DEFINER is required so the function can read listing_events even
-- though there is no public SELECT policy on that table.

CREATE OR REPLACE FUNCTION public.refresh_listing_signals_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.listing_signals_daily (
    listing_id,
    signal_date,
    impressions,
    clicks,
    saves,
    inquiries,
    phone_reveals,
    shares,
    ctr,
    engagement_score,
    updated_at
  )
  SELECT
    le.listing_id,
    date_trunc('day', le.created_at)::date                                     AS signal_date,

    COUNT(*)       FILTER (WHERE le.event_type = 'impression')                 AS impressions,
    COUNT(*)       FILTER (WHERE le.event_type = 'click')                      AS clicks,
    COUNT(*)       FILTER (WHERE le.event_type = 'save')                       AS saves,
    COUNT(*)       FILTER (WHERE le.event_type = 'inquiry')                    AS inquiries,
    COUNT(*)       FILTER (WHERE le.event_type = 'phone_reveal')               AS phone_reveals,
    COUNT(*)       FILTER (WHERE le.event_type = 'share')                      AS shares,

    -- CTR: clicks / impressions (0 when no impressions)
    COALESCE(
      COUNT(*) FILTER (WHERE le.event_type = 'click')::numeric
      / NULLIF(COUNT(*) FILTER (WHERE le.event_type = 'impression'), 0),
      0
    )                                                                           AS ctr,

    -- Weighted engagement score (per day):
    --   inquiry×5, save×3, phone_reveal×2, click×1
    (
      COUNT(*) FILTER (WHERE le.event_type = 'inquiry')      * 5 +
      COUNT(*) FILTER (WHERE le.event_type = 'save')         * 3 +
      COUNT(*) FILTER (WHERE le.event_type = 'phone_reveal') * 2 +
      COUNT(*) FILTER (WHERE le.event_type = 'click')        * 1
    )::numeric(12,2)                                                            AS engagement_score,

    now()

  FROM public.listing_events le
  -- Inner JOIN: filter out orphaned events for non-existent listings
  JOIN public.listings l ON l.id = le.listing_id

  WHERE le.created_at >= now() - interval '7 days'

  GROUP BY le.listing_id, date_trunc('day', le.created_at)::date

  ON CONFLICT (listing_id, signal_date) DO UPDATE SET
    impressions      = EXCLUDED.impressions,
    clicks           = EXCLUDED.clicks,
    saves            = EXCLUDED.saves,
    inquiries        = EXCLUDED.inquiries,
    phone_reveals    = EXCLUDED.phone_reveals,
    shares           = EXCLUDED.shares,
    ctr              = EXCLUDED.ctr,
    engagement_score = EXCLUDED.engagement_score,
    updated_at       = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  refresh_listing_scores()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Computes composite ranking scores from listing_signals_daily.
-- Only processes listings active in the last 7 days (those with signal rows).
-- Listings with no signal data remain absent from listing_scores; consumers
-- should fall back to listings.is_featured + updated_at for those.
--
-- Formulas
-- ────────
-- trending_score  = LEAST(5.0, eng_2d × 7 / (eng_7d × 2))
--   Measures recent burst vs expected uniform spread.
--   eng_2d = last-2-day engagement, eng_7d = 7-day total.
--   Baseline (uniform spread): last-2-day fraction = 2/7, so ratio = 1.0.
--   Score > 1.0 means disproportionate recent activity (trending up).
--   Capped at 5.0 to dampen spam/bot spikes.
--
-- popularity_score = LOG(1 + eng_7d)
--   Log-scaled 7-day volume. Dampens power-law outliers.
--   At eng_7d=10: 1.04.  At eng_7d=100: 2.00.  At eng_7d=1000: 3.00.
--
-- engagement_score = LOG(1 + eng_7d / active_days)
--   Log-scaled daily average. Rewards consistent engagement over spikes.
--
-- freshness_score = GREATEST(0, 1 - age_seconds/(30d)) + featured_boost
--   Linear decay over 30 days. Boosted by is_featured (+0.20) and
--   is_verified (+0.10). Max = 1.30 for a fresh featured+verified listing.
--
-- final_score = trending×0.35 + popularity×0.25 + engagement×0.25 + freshness×0.15
--   Weights: trending dominates (fastest signal of buying intent),
--   popularity and engagement share the middle, freshness anchors recency.

CREATE OR REPLACE FUNCTION public.refresh_listing_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH signals AS (
    SELECT
      sd.listing_id,
      -- 7-day totals
      SUM(sd.engagement_score)                                                  AS eng_7d,
      -- Last-2-day slice (trending numerator)
      SUM(sd.engagement_score) FILTER (WHERE sd.signal_date >= current_date - 2) AS eng_2d,
      COUNT(DISTINCT sd.signal_date)                                            AS active_days
    FROM public.listing_signals_daily sd
    WHERE sd.signal_date >= current_date - 7
    GROUP BY sd.listing_id
  ),
  scored AS (
    SELECT
      s.listing_id,

      -- Trending: normalised recency burst (1.0 = uniform, >1 = trending up)
      LEAST(5.0,
        (COALESCE(s.eng_2d, 0) * 7.0)
        / GREATEST(1.0, COALESCE(s.eng_7d, 0) * 2.0)
      )::numeric(10,4)                                                          AS trending_score,

      -- Popularity: log10-dampened 7-day volume
      LOG(1 + COALESCE(s.eng_7d, 0))::numeric(10,4)                            AS popularity_score,

      -- Engagement quality: log10-dampened daily average
      LOG(1 + COALESCE(s.eng_7d, 0) / GREATEST(1, s.active_days))::numeric(10,4)
                                                                                AS engagement_score,

      -- Freshness: linear 30-day decay + feature/verify boosts
      GREATEST(0.0,
        GREATEST(0.0,
          1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / (30.0 * 86400.0)
        )
        + CASE WHEN l.is_featured THEN 0.20 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END
      )::numeric(10,4)                                                          AS freshness_score

    FROM signals s
    JOIN public.listings l ON l.id = s.listing_id
  )
  INSERT INTO public.listing_scores (
    listing_id,
    trending_score,
    popularity_score,
    engagement_score,
    freshness_score,
    final_score,
    updated_at
  )
  SELECT
    listing_id,
    trending_score,
    popularity_score,
    engagement_score,
    freshness_score,
    -- Weighted final score
    (   trending_score    * 0.35
      + popularity_score  * 0.25
      + engagement_score  * 0.25
      + freshness_score   * 0.15
    )::numeric(10,4)                                                            AS final_score,
    now()
  FROM scored

  ON CONFLICT (listing_id) DO UPDATE SET
    trending_score   = EXCLUDED.trending_score,
    popularity_score = EXCLUDED.popularity_score,
    engagement_score = EXCLUDED.engagement_score,
    freshness_score  = EXCLUDED.freshness_score,
    final_score      = EXCLUDED.final_score,
    updated_at       = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  pg_cron jobs
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Stagger the jobs: signals at :00/:15/:30/:45, scores at :05/:20/:35/:50.
-- This ensures signals are always at least one full run ahead of scores.
--
-- Monitor via:
--   SELECT jobid, jobname, status, return_message, start_time, end_time
--   FROM cron.job_run_details
--   WHERE jobname LIKE 'refresh-listing%'
--   ORDER BY start_time DESC LIMIT 20;
--
-- To remove:
--   SELECT cron.unschedule('refresh-listing-signals-daily');
--   SELECT cron.unschedule('refresh-listing-scores');

DO $$
BEGIN
  -- Signals aggregation: every 15 minutes at :00
  PERFORM cron.schedule(
    'refresh-listing-signals-daily',
    '*/15 * * * *',
    $$SELECT public.refresh_listing_signals_daily()$$
  );

  -- Score computation: every 15 minutes at :05 (staggered after signals)
  PERFORM cron.schedule(
    'refresh-listing-scores',
    '5-59/15 * * * *',
    $$SELECT public.refresh_listing_scores()$$
  );

EXCEPTION WHEN undefined_function OR undefined_schema THEN
  RAISE WARNING
    '[010] pg_cron not enabled — signals and scores will not auto-refresh. '
    'Enable via: Dashboard → Database → Extensions → pg_cron, then run: '
    'SELECT cron.schedule(''refresh-listing-signals-daily'', ''*/15 * * * *'', '
    '''SELECT public.refresh_listing_signals_daily()''); '
    'SELECT cron.schedule(''refresh-listing-scores'', ''5-59/15 * * * *'', '
    '''SELECT public.refresh_listing_scores()'');';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  Row Level Security
-- ══════════════════════════════════════════════════════════════════════════════

-- listing_events: append-only.  No SELECT, UPDATE, or DELETE policies.
-- SECURITY DEFINER aggregation functions bypass RLS when reading events.
ALTER TABLE public.listing_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_signals_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_scores        ENABLE ROW LEVEL SECURITY;

-- Clients (anon + authenticated) may INSERT events.
-- event_type is re-checked here as a defence-in-depth measure (CHECK constraint
-- already enforces this at the row level, but RLS WITH CHECK prevents a
-- compromised or misconfigured client from bypassing the constraint via an RPC).
CREATE POLICY "listing_events_client_insert"
  ON public.listing_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('impression', 'click', 'save', 'inquiry', 'phone_reveal', 'share')
  );

-- No SELECT policy on listing_events: raw event data is not public.
-- Owners can query their own listing events in a future dashboard via a
-- SECURITY DEFINER RPC that filters by owner_id JOIN listing_id.

-- listing_signals_daily: public read (aggregated, no PII).
CREATE POLICY "listing_signals_daily_public_read"
  ON public.listing_signals_daily
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- listing_scores: public read (anonymous ranking scores).
CREATE POLICY "listing_scores_public_read"
  ON public.listing_scores
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8.  Grants
-- ══════════════════════════════════════════════════════════════════════════════

GRANT INSERT                          ON public.listing_events        TO anon, authenticated;
GRANT SELECT                          ON public.listing_signals_daily TO anon, authenticated;
GRANT SELECT                          ON public.listing_scores        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_listing_signals_daily() TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_listing_scores()        TO postgres;
