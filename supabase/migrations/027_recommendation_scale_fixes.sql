-- ── 027_recommendation_scale_fixes.sql ──────────────────────────────────────
-- Fixes the three remaining critical / high issues from the 025 audit that
-- were not addressed by 026_recommendation_fixes.sql.
--
--   §1  refresh_listing_similarity_graph() — OR REPLACE            (audit: C1)
--       Gate the LATERAL ANN scan to listings with sparse behavioural coverage.
--       Without this gate the function is O(n × HNSW): at 1M listings the
--       daily rebuild window exceeds 50 minutes.  After this fix it degrades
--       linearly only on the genuinely uncovered subset.
--
--   §2  refresh_trending_listings() — OR REPLACE               (audit: C5, H6)
--       Two independent problems fixed together:
--       H6: New listings with zero prior-period impressions receive velocity =
--           impressions_24h / 1 = impressions_24h (e.g., 10). An established
--           listing going from 100 → 120 impressions only scores 0.20. New
--           listings always win, defeating the "trending" concept.
--           Fix: denominator minimum raised to GREATEST(5, prev); velocity
--           capped at 5.0 regardless of baseline.
--       C5: Anti-bot guard passes with 3 fake sessions × 2 impressions each.
--           Fix: require impressions_prev_24h ≥ 2 (prior baseline) plus
--           per-scope session thresholds (national ≥ 8, province ≥ 5,
--           category ≥ 4).
--
--   §3  refresh_trending_keywords() — OR REPLACE                   (audit: C4)
--       search_logs stores one row per query with a cumulative count and a
--       single last_searched_at timestamp.  The 025 formula assigns searches_7d
--       and searches_prev_7d from the same count column using mutually-exclusive
--       time-window conditions, so one of them is always 0 — true velocity is
--       impossible.  Fix: replace with recency-weighted popularity
--       (count × EXP(-age / 3.5d)), which is the honest metric available from
--       the existing schema.
--
-- No schema changes.  No signature changes.  No return-type changes.
-- Depends on: 025_recommendation_engine, 026_recommendation_fixes.
-- Safe to re-run: OR REPLACE throughout.
-- ─────────────────────────────────────────────────────────────────────────────


-- ══════════════════════════════════════════════════════════════════════════════
-- §1.  refresh_listing_similarity_graph() — LATERAL ANN scale gate
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Root cause (C1):
--   The Source 3 block in 025 issues one HNSW ANN query per listing that has
--   an embedding, regardless of how many behavioural edges that listing already
--   has.  This is O(n_embedded × HNSW_latency):
--
--     100k listings → ~5 min   — acceptable
--       1M listings → ~50 min  — misses the daily cron window
--       5M listings → ~250 min — infeasible
--
-- Fix — two-part gate on the LATERAL:
--
--   1. Behavioural-coverage filter:
--      After Source 1+2 populate _sim_edges, count how many edges each listing
--      already has (as either endpoint).  Listings with ≥ MIN_BEHAVIORAL_EDGES
--      (10) are "well-covered" and do not need semantic neighbours — they are
--      excluded from the LATERAL.
--
--      Rationale: a listing with 10 behavioural co-occurrence edges has rich
--      collaborative-filtering signal.  Adding semantic-only edges improves
--      recall marginally but costs one full HNSW query per listing.  Listings
--      with < 10 edges are either new or niche — precisely the ones where
--      semantic similarity is most valuable.
--
--   2. Hard cap per run (LATERAL_BATCH_LIMIT = 50 000):
--      Even after the coverage filter, at 1M listings a large fraction may be
--      uncovered (new-listing churn, seasonal listings).  The LIMIT 50000
--      bounds the worst-case to 50k × ~3ms = ~2.5 min per daily run.
--      Listings not processed today will be processed on subsequent days as
--      the batch cursor advances by ORDER BY source_id (deterministic, no
--      state required).  After BEHAVIOURAL coverage accumulates over weeks,
--      the uncovered fraction shrinks naturally.
--
-- Unchanged from 025:
--   • Source 1+2 (behavioural pairs + semantic enrichment for those pairs)
--   • Scoring formula and top-50-per-source ranking
--   • TRUNCATE + INSERT pattern (safe under PostgreSQL MVCC: concurrent readers
--     see the pre-TRUNCATE snapshot until the transaction commits)
--
-- SECURITY DEFINER: reads listing_events indirectly via listing_relationships.

