-- ── 013_listing_relationships.sql ────────────────────────────────────────────
-- Week 2.6: Graph Discovery Engine.
--
-- Builds a co-occurrence graph over listing_events to surface "users who viewed
-- this also viewed…" style recommendations.  No ML, no embeddings, no external
-- services — pure PostgreSQL set operations.
--
-- What this migration adds:
--   Tables:
--     • listing_relationships       — directional pair strength graph
--
--   Functions:
--     • refresh_listing_relationships() — rebuild graph from co-occurrence events
--
--   pg_cron job:
--     • refresh-listing-relationships  — every 30 min
--
-- Graph construction rules (preserves signal quality):
--   • Co-occurrence window: same session_id, any two events within 30 s–30 min
--     of each other.  (<30 s is likely a bounce; >30 min is a new session.)
--   • Same listing type only (land–land, service–service, …).
--   • Sessions with > 20 distinct listings are excluded (bot/crawler guard).
--   • Rolling window: last 30 days of events.
--
-- Strength formula (log-scaled to dampen outliers):
--   raw = LN(1 + co_view_count)  × 1.0
--       + LN(1 + co_click_count) × 3.0
--       + LN(1 + co_save_count)  × 6.0
--   strength = raw × EXP(−age_days / 30)   (recency decay, 30-day half-life)
--
-- Storage: both directions (A→B and B→A) are inserted so queries
-- WHERE source_listing_id = ? can use the primary-key index directly.
--
-- Relationship type (stored for analytics / filtering):
--   'co_save'          — co_save_count > 0 (strongest signal)
--   'co_click'         — co_click_count > 0 but no co_save
--   'similar_behavior' — co_save_count > 0 AND co_click_count > 0
--   'co_view'          — only co_view_count (weakest)
--
-- Depends on: migrations 001–012
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE throughout.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  listing_relationships
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.listing_relationships (
  source_listing_id  uuid          NOT NULL,
  target_listing_id  uuid          NOT NULL,
  relationship_type  text          NOT NULL DEFAULT 'co_view',
  strength           numeric(10,4) NOT NULL DEFAULT 0,
  co_view_count      integer       NOT NULL DEFAULT 0,
  co_click_count     integer       NOT NULL DEFAULT 0,
  co_save_count      integer       NOT NULL DEFAULT 0,
  last_seen_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (source_listing_id, target_listing_id),
  CONSTRAINT listing_relationships_no_self_loop
    CHECK (source_listing_id <> target_listing_id),
  CONSTRAINT listing_relationships_type_check
    CHECK (relationship_type IN ('co_view', 'co_click', 'co_save', 'similar_behavior'))
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  Indexes
-- ══════════════════════════════════════════════════════════════════════════════

-- getRelatedListings(): forward index — source → top-N by strength
CREATE INDEX IF NOT EXISTS listing_relationships_source_strength_idx
  ON public.listing_relationships (source_listing_id, strength DESC);

-- Reverse direction — useful for admin analytics, not in the hot path
CREATE INDEX IF NOT EXISTS listing_relationships_target_strength_idx
  ON public.listing_relationships (target_listing_id, strength DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  refresh_listing_relationships()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Algorithm:
--   1. session_presence: for each (session_id, listing_id) compute which event
--      types occurred and the latest event timestamp.
--   2. Exclude bot sessions: those with > 20 distinct listings in 30 days.
--   3. co_occurring: cross-join session_presence pairs within the same session
--      where listing_a < listing_b (dedup), same type, time delta in [30 s, 30 min].
--   4. Aggregate pair counts across all sessions.
--   5. Insert both A→B and B→A directions (union) so the forward index covers both.
--   6. Apply recency decay to strength.
--
-- SECURITY DEFINER: reads listing_events (no public SELECT policy).

CREATE OR REPLACE FUNCTION public.refresh_listing_relationships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  decay_constant constant numeric := 2592000.0;  -- 30 days in seconds
BEGIN
  WITH
  -- Step 1: per-session, per-listing presence and event types
  session_presence AS (
    SELECT
      e.session_id,
      e.listing_id,
      -- earliest and latest event time in this session for this listing
      MIN(e.created_at)                                            AS first_seen,
      MAX(e.created_at)                                            AS last_seen,
      BOOL_OR(e.event_type IN ('impression', 'click', 'save',
                               'phone_reveal', 'inquiry'))         AS was_viewed,
      BOOL_OR(e.event_type IN ('click', 'phone_reveal', 'inquiry')) AS was_clicked,
      BOOL_OR(e.event_type = 'save')                               AS was_saved
    FROM public.listing_events e
    WHERE e.session_id IS NOT NULL
      AND e.created_at >= now() - interval '30 days'
    GROUP BY e.session_id, e.listing_id
  ),

  -- Step 2: filter out bot/crawler sessions (> 20 distinct listings)
  valid_sessions AS (
    SELECT session_id
    FROM session_presence
    GROUP BY session_id
    HAVING COUNT(DISTINCT listing_id) BETWEEN 2 AND 20
  ),

  -- Step 3: find co-occurring pairs in valid sessions
  -- a < b ordering deduplicates (a,b)/(b,a) before aggregation
  co_pairs AS (
    SELECT
      a.listing_id                                  AS listing_a,
      b.listing_id                                  AS listing_b,
      GREATEST(a.last_seen, b.last_seen)            AS pair_last_seen,
      -- Co-view: both appeared in same session
      1                                             AS co_view_contrib,
      -- Co-click: both were explicitly clicked in same session
      CASE WHEN a.was_clicked AND b.was_clicked
        THEN 1 ELSE 0 END                           AS co_click_contrib,
      -- Co-save: both were saved in same session
      CASE WHEN a.was_saved AND b.was_saved
        THEN 1 ELSE 0 END                           AS co_save_contrib
    FROM session_presence a
    JOIN session_presence b
      ON  a.session_id = b.session_id
      AND a.listing_id < b.listing_id
      -- 30-min window: the two listings were engaged within 30 min of each other
      AND ABS(EXTRACT(epoch FROM (a.first_seen - b.first_seen))) <= 1800
      -- Exclude same-second bounce pairs (< 30 s apart = not meaningful)
      AND ABS(EXTRACT(epoch FROM (a.first_seen - b.first_seen))) >= 30
    JOIN valid_sessions vs ON vs.session_id = a.session_id
    JOIN public.listings la ON la.id = a.listing_id
    JOIN public.listings lb ON lb.id = b.listing_id
    WHERE la.type = lb.type   -- same listing type only
  ),

  -- Step 4: aggregate pair counts across all sessions
  pair_stats AS (
    SELECT
      listing_a,
      listing_b,
      MAX(pair_last_seen)       AS last_seen_at,
      COUNT(*)::integer         AS co_view_count,
      SUM(co_click_contrib)::integer AS co_click_count,
      SUM(co_save_contrib)::integer  AS co_save_count
    FROM co_pairs
    GROUP BY listing_a, listing_b
  ),

  -- Step 5: compute strength + relationship_type
  pair_scored AS (
    SELECT
      listing_a,
      listing_b,
      last_seen_at,
      co_view_count,
      co_click_count,
      co_save_count,

      CASE
        WHEN co_save_count > 0 AND co_click_count > 0 THEN 'similar_behavior'
        WHEN co_save_count > 0                         THEN 'co_save'
        WHEN co_click_count > 0                        THEN 'co_click'
        ELSE                                                'co_view'
      END AS relationship_type,

      GREATEST(0.0,
        (
          LN(1.0 + co_view_count)  * 1.0
          + LN(1.0 + co_click_count) * 3.0
          + LN(1.0 + co_save_count)  * 6.0
        )
        * EXP(
            -EXTRACT(epoch FROM (now() - last_seen_at))::numeric
            / decay_constant
          )
      )::numeric(10,4) AS strength

    FROM pair_stats
    WHERE co_view_count > 0
  ),

  -- Step 6: expand into both directions (A→B and B→A)
  both_directions AS (
    SELECT listing_a AS source, listing_b AS target,
           relationship_type, strength,
           co_view_count, co_click_count, co_save_count, last_seen_at
    FROM pair_scored
    UNION ALL
    SELECT listing_b AS source, listing_a AS target,
           relationship_type, strength,
           co_view_count, co_click_count, co_save_count, last_seen_at
    FROM pair_scored
  )

  INSERT INTO public.listing_relationships (
    source_listing_id,
    target_listing_id,
    relationship_type,
    strength,
    co_view_count,
    co_click_count,
    co_save_count,
    last_seen_at,
    updated_at
  )
  SELECT
    source,
    target,
    relationship_type,
    strength,
    co_view_count,
    co_click_count,
    co_save_count,
    last_seen_at,
    now()
  FROM both_directions

  ON CONFLICT (source_listing_id, target_listing_id) DO UPDATE SET
    relationship_type = EXCLUDED.relationship_type,
    strength          = EXCLUDED.strength,
    co_view_count     = EXCLUDED.co_view_count,
    co_click_count    = EXCLUDED.co_click_count,
    co_save_count     = EXCLUDED.co_save_count,
    last_seen_at      = EXCLUDED.last_seen_at,
    updated_at        = EXCLUDED.updated_at;

  -- Prune stale relationships (not seen in last 60 days, negligible strength)
  DELETE FROM public.listing_relationships
  WHERE last_seen_at < now() - interval '60 days'
    AND strength < 0.01;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  pg_cron job
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Every 30 min at :17/:47 — staggered away from the 15-min pipeline chain
-- (:00, :05, :08, :11) to avoid DB contention during the aggregation scan.

DO $$
BEGIN
  PERFORM cron.schedule(
    'refresh-listing-relationships',
    '17-59/30 * * * *',
    $$SELECT public.refresh_listing_relationships()$$
  );
EXCEPTION WHEN undefined_function OR undefined_schema THEN
  RAISE WARNING
    '[013] pg_cron not enabled — listing relationships will not auto-refresh. '
    'Enable pg_cron, then run cron.schedule() manually.';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  RLS
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.listing_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_relationships_public_read"
  ON public.listing_relationships FOR SELECT
  TO anon, authenticated USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  Grants
-- ══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON public.listing_relationships TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_listing_relationships TO postgres;