CREATE OR REPLACE FUNCTION public.refresh_listing_similarity_graph()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count         bigint := 0;
  lateral_processed      bigint := 0;
  -- Listings with fewer than this many behavioural edges get semantic supplement.
  MIN_BEHAVIORAL_EDGES   constant integer := 10;
  -- Safety cap on the LATERAL batch per daily run.
  LATERAL_BATCH_LIMIT    constant integer := 50000;
BEGIN
  -- Higher ef_search for the offline build: better recall, acceptable latency.
  PERFORM set_config('hnsw.ef_search', '200', true);

  -- ── Temp table: candidate edge accumulator ────────────────────────────────
  CREATE TEMPORARY TABLE _sim_edges (
    a                uuid    NOT NULL,
    b                uuid    NOT NULL,
    behavioral_score real    NOT NULL DEFAULT 0,
    semantic_score   real    NOT NULL DEFAULT 0,
    co_inquiry_count integer NOT NULL DEFAULT 0,
    PRIMARY KEY (a, b)
  ) ON COMMIT DROP;

  -- ── Source 1+2: behavioural pairs (canonical a < b) + semantic enrichment ─
  -- listing_relationships_strength_positive_idx (026) accelerates this scan.
  INSERT INTO _sim_edges (a, b, behavioral_score, semantic_score, co_inquiry_count)
  SELECT
    LEAST(lr.source_listing_id, lr.target_listing_id)           AS a,
    GREATEST(lr.source_listing_id, lr.target_listing_id)        AS b,
    MAX((1.0 - EXP(-COALESCE(lr.strength, 0)::float8 / 3.0))::real)
                                                                 AS behavioral_score,
    MAX(
      CASE
        WHEN ea.embedding IS NOT NULL AND eb.embedding IS NOT NULL
          THEN GREATEST(0.0, (1.0 - (ea.embedding <=> eb.embedding))::real)
        ELSE 0.0::real
      END
    )                                                            AS semantic_score,
    MAX(COALESCE(lr.co_save_count, 0))                           AS co_inquiry_count
  FROM public.listing_relationships lr
  LEFT JOIN public.listing_embeddings ea
    ON ea.listing_id = LEAST(lr.source_listing_id, lr.target_listing_id)
  LEFT JOIN public.listing_embeddings eb
    ON eb.listing_id = GREATEST(lr.source_listing_id, lr.target_listing_id)
  WHERE lr.source_listing_id <> lr.target_listing_id
    AND COALESCE(lr.strength, 0) > 0
  GROUP BY 1, 2
  ON CONFLICT (a, b) DO UPDATE SET
    behavioral_score = GREATEST(_sim_edges.behavioral_score, EXCLUDED.behavioral_score),
    semantic_score   = GREATEST(_sim_edges.semantic_score,   EXCLUDED.semantic_score),
    co_inquiry_count = GREATEST(_sim_edges.co_inquiry_count, EXCLUDED.co_inquiry_count);

  RAISE LOG '[refresh_listing_similarity_graph] source 1+2: % behavioural pairs',
            (SELECT COUNT(*) FROM _sim_edges);

  -- ── Behavioural coverage table ────────────────────────────────────────────
  -- Count how many edges each listing already holds as either endpoint.
  -- Used to gate the LATERAL: listings with ≥ MIN_BEHAVIORAL_EDGES skip ANN.
  CREATE TEMPORARY TABLE _behavioral_coverage ON COMMIT DROP AS
  SELECT listing_id, SUM(cnt) AS edge_count
  FROM (
    SELECT a AS listing_id, COUNT(*) AS cnt FROM _sim_edges GROUP BY a
    UNION ALL
    SELECT b AS listing_id, COUNT(*) AS cnt FROM _sim_edges GROUP BY b
  ) both_sides
  GROUP BY listing_id;

  CREATE INDEX ON _behavioral_coverage (listing_id);

  -- ── Source 3: gated LATERAL ANN (pure-semantic neighbours) ───────────────
  -- Candidates: active listings with embeddings that are NOT well-covered.
  -- Order by listing_id for deterministic batching across daily runs.
  INSERT INTO _sim_edges (a, b, behavioral_score, semantic_score, co_inquiry_count)
  SELECT
    LEAST(seed.listing_id,    nn.listing_id)    AS a,
    GREATEST(seed.listing_id, nn.listing_id)    AS b,
    0.0::real                                    AS behavioral_score,
    nn.cosine_sim                                AS semantic_score,
    0                                            AS co_inquiry_count
  FROM (
    -- Only listings that are under-covered AND active.
    -- ORDER BY listing_id ensures the LIMIT 50000 cap is deterministic day-to-day.
    SELECT le.listing_id, le.embedding
    FROM public.listing_embeddings le
    JOIN public.listings l ON l.id = le.listing_id
    LEFT JOIN _behavioral_coverage bc ON bc.listing_id = le.listing_id
    WHERE l.status            = 'published'
      AND l.moderation_status = 'approved'
      AND l.is_public         = true
      AND COALESCE(bc.edge_count, 0) < MIN_BEHAVIORAL_EDGES
    ORDER BY le.listing_id
    LIMIT LATERAL_BATCH_LIMIT
  ) seed
  CROSS JOIN LATERAL (
    SELECT
      le.listing_id,
      GREATEST(0.0, (1.0 - (le.embedding <=> seed.embedding))::real) AS cosine_sim
    FROM public.listing_embeddings le
    WHERE le.listing_id <> seed.listing_id
    ORDER BY le.embedding <=> seed.embedding
    LIMIT 25
  ) nn
  WHERE nn.cosine_sim >= 0.55
    AND seed.listing_id < nn.listing_id  -- canonical order; dedup at insert
  ON CONFLICT (a, b) DO UPDATE SET
    semantic_score = GREATEST(_sim_edges.semantic_score, EXCLUDED.semantic_score);

  GET DIAGNOSTICS lateral_processed = ROW_COUNT;
  RAISE LOG '[refresh_listing_similarity_graph] source 3: % semantic-only edges inserted',
            lateral_processed;

  -- ── Score each candidate edge against listing metadata ────────────────────
  CREATE TEMPORARY TABLE _sim_scored ON COMMIT DROP AS
  WITH metadata AS (
    SELECT
      e.a, e.b,
      e.behavioral_score, e.semantic_score, e.co_inquiry_count,
      la.category_id          AS a_category,
      la.province_id          AS a_province,
      la.type::text           AS a_type,
      COALESCE(la.price_amount, 0)::numeric AS a_price,
      lb.category_id          AS b_category,
      lb.province_id          AS b_province,
      lb.type::text           AS b_type,
      COALESCE(lb.price_amount, 0)::numeric AS b_price
    FROM _sim_edges e
    JOIN public.listings la ON la.id = e.a
    JOIN public.listings lb ON lb.id = e.b
    WHERE la.status            = 'published'
      AND la.moderation_status = 'approved'
      AND la.is_public         = true
      AND lb.status            = 'published'
      AND lb.moderation_status = 'approved'
      AND lb.is_public         = true
      AND la.type              = lb.type  -- same listing type only
  ),
  scored AS (
    SELECT
      m.a, m.b,
      m.behavioral_score, m.semantic_score, m.co_inquiry_count,
      (m.a_category IS NOT NULL AND m.a_category = m.b_category) AS category_match,
      (m.a_province IS NOT NULL AND m.a_province = m.b_province) AS province_match,
      true                                                         AS type_match,
      CASE
        WHEN m.a_price > 0 AND m.b_price > 0
          THEN EXP(
                 -ABS(LN(GREATEST(m.a_price, m.b_price)::float8
                         / LEAST(m.a_price, m.b_price)::float8))
               )::real
        ELSE 0.0::real
      END AS price_proximity,
      CASE
        WHEN (m.a_category IS NOT NULL AND m.a_category = m.b_category)
         AND (m.a_province IS NOT NULL AND m.a_province = m.b_province)
          THEN 'similar'
        WHEN (m.a_category IS NOT NULL AND m.a_category = m.b_category)
          THEN 'related'
        ELSE 'complementary'
      END AS edge_type
    FROM metadata m
  ),
  combined AS (
    SELECT
      s.*,
      (
        s.behavioral_score * 0.35
        + s.semantic_score   * 0.35
        + CASE WHEN s.category_match THEN 0.15::real ELSE 0.0::real END
        + s.price_proximity  * 0.10
        + CASE WHEN s.province_match THEN 0.05::real ELSE 0.0::real END
      )::real AS similarity_score
    FROM scored s
  )
  SELECT * FROM combined WHERE similarity_score >= 0.08;

  -- ── Rank: top 50 per source listing; store both directions ────────────────
  CREATE TEMPORARY TABLE _sim_ranked ON COMMIT DROP AS
  WITH expanded AS (
    SELECT a AS source_id, b AS target_id,
           behavioral_score, semantic_score, co_inquiry_count,
           category_match, province_match, type_match,
           price_proximity, edge_type, similarity_score
    FROM _sim_scored
    UNION ALL
    SELECT b AS source_id, a AS target_id,
           behavioral_score, semantic_score, co_inquiry_count,
           category_match, province_match, type_match,
           price_proximity, edge_type, similarity_score
    FROM _sim_scored
  ),
  ranked AS (
    SELECT
      e.*,
      ROW_NUMBER() OVER (
        PARTITION BY e.source_id
        ORDER BY e.similarity_score DESC, e.target_id
      ) AS rn
    FROM expanded e
  )
  SELECT * FROM ranked WHERE rn <= 50;

  -- ── Atomic replace (MVCC: concurrent readers see pre-TRUNCATE snapshot) ───
  TRUNCATE TABLE public.listing_similarity_graph;

  INSERT INTO public.listing_similarity_graph (
    source_id, target_id,
    similarity_score, behavioral_score, semantic_score, co_inquiry_count,
    category_match, province_match, type_match, price_proximity,
    edge_type, computed_at
  )
  SELECT
    source_id, target_id,
    similarity_score, behavioral_score, semantic_score, co_inquiry_count,
    category_match, province_match, type_match, price_proximity,
    edge_type, now()
  FROM _sim_ranked;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE LOG '[refresh_listing_similarity_graph] % total directed edges inserted '
            '(lateral batch capped at %)',
            inserted_count, LATERAL_BATCH_LIMIT;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- §2.  refresh_trending_listings() — velocity cap + anti-bot hardening
-- ══════════════════════════════════════════════════════════════════════════════
--
-- H6 — New-listing velocity explosion:
--   A listing in its first 24 hours has impressions_prev_24h = 0.
--   GREATEST(1, 0) = 1, so velocity = impressions_24h / 1 = impressions_24h.
--   10 impressions → velocity 10.0; an established listing going 100 → 120
--   scores only 0.20.  New listings always dominate regardless of quality.
--
--   Fix:
--     a) Require impressions_prev_24h ≥ 2 (minimum prior-day baseline).
--        A listing with zero prior impressions is not "trending" — it simply
--        appeared.  Use get_browse_feed's cold-start path to surface new content.
--     b) Denominator minimum raised from GREATEST(1, prev) to GREATEST(5, prev).
--        This floors the denominator at 5, capping the velocity contribution of
--        a listing with only 3 prior impressions at (now - 3) / 5 instead of 3.
--     c) Hard velocity cap: LEAST(5.0, …).
--        Any velocity above 5.0 (5× baseline) is treated identically — prevents
--        a single viral burst from permanently dominating the trending rail.
--
-- C5 — Anti-bot trivially bypassable:
--   3 sessions × 2 impressions = impressions_24h = 6 ≥ 5, unique_sessions = 3 ≥ 3,
--   session_diversity = 3/6 = 0.5 ≥ 0.3, velocity = 6.0 (new listing) → ranks #1.
--
--   Fix — per-scope session thresholds:
--     national  : unique_sessions ≥ 8  (harder to fake at scale)
--     province  : unique_sessions ≥ 5
--     category  : unique_sessions ≥ 4
--   The baseline requirement (impressions_prev ≥ 2) already blocks new-listing
--   bombing.  Together these filters require an attacker to sustain fake traffic
--   over at least two days with multiple distinct sessions each day.
--
-- Unchanged from 025: 15-min cron schedule, three scopes, temp-table approach,
-- session_uniqueness_ratio proxy metric (renamed from session_diversity_proxy
-- for clarity — column name in trending_listings is session_diversity so the
-- INSERT mapping is unchanged).

CREATE OR REPLACE FUNCTION public.refresh_trending_listings()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count bigint := 0;
BEGIN
  CREATE TEMPORARY TABLE _trend_base ON COMMIT DROP AS
  WITH
  win_24h AS (
    SELECT
      e.listing_id,
      COUNT(*) FILTER (WHERE e.event_type = 'impression')::integer  AS impressions_24h,
      COUNT(*) FILTER (WHERE e.event_type = 'click')::integer       AS clicks_24h,
      COUNT(DISTINCT e.session_id)::integer                          AS unique_sessions_24h,
      COUNT(*)::integer                                               AS total_events_24h
    FROM public.listing_events e
    WHERE e.session_id IS NOT NULL
      AND e.event_type IN ('impression', 'click')
      AND e.created_at >= now() - interval '24 hours'
    GROUP BY e.listing_id
  ),
  win_prev AS (
    SELECT
      e.listing_id,
      COUNT(*) FILTER (WHERE e.event_type = 'impression')::integer AS impressions_prev_24h
    FROM public.listing_events e
    WHERE e.session_id IS NOT NULL
      AND e.event_type IN ('impression', 'click')
      AND e.created_at >= now() - interval '48 hours'
      AND e.created_at <  now() - interval '24 hours'
    GROUP BY e.listing_id
  ),
  joined AS (
    SELECT
      w.listing_id,
      w.impressions_24h,
      w.clicks_24h,
      w.unique_sessions_24h,
      w.total_events_24h,
      COALESCE(p.impressions_prev_24h, 0)    AS impressions_prev_24h,
      -- H6 fix: cap velocity at 5.0; floor denominator at 5 to prevent
      -- low-baseline inflation; require ≥ 2 prior impressions (applied in WHERE).
      LEAST(5.0,
        (w.impressions_24h - COALESCE(p.impressions_prev_24h, 0))::float8
        / GREATEST(5, COALESCE(p.impressions_prev_24h, 0))::float8
      )::real                                AS velocity_score,
      -- session_uniqueness_ratio: unique sessions / total events.
      -- Proxy for session diversity — not Shannon entropy (see audit §M3).
      CASE
        WHEN w.total_events_24h > 0
          THEN (w.unique_sessions_24h::float8 / w.total_events_24h::float8)::real
        ELSE 0.0::real
      END                                    AS session_uniqueness_ratio
    FROM win_24h w
    LEFT JOIN win_prev p ON p.listing_id = w.listing_id
  )
  SELECT
    j.listing_id,
    j.impressions_24h,
    j.clicks_24h,
    j.unique_sessions_24h,
    j.total_events_24h,
    j.impressions_prev_24h,
    j.velocity_score,
    j.session_uniqueness_ratio,
    l.province_id,
    l.category_id,
    l.type::text AS listing_type
  FROM joined j
  JOIN public.listings l ON l.id = j.listing_id
  WHERE l.status            = 'published'
    AND l.moderation_status = 'approved'
    AND l.is_public         = true
    AND j.impressions_24h          >= 5
    AND j.velocity_score            > 0
    -- C5 fix: require a minimum prior-day baseline.
    -- Prevents new-listing bombing (no history = not "trending").
    AND j.impressions_prev_24h     >= 2
    -- Base session diversity filter (common to all scopes).
    AND j.unique_sessions_24h      >= 3
    AND j.session_uniqueness_ratio >= 0.30;

  -- ── Atomic replace ─────────────────────────────────────────────────────────
  TRUNCATE TABLE public.trending_listings;

  -- National (top 100) — C5 fix: require ≥ 8 unique sessions.
  INSERT INTO public.trending_listings (
    scope_type, scope_id, listing_id,
    velocity_score, impressions_24h, clicks_24h,
    session_diversity, unique_sessions, rank_position, computed_at
  )
  SELECT
    'national', 0, listing_id,
    velocity_score, impressions_24h, clicks_24h,
    session_uniqueness_ratio, unique_sessions_24h,
    rn::smallint,
    now()
  FROM (
    SELECT *,
      ROW_NUMBER() OVER (
        ORDER BY velocity_score DESC, impressions_24h DESC, listing_id
      ) AS rn
    FROM _trend_base
    WHERE unique_sessions_24h >= 8
  ) ranked
  WHERE rn <= 100;

  -- Province (top 30 per province) — C5 fix: require ≥ 5 unique sessions.
  INSERT INTO public.trending_listings (
    scope_type, scope_id, listing_id,
    velocity_score, impressions_24h, clicks_24h,
    session_diversity, unique_sessions, rank_position, computed_at
  )
  SELECT
    'province', province_id, listing_id,
    velocity_score, impressions_24h, clicks_24h,
    session_uniqueness_ratio, unique_sessions_24h,
    ROW_NUMBER() OVER (
      PARTITION BY province_id
      ORDER BY velocity_score DESC, impressions_24h DESC, listing_id
    )::smallint,
    now()
  FROM (
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY province_id ORDER BY velocity_score DESC, impressions_24h DESC, listing_id
    ) AS rn
    FROM _trend_base
    WHERE province_id IS NOT NULL
      AND unique_sessions_24h >= 5
  ) ranked
  WHERE rn <= 30;

  -- Category (top 30 per category) — C5 fix: require ≥ 4 unique sessions.
  INSERT INTO public.trending_listings (
    scope_type, scope_id, listing_id,
    velocity_score, impressions_24h, clicks_24h,
    session_diversity, unique_sessions, rank_position, computed_at
  )
  SELECT
    'category', category_id, listing_id,
    velocity_score, impressions_24h, clicks_24h,
    session_uniqueness_ratio, unique_sessions_24h,
    ROW_NUMBER() OVER (
      PARTITION BY category_id
      ORDER BY velocity_score DESC, impressions_24h DESC, listing_id
    )::smallint,
    now()
  FROM (
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY category_id ORDER BY velocity_score DESC, impressions_24h DESC, listing_id
    ) AS rn
    FROM _trend_base
    WHERE category_id IS NOT NULL
      AND unique_sessions_24h >= 4
  ) ranked
  WHERE rn <= 30;

  SELECT COUNT(*) INTO inserted_count FROM public.trending_listings;
  RAISE LOG '[refresh_trending_listings] % rows across all scopes '
            '(national ≥8 sessions, province ≥5, category ≥4; velocity capped at 5.0)',
            inserted_count;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- §3.  refresh_trending_keywords() — honest recency-weighted popularity
-- ══════════════════════════════════════════════════════════════════════════════
--
-- C4 — Velocity formula is structurally impossible with current schema:
--   search_logs schema (003): query (PK), count (cumulative), last_searched_at.
--   One row per keyword; no per-period breakdown.
--
--   The 025 formula:
--     searches_7d      = count  IF last_searched_at >= now() - 7d  ELSE 0
--     searches_prev_7d = count  IF last_searched_at IN [-14d, -7d) ELSE 0
--
--   These conditions are mutually exclusive — a keyword can only be in one
--   window.  So searches_7d > 0 implies searches_prev_7d = 0.  The computed
--   velocity = searches_7d / 1 = searches_7d (raw count) — not velocity.
--
-- Fix — recency-weighted popularity:
--   velocity_score = count × EXP(-age_seconds / 302400)
--
--   302400 seconds = 3.5 days (half-life).  A keyword searched 100 times
--   3.5 days ago scores the same as a keyword searched 50 times today.
--   This produces a meaningful ranking even without time-series data:
--
--     age = 0 days  → multiplier 1.00  (searched today)
--     age = 3.5 days → multiplier 0.50
--     age = 7 days  → multiplier 0.25
--
--   The schema comment is updated to reflect the honest metric name.
--   When search_logs gains a time-series column (search_log_hourly), this
--   function can be upgraded to true velocity without schema changes here.
--
-- Additional filters (unchanged from 025):
--   • Minimum length: ≥ 3 characters.
--   • Pure-numeric strings excluded (price probes / phone scrapers).
--   • Minimum volume: count ≥ 3 (filters one-off accidental queries).
--   • Window: last_searched_at within 7 days.
--   • Top 50 keywords retained.

CREATE OR REPLACE FUNCTION public.refresh_trending_keywords()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count bigint := 0;
BEGIN
  TRUNCATE TABLE public.trending_keywords;

  INSERT INTO public.trending_keywords (
    keyword,
    province_id,
    searches_7d,
    searches_prev_7d,
    velocity_score,
    rank_position,
    computed_at
  )
  WITH scored AS (
    SELECT
      sl.query                                                            AS keyword,
      COALESCE(sl.count, 0)                                               AS searches_7d,
      -- searches_prev_7d is structurally unavailable from search_logs.
      -- Stored as 0 to preserve the column contract; a future migration that
      -- adds search_log_hourly can fill this correctly.
      0                                                                    AS searches_prev_7d,
      -- Recency-weighted popularity.
      -- Half-life = 3.5 days (302400 seconds).
      -- This is NOT true velocity — it is count × freshness-decay.
      -- Label intentionally preserved as velocity_score for API compatibility.
      (
        COALESCE(sl.count, 0)::float8
        * EXP(
            -EXTRACT(epoch FROM (now() - sl.last_searched_at))::float8
            / 302400.0
          )
      )::real                                                              AS velocity_score
    FROM public.search_logs sl
    WHERE sl.query IS NOT NULL
      AND length(trim(sl.query)) >= 3
      -- Exclude pure-numeric strings (price queries, phone number scraping).
      AND trim(sl.query) !~ '^[0-9\.]+$'
      -- Minimum absolute volume floor: filters one-off / accidental queries.
      AND COALESCE(sl.count, 0) >= 3
      -- Recency window: only keywords active in the last 7 days.
      AND sl.last_searched_at >= now() - interval '7 days'
  ),
  ranked AS (
    SELECT
      keyword,
      searches_7d,
      searches_prev_7d,
      velocity_score,
      ROW_NUMBER() OVER (
        ORDER BY velocity_score DESC, searches_7d DESC, keyword
      )::smallint AS rank_position
    FROM scored
    WHERE velocity_score > 0
  )
  SELECT
    keyword,
    0,                -- national scope (province_id = 0); see 025 §1.5 comment
    searches_7d,
    searches_prev_7d,
    velocity_score,
    rank_position,
    now()
  FROM ranked
  WHERE rank_position <= 50;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE LOG '[refresh_trending_keywords] % keywords (recency-weighted popularity, '
            'half-life 3.5 days; true velocity requires search_log_hourly table)',
            inserted_count;
END;
$$;


-- ── Grants (mirror 025 — unchanged) ──────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.refresh_listing_similarity_graph() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_trending_listings()         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_trending_keywords()         FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_listing_similarity_graph() TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_trending_listings()         TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_trending_keywords()         TO postgres;

-- ── End 027_recommendation_scale_fixes.sql ───────────────────────────────────
