-- ── 025_recommendation_engine.sql ─────────────────────────────────────────────
-- VIO LOCAL — Recommendation Engine.
--
-- Builds the recommendation layer that sits on top of the behavioural graph
-- (013), the user-affinity tables (012), the commerce graph (017), the quality
-- + CTR signals (010 / 011) and the semantic embeddings (020).  Nothing in this
-- file duplicates work done in earlier migrations — it *consumes* their output
-- and produces:
--
--   Tables (5):
--     • listing_similarity_graph   — unified item-item similarity (behavioural
--                                    + semantic), the source of truth for
--                                    "users also viewed" / "similar to X".
--     • user_interest_vectors      — per-user semantic interest embedding for
--                                    the personalised feed.
--     • user_behavior_profile      — session-level behavioural profile, intent
--                                    stage, and bot-risk score.
--     • trending_listings          — materialised trending by scope (national,
--                                    province, category) with anti-bot guard.
--     • trending_keywords          — keyword velocity from search_logs.
--
--   Refresh functions (5, all SECURITY DEFINER):
--     • refresh_listing_similarity_graph()  — daily 02:00.
--     • refresh_user_interest_vectors()     — every 30 min (:05).
--     • refresh_user_behavior_profiles()    — every 30 min (:20).
--     • refresh_trending_listings()         — every 15 min (:08, :23, :38, :53).
--     • refresh_trending_keywords()         — hourly (:45).
--
--   Query API (4, all SECURITY DEFINER STABLE):
--     • get_similar_listings()          — "similar to X" widget.
--     • get_personalized_feed()         — authenticated home feed.
--     • get_trending_listings()         — discovery / homepage trending rail.
--     • get_recommendation_candidates() — unified candidate pool for the AI
--                                         reranker (companion to
--                                         search_listings_candidates from 024).
--
-- Dependencies:
--   • 001 — listings.
--   • 010 — listing_events, listing_scores.
--   • 011 — listing_ctr_stats, listing_quality_scores.
--   • 012 — user_affinities.
--   • 013 — listing_relationships.
--   • 016 — merchant_trust_scores.
--   • 020 — listing_embeddings (vector(384), HNSW cosine).
--   • 024 — search_listings_candidates conventions for ranking_breakdown jsonb.
--
-- Compiles on PostgreSQL 15 + pgvector ≥ 0.5.
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE / DO $$ BEGIN … END $$.

-- ══════════════════════════════════════════════════════════════════════════════
-- §1.  Tables
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1.1  listing_similarity_graph ─────────────────────────────────────────────
-- Unified item-item similarity.  Stored bidirectionally (A→B and B→A) so the
-- forward index covers the hot "similar to X" lookup.
--
-- edge_type semantics:
--   'similar'        — same category AND same province (strong substitutes).
--   'related'        — same category, different province (compare across regions).
--   'complementary'  — different category but strong behavioural co-engagement
--                      (e.g. tractor → fertiliser).

CREATE TABLE IF NOT EXISTS public.listing_similarity_graph (
  source_id          uuid          NOT NULL,
  target_id          uuid          NOT NULL,
  similarity_score   real          NOT NULL DEFAULT 0,
  behavioral_score   real          NOT NULL DEFAULT 0,
  semantic_score     real          NOT NULL DEFAULT 0,
  co_inquiry_count   integer       NOT NULL DEFAULT 0,
  category_match     boolean       NOT NULL DEFAULT false,
  province_match     boolean       NOT NULL DEFAULT false,
  type_match         boolean       NOT NULL DEFAULT true,
  price_proximity    real          NOT NULL DEFAULT 0,
  edge_type          text          NOT NULL DEFAULT 'similar',
  computed_at        timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, target_id),
  CONSTRAINT listing_similarity_graph_no_self_loop CHECK (source_id <> target_id),
  CONSTRAINT listing_similarity_graph_edge_type_check
    CHECK (edge_type IN ('similar', 'related', 'complementary'))
);

-- ── 1.2  user_interest_vectors ────────────────────────────────────────────────
-- Per-user semantic interest embedding.  Built from the top-20 most-engaged
-- listings for the user in the last 30 days, weighted by event type and
-- recency.  Used for the personalised feed (ANN over listing_embeddings).
--
-- interest_breadth: normalised Shannon entropy across category distribution.
--   0.0 = single-category, 1.0 = uniform over all engaged categories.

CREATE TABLE IF NOT EXISTS public.user_interest_vectors (
  profile_id            uuid          PRIMARY KEY
                          REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_embedding    vector(384)   NOT NULL,
  primary_category_id   integer,
  primary_province_id   integer,
  interest_breadth      real          NOT NULL DEFAULT 0,
  engagement_score      real          NOT NULL DEFAULT 0,
  data_points           integer       NOT NULL DEFAULT 0,
  computed_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

-- ── 1.3  user_behavior_profile ────────────────────────────────────────────────
-- Session-level behavioural analysis and bot-risk classification.
-- bot_risk_score:   0.0 = certainly human, 1.0 = certainly bot.
-- intent_stage:     'exploring'     — browse without inquiries
--                   'comparing'     — moderate inquiry conversion (5–15 %)
--                   'ready_to_buy'  — high inquiry conversion (> 15 %)

CREATE TABLE IF NOT EXISTS public.user_behavior_profile (
  profile_id              uuid          PRIMARY KEY
                            REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_session_length_min  real          NOT NULL DEFAULT 0,
  avg_listings_per_session real         NOT NULL DEFAULT 0,
  avg_dwell_seconds       real          NOT NULL DEFAULT 0,
  sessions_7d             integer       NOT NULL DEFAULT 0,
  preferred_price_min     numeric(18,2),
  preferred_price_max     numeric(18,2),
  browse_to_inquiry_rate  real          NOT NULL DEFAULT 0,
  intent_stage            text          NOT NULL DEFAULT 'exploring',
  bot_risk_score          real          NOT NULL DEFAULT 0,
  bot_risk_factors        jsonb         NOT NULL DEFAULT '{}',
  is_flagged_bot          boolean       NOT NULL DEFAULT false,
  computed_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT user_behavior_profile_intent_check
    CHECK (intent_stage IN ('exploring', 'comparing', 'ready_to_buy'))
);

-- ── 1.4  trending_listings ────────────────────────────────────────────────────
-- Materialised trending feed by scope.
--   scope_type='national' → scope_id = 0
--   scope_type='province' → scope_id = province_id
--   scope_type='category' → scope_id = category_id
--   (scope_type='type' reserved for future use; not populated by refresh.)
--
-- session_diversity is the key anti-bot metric — a high ratio of unique
-- sessions to total events indicates organic distribution; a low ratio
-- indicates a single session / bot inflating impression counts.

CREATE TABLE IF NOT EXISTS public.trending_listings (
  scope_type          text          NOT NULL,
  scope_id            integer       NOT NULL DEFAULT 0,
  listing_id          uuid          NOT NULL
                        REFERENCES public.listings(id) ON DELETE CASCADE,
  velocity_score      real          NOT NULL DEFAULT 0,
  impressions_24h     integer       NOT NULL DEFAULT 0,
  clicks_24h          integer       NOT NULL DEFAULT 0,
  session_diversity   real          NOT NULL DEFAULT 0,
  unique_sessions     integer       NOT NULL DEFAULT 0,
  rank_position       smallint      NOT NULL DEFAULT 0,
  computed_at         timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_type, scope_id, listing_id),
  CONSTRAINT trending_listings_scope_check
    CHECK (scope_type IN ('national', 'province', 'category', 'type'))
);

-- ── 1.5  trending_keywords ────────────────────────────────────────────────────
-- Keyword velocity from search_logs.  search_logs has no province column yet
-- (003), so the refresh populates province_id = 0 (national) only.  When
-- search_logs.province_id is added, the refresh function can be extended
-- without schema changes here.

CREATE TABLE IF NOT EXISTS public.trending_keywords (
  keyword            text          NOT NULL,
  province_id        integer       NOT NULL DEFAULT 0,
  searches_7d        integer       NOT NULL DEFAULT 0,
  searches_prev_7d   integer       NOT NULL DEFAULT 0,
  velocity_score     real          NOT NULL DEFAULT 0,
  rank_position      smallint      NOT NULL DEFAULT 0,
  computed_at        timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (keyword, province_id)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- §2.  Indexes
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Planner notes:
--   The hot path is "similar to X" — get_similar_listings reads source_id = ?
--   ORDER BY similarity_score DESC LIMIT 12.  The (source_id, similarity_score
--   DESC) index covers this without a sort.  The same lookup with edge_type
--   filtering is supported by (source_id, edge_type, similarity_score DESC).
--
-- Scale notes:
--   For 1M listings with ~50 edges/listing, listing_similarity_graph holds
--   ~50M rows.  The composite index is ~3 GB.  Truncate + repopulate per day
--   keeps bloat under control.
--   trending_listings is bounded (≤ 100 national + ~30 × 63 provinces + 30 ×
--   ~80 categories ≈ 4 500 rows) — trivial.

-- listing_similarity_graph
CREATE INDEX IF NOT EXISTS listing_similarity_graph_source_score_idx
  ON public.listing_similarity_graph (source_id, similarity_score DESC);

CREATE INDEX IF NOT EXISTS listing_similarity_graph_source_type_score_idx
  ON public.listing_similarity_graph (source_id, edge_type, similarity_score DESC);

CREATE INDEX IF NOT EXISTS listing_similarity_graph_target_score_idx
  ON public.listing_similarity_graph (target_id, similarity_score DESC);

-- user_interest_vectors — HNSW for ANN-driven personalised feed.
-- Planner note: the ANN scan is by query side; here we ANN over
-- listing_embeddings using a user vector, but the same vector type lives in
-- this table for the inverse (find users like user X) and for downstream
-- ML jobs.  m=16, ef_construction=64 mirror the listing_embeddings settings.
CREATE INDEX IF NOT EXISTS user_interest_vectors_hnsw_idx
  ON public.user_interest_vectors
  USING hnsw (interest_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- user_behavior_profile — partial index for admin bot-monitoring queries.
CREATE INDEX IF NOT EXISTS user_behavior_profile_bot_risk_idx
  ON public.user_behavior_profile (bot_risk_score DESC)
  WHERE is_flagged_bot = true;

-- trending_listings — feed lookup + invalidation lookup.
CREATE INDEX IF NOT EXISTS trending_listings_scope_rank_idx
  ON public.trending_listings (scope_type, scope_id, rank_position);

CREATE INDEX IF NOT EXISTS trending_listings_listing_idx
  ON public.trending_listings (listing_id);

-- trending_keywords — keyword suggestion lookup by province.
CREATE INDEX IF NOT EXISTS trending_keywords_province_rank_idx
  ON public.trending_keywords (province_id, rank_position);

-- ══════════════════════════════════════════════════════════════════════════════
-- §3.  refresh_listing_similarity_graph()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Daily rebuild of the unified similarity graph.  Three signal sources are
-- merged:
--
--   1. Behavioural pairs from listing_relationships (013).  Strength is
--      mapped through 1 − exp(−s/3) to land in [0,1] (S-curve).
--   2. Semantic similarity for those behavioural pairs (joined from
--      listing_embeddings).
--   3. Pure-semantic neighbours via LATERAL ANN over listing_embeddings,
--      bounded to top-25 per source with cosine ≥ 0.55.
--
-- For each candidate pair (a, b) with a < b we:
--
--   • Take MAX of each behavioural / semantic score across the two sources.
--   • Pull listings metadata (category, province, type, price).
--   • Require same listing type and both sides published / approved / public.
--   • Compute:
--
--       similarity_score = behavioural × 0.35
--                        + semantic    × 0.35
--                        + 0.15        if category_match
--                        + 0.10        × price_proximity
--                        + 0.05        if province_match
--
--   • Drop pairs with similarity_score < 0.08 (noise floor).
--   • Rank top 50 by source.
--   • Insert both A→B and B→A directions.
--
-- price_proximity is exp(−|ln(max/min)|) for positive prices, 0 otherwise.
-- It is symmetric and falls off smoothly: 1.0 at equal price, ~0.37 at 3×
-- difference, ~0.05 at 20× difference.
--
-- SECURITY DEFINER: listing_relationships and listing_embeddings are publicly
-- readable, but listings filtering and the join scope are administrative.

CREATE OR REPLACE FUNCTION public.refresh_listing_similarity_graph()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count bigint := 0;
BEGIN
  -- ef_search tuning: higher recall for the offline build.
  PERFORM set_config('hnsw.ef_search', '120', true);

  -- Hold all candidate edges in a temporary table so we can rank then insert.
  CREATE TEMPORARY TABLE _sim_edges (
    a                  uuid    NOT NULL,
    b                  uuid    NOT NULL,
    behavioral_score   real    NOT NULL DEFAULT 0,
    semantic_score     real    NOT NULL DEFAULT 0,
    co_inquiry_count   integer NOT NULL DEFAULT 0,
    PRIMARY KEY (a, b)
  ) ON COMMIT DROP;

  -- ── Source 1+2: behavioural pairs (canonical a < b) joined with semantic ─
  INSERT INTO _sim_edges (a, b, behavioral_score, semantic_score, co_inquiry_count)
  SELECT
    LEAST(lr.source_listing_id, lr.target_listing_id)                 AS a,
    GREATEST(lr.source_listing_id, lr.target_listing_id)              AS b,
    MAX(
      (1.0 - EXP(-COALESCE(lr.strength, 0)::float8 / 3.0))::real
    )                                                                 AS behavioral_score,
    MAX(
      CASE
        WHEN ea.embedding IS NOT NULL AND eb.embedding IS NOT NULL
          THEN GREATEST(0.0, (1.0 - (ea.embedding <=> eb.embedding))::real)
        ELSE 0.0::real
      END
    )                                                                 AS semantic_score,
    -- co_inquiry_count is approximated by co_save (strongest intent we track
    -- without an explicit co_inquiry column).  Refreshed daily so a small
    -- approximation is acceptable here.
    MAX(COALESCE(lr.co_save_count, 0))                                AS co_inquiry_count
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

  -- ── Source 3: pure-semantic neighbours via LATERAL ANN ──────────────────
  --
  -- For every listing that has an embedding, find the top-25 nearest neighbours.
  -- Bounded by LIMIT 25 inside the lateral; cosine threshold ≥ 0.55 filters
  -- weak matches before they enter the edge set.
  INSERT INTO _sim_edges (a, b, behavioral_score, semantic_score, co_inquiry_count)
  SELECT
    LEAST(seed.listing_id, nn.listing_id)    AS a,
    GREATEST(seed.listing_id, nn.listing_id) AS b,
    0.0::real                                 AS behavioral_score,
    nn.cosine_sim                             AS semantic_score,
    0                                         AS co_inquiry_count
  FROM public.listing_embeddings seed
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
    AND seed.listing_id < nn.listing_id  -- canonical order, dedup at insert
  ON CONFLICT (a, b) DO UPDATE SET
    semantic_score = GREATEST(_sim_edges.semantic_score, EXCLUDED.semantic_score);

  -- ── Score each candidate edge against listings metadata ─────────────────
  CREATE TEMPORARY TABLE _sim_scored ON COMMIT DROP AS
  WITH metadata AS (
    SELECT
      e.a,
      e.b,
      e.behavioral_score,
      e.semantic_score,
      e.co_inquiry_count,
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
      AND la.type              = lb.type   -- same type only
  ),
  scored AS (
    SELECT
      m.a,
      m.b,
      m.behavioral_score,
      m.semantic_score,
      m.co_inquiry_count,
      (m.a_category IS NOT NULL AND m.a_category = m.b_category) AS category_match,
      (m.a_province IS NOT NULL AND m.a_province = m.b_province) AS province_match,
      true                                                         AS type_match,
      CASE
        WHEN m.a_price > 0 AND m.b_price > 0
          THEN EXP(
                 -ABS(
                   LN(GREATEST(m.a_price, m.b_price)::float8
                      / LEAST(m.a_price, m.b_price)::float8)
                 )
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
  SELECT *
  FROM combined
  WHERE similarity_score >= 0.08;

  -- ── Rank: keep top 50 per source listing (direction-agnostic) ───────────
  CREATE TEMPORARY TABLE _sim_ranked ON COMMIT DROP AS
  WITH expanded AS (
    SELECT
      a AS source_id, b AS target_id,
      behavioral_score, semantic_score, co_inquiry_count,
      category_match, province_match, type_match,
      price_proximity, edge_type, similarity_score
    FROM _sim_scored
    UNION ALL
    SELECT
      b AS source_id, a AS target_id,
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
  SELECT *
  FROM ranked
  WHERE rn <= 50;

  -- ── Replace graph atomically ────────────────────────────────────────────
  TRUNCATE TABLE public.listing_similarity_graph;

  INSERT INTO public.listing_similarity_graph (
    source_id,
    target_id,
    similarity_score,
    behavioral_score,
    semantic_score,
    co_inquiry_count,
    category_match,
    province_match,
    type_match,
    price_proximity,
    edge_type,
    computed_at
  )
  SELECT
    source_id,
    target_id,
    similarity_score,
    behavioral_score,
    semantic_score,
    co_inquiry_count,
    category_match,
    province_match,
    type_match,
    price_proximity,
    edge_type,
    now()
  FROM _sim_ranked;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE LOG '[refresh_listing_similarity_graph] inserted % edges', inserted_count;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §4.  refresh_user_interest_vectors()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Per-user semantic interest vector.  Computed from the top-20 most-engaged
-- listings in the last 30 days, weighted by event type and recency:
--
--     weight = event_weight × exp(−age_seconds / (15 days))
--
-- Event weights:
--     inquiry        8.0
--     phone_reveal   5.0
--     save           4.0
--     click          2.0
--     impression     1.0  (default)
--
-- The user vector is the simple mean of those listing embeddings (top-20).
-- Users with < 3 embeddable engaged listings, or flagged as bots, are skipped.
--
-- SECURITY DEFINER: reads listing_events (no public SELECT).

CREATE OR REPLACE FUNCTION public.refresh_user_interest_vectors()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upserted_count bigint := 0;
BEGIN
  WITH
  -- Per (profile, listing): aggregate weighted engagement.
  per_listing AS (
    SELECT
      e.profile_id,
      e.listing_id,
      SUM(
        CASE e.event_type
          WHEN 'inquiry'      THEN 8.0
          WHEN 'phone_reveal' THEN 5.0
          WHEN 'save'         THEN 4.0
          WHEN 'click'        THEN 2.0
          ELSE                     1.0
        END
        * EXP(
            -EXTRACT(epoch FROM (now() - e.created_at))::float8 / 1296000.0
          )
      )::float8                                         AS engagement_weight,
      MAX(e.created_at)                                 AS last_event_at
    FROM public.listing_events e
    WHERE e.profile_id IS NOT NULL
      AND e.created_at >= now() - interval '30 days'
      AND e.event_type IN ('impression','click','save','inquiry','phone_reveal')
    GROUP BY e.profile_id, e.listing_id
  ),
  -- Top-20 most engaged listings per user.
  top_listings AS (
    SELECT
      pl.profile_id,
      pl.listing_id,
      pl.engagement_weight,
      ROW_NUMBER() OVER (
        PARTITION BY pl.profile_id
        ORDER BY pl.engagement_weight DESC, pl.last_event_at DESC
      ) AS rn
    FROM per_listing pl
  ),
  top20 AS (
    SELECT *
    FROM top_listings
    WHERE rn <= 20
  ),
  -- Join embeddings + listing metadata for those top-20 rows.
  top20_meta AS (
    SELECT
      t.profile_id,
      t.listing_id,
      t.engagement_weight,
      le.embedding,
      l.category_id,
      l.province_id
    FROM top20 t
    JOIN public.listing_embeddings le ON le.listing_id = t.listing_id
    JOIN public.listings l             ON l.id          = t.listing_id
    WHERE l.status            = 'published'
      AND l.moderation_status = 'approved'
      AND l.is_public         = true
  ),
  -- Exclude bot-flagged users.
  eligible_users AS (
    SELECT t.profile_id
    FROM top20_meta t
    LEFT JOIN public.user_behavior_profile ubp ON ubp.profile_id = t.profile_id
    WHERE COALESCE(ubp.is_flagged_bot, false) = false
    GROUP BY t.profile_id
    HAVING COUNT(*) >= 3   -- ≥ 3 matching embeddings
  ),
  -- Average embedding per eligible user.
  vectors AS (
    SELECT
      t.profile_id,
      AVG(t.embedding)::vector(384)        AS interest_embedding,
      SUM(t.engagement_weight)::float8     AS total_weight,
      COUNT(*)::integer                    AS data_points
    FROM top20_meta t
    JOIN eligible_users eu USING (profile_id)
    GROUP BY t.profile_id
  ),
  -- Primary category per user (most-engaged category among top-20).
  cat_distribution AS (
    SELECT
      t.profile_id,
      t.category_id,
      SUM(t.engagement_weight)::float8 AS cat_weight,
      COUNT(*)::integer                 AS cat_count
    FROM top20_meta t
    JOIN eligible_users eu USING (profile_id)
    WHERE t.category_id IS NOT NULL
    GROUP BY t.profile_id, t.category_id
  ),
  primary_cat AS (
    SELECT DISTINCT ON (profile_id)
      profile_id, category_id
    FROM cat_distribution
    ORDER BY profile_id, cat_weight DESC, category_id
  ),
  -- Primary province per user.
  prov_distribution AS (
    SELECT
      t.profile_id,
      t.province_id,
      SUM(t.engagement_weight)::float8 AS prov_weight
    FROM top20_meta t
    JOIN eligible_users eu USING (profile_id)
    WHERE t.province_id IS NOT NULL
    GROUP BY t.profile_id, t.province_id
  ),
  primary_prov AS (
    SELECT DISTINCT ON (profile_id)
      profile_id, province_id
    FROM prov_distribution
    ORDER BY profile_id, prov_weight DESC, province_id
  ),
  -- Interest breadth: normalised Shannon entropy of category distribution.
  cat_totals AS (
    SELECT
      profile_id,
      SUM(cat_weight)::float8           AS total_w,
      COUNT(*)::integer                  AS n_categories
    FROM cat_distribution
    GROUP BY profile_id
  ),
  breadth AS (
    SELECT
      cd.profile_id,
      CASE
        WHEN ct.total_w > 0 AND ct.n_categories > 1
          THEN GREATEST(
                 0.0,
                 LEAST(
                   1.0,
                   (
                     -SUM(
                       (cd.cat_weight / ct.total_w)
                       * LN(
                           NULLIF(cd.cat_weight / ct.total_w, 0)
                         )
                     )
                   ) / LN(GREATEST(2, ct.n_categories))
                 )
               )::real
        ELSE 0.0::real
      END AS interest_breadth
    FROM cat_distribution cd
    JOIN cat_totals ct USING (profile_id)
    GROUP BY cd.profile_id, ct.total_w, ct.n_categories
  ),
  -- Final assembly per eligible user.
  final AS (
    SELECT
      v.profile_id,
      v.interest_embedding,
      pc.category_id                                    AS primary_category_id,
      pp.province_id                                    AS primary_province_id,
      COALESCE(b.interest_breadth, 0.0::real)           AS interest_breadth,
      LEAST(
        1.0::real,
        (LN(1.0 + COALESCE(v.total_weight, 0)) / LN(1.0 + 100.0))::real
      )                                                  AS engagement_score,
      v.data_points
    FROM vectors v
    LEFT JOIN primary_cat  pc ON pc.profile_id = v.profile_id
    LEFT JOIN primary_prov pp ON pp.profile_id = v.profile_id
    LEFT JOIN breadth       b ON b.profile_id  = v.profile_id
  )
  INSERT INTO public.user_interest_vectors (
    profile_id,
    interest_embedding,
    primary_category_id,
    primary_province_id,
    interest_breadth,
    engagement_score,
    data_points,
    computed_at,
    updated_at
  )
  SELECT
    profile_id,
    interest_embedding,
    primary_category_id,
    primary_province_id,
    interest_breadth,
    engagement_score,
    data_points,
    now(),
    now()
  FROM final
  ON CONFLICT (profile_id) DO UPDATE SET
    interest_embedding  = EXCLUDED.interest_embedding,
    primary_category_id = EXCLUDED.primary_category_id,
    primary_province_id = EXCLUDED.primary_province_id,
    interest_breadth    = EXCLUDED.interest_breadth,
    engagement_score    = EXCLUDED.engagement_score,
    data_points         = EXCLUDED.data_points,
    computed_at         = EXCLUDED.computed_at,
    updated_at          = EXCLUDED.updated_at;

  GET DIAGNOSTICS upserted_count = ROW_COUNT;
  RAISE LOG '[refresh_user_interest_vectors] upserted % users', upserted_count;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §5.  refresh_user_behavior_profiles()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Session-level behavioural analysis.
--
-- Bot-risk decomposition:
--
--   rapid_event_signal = LEAST(1.0, max(events_per_min)/5.0)
--       — penalises sessions with > 5 events per minute (programmatic).
--
--   low_dwell_signal   = clicks with dwell < 2 s / total clicks
--       — short dwell on click is a strong bot tell.
--
--   high_volume_signal = LEAST(1.0, max(distinct_listings/session)/25.0)
--       — penalises sessions touching dozens of unique listings.
--
--   bot_risk_score     = 0.40 × rapid + 0.35 × low_dwell + 0.25 × high_volume
--
--   is_flagged_bot     = bot_risk_score > 0.70  OR  max_session_listings > 100
--
-- SECURITY DEFINER: reads listing_events.

CREATE OR REPLACE FUNCTION public.refresh_user_behavior_profiles()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upserted_count bigint := 0;
BEGIN
  WITH
  -- Per (profile, session) aggregates over last 30 days.
  session_stats AS (
    SELECT
      e.profile_id,
      e.session_id,
      COUNT(*)::integer                                                 AS event_count,
      COUNT(DISTINCT e.listing_id)::integer                              AS distinct_listings,
      MIN(e.created_at)                                                  AS session_started_at,
      MAX(e.created_at)                                                  AS session_ended_at,
      GREATEST(
        1,
        EXTRACT(epoch FROM (MAX(e.created_at) - MIN(e.created_at)))::integer
      )                                                                  AS session_duration_secs,
      BOOL_OR(e.event_type = 'inquiry')                                  AS had_inquiry,
      AVG(
        CASE
          WHEN e.event_type = 'click'
           AND (e.metadata ->> 'duration_seconds')::numeric IS NOT NULL
          THEN (e.metadata ->> 'duration_seconds')::numeric
          ELSE NULL
        END
      )::float8                                                          AS avg_click_dwell,
      SUM(
        CASE
          WHEN e.event_type = 'click'
           AND (e.metadata ->> 'duration_seconds')::numeric IS NOT NULL
           AND (e.metadata ->> 'duration_seconds')::numeric < 2
          THEN 1 ELSE 0
        END
      )::integer                                                         AS short_dwell_clicks,
      SUM(
        CASE
          WHEN e.event_type = 'click'
           AND (e.metadata ->> 'duration_seconds')::numeric IS NOT NULL
          THEN 1 ELSE 0
        END
      )::integer                                                         AS total_dwell_clicks
    FROM public.listing_events e
    WHERE e.profile_id IS NOT NULL
      AND e.session_id IS NOT NULL
      AND e.created_at >= now() - interval '30 days'
    GROUP BY e.profile_id, e.session_id
  ),
  -- Events per minute per session (rapid-event signal feeds off this).
  session_velocity AS (
    SELECT
      profile_id,
      session_id,
      (event_count::float8
       / GREATEST(1.0, session_duration_secs::float8 / 60.0))::float8 AS events_per_min
    FROM session_stats
  ),
  -- Per-user aggregates.
  profile_stats AS (
    SELECT
      s.profile_id,
      (AVG(s.session_duration_secs)::float8 / 60.0)::real    AS avg_session_length_min,
      AVG(s.distinct_listings)::real                          AS avg_listings_per_session,
      COALESCE(AVG(s.avg_click_dwell), 0)::real               AS avg_dwell_seconds,
      COUNT(*) FILTER (
        WHERE s.session_started_at >= now() - interval '7 days'
      )::integer                                              AS sessions_7d,
      COUNT(*)::integer                                       AS total_sessions,
      SUM(CASE WHEN s.had_inquiry THEN 1 ELSE 0 END)::integer AS inquiry_sessions,
      MAX(s.distinct_listings)::integer                       AS max_session_listings,
      MAX(s.event_count)::integer                             AS max_session_events,
      COALESCE(
        SUM(s.short_dwell_clicks)::float8
        / NULLIF(SUM(s.total_dwell_clicks), 0)::float8,
        0
      )                                                        AS low_dwell_signal
    FROM session_stats s
    GROUP BY s.profile_id
  ),
  velocity_stats AS (
    SELECT
      profile_id,
      MAX(events_per_min)::float8 AS max_events_per_min
    FROM session_velocity
    GROUP BY profile_id
  ),
  -- Preferred price range: from clicked / inquired listings, last 30 days.
  price_pref AS (
    SELECT
      e.profile_id,
      MIN(l.price_amount)::numeric(18,2) AS preferred_price_min,
      MAX(l.price_amount)::numeric(18,2) AS preferred_price_max
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.profile_id IS NOT NULL
      AND e.event_type IN ('click', 'inquiry', 'phone_reveal', 'save')
      AND e.created_at >= now() - interval '30 days'
      AND l.price_amount IS NOT NULL
      AND l.price_amount > 0
    GROUP BY e.profile_id
  ),
  -- Compose bot-risk signals + intent stage.
  composed AS (
    SELECT
      ps.profile_id,
      ps.avg_session_length_min,
      ps.avg_listings_per_session,
      ps.avg_dwell_seconds,
      ps.sessions_7d,
      pp.preferred_price_min,
      pp.preferred_price_max,
      (
        CASE
          WHEN ps.total_sessions > 0
            THEN ps.inquiry_sessions::float8 / ps.total_sessions::float8
          ELSE 0.0
        END
      )::real                                                                AS browse_to_inquiry_rate,
      LEAST(
        1.0,
        COALESCE(vs.max_events_per_min, 0) / 5.0
      )::real                                                                AS rapid_event_signal,
      LEAST(1.0, GREATEST(0.0, ps.low_dwell_signal))::real                   AS low_dwell_signal,
      LEAST(
        1.0,
        COALESCE(ps.max_session_listings, 0)::float8 / 25.0
      )::real                                                                AS high_volume_signal,
      ps.max_session_listings
    FROM profile_stats ps
    LEFT JOIN velocity_stats vs ON vs.profile_id = ps.profile_id
    LEFT JOIN price_pref     pp ON pp.profile_id = ps.profile_id
  ),
  finalised AS (
    SELECT
      c.*,
      (
        c.rapid_event_signal * 0.40
        + c.low_dwell_signal * 0.35
        + c.high_volume_signal * 0.25
      )::real AS bot_risk_score,
      CASE
        WHEN c.browse_to_inquiry_rate > 0.15 THEN 'ready_to_buy'
        WHEN c.browse_to_inquiry_rate > 0.05 THEN 'comparing'
        ELSE                                       'exploring'
      END     AS intent_stage
    FROM composed c
  )
  INSERT INTO public.user_behavior_profile (
    profile_id,
    avg_session_length_min,
    avg_listings_per_session,
    avg_dwell_seconds,
    sessions_7d,
    preferred_price_min,
    preferred_price_max,
    browse_to_inquiry_rate,
    intent_stage,
    bot_risk_score,
    bot_risk_factors,
    is_flagged_bot,
    computed_at,
    updated_at
  )
  SELECT
    f.profile_id,
    f.avg_session_length_min,
    f.avg_listings_per_session,
    f.avg_dwell_seconds,
    f.sessions_7d,
    f.preferred_price_min,
    f.preferred_price_max,
    f.browse_to_inquiry_rate,
    f.intent_stage,
    f.bot_risk_score,
    jsonb_build_object(
      'rapid_event_signal', f.rapid_event_signal,
      'low_dwell_signal',   f.low_dwell_signal,
      'high_volume_signal', f.high_volume_signal,
      'max_session_listings', COALESCE(f.max_session_listings, 0)
    ),
    (f.bot_risk_score > 0.70 OR COALESCE(f.max_session_listings, 0) > 100),
    now(),
    now()
  FROM finalised f
  ON CONFLICT (profile_id) DO UPDATE SET
    avg_session_length_min   = EXCLUDED.avg_session_length_min,
    avg_listings_per_session = EXCLUDED.avg_listings_per_session,
    avg_dwell_seconds        = EXCLUDED.avg_dwell_seconds,
    sessions_7d              = EXCLUDED.sessions_7d,
    preferred_price_min      = EXCLUDED.preferred_price_min,
    preferred_price_max      = EXCLUDED.preferred_price_max,
    browse_to_inquiry_rate   = EXCLUDED.browse_to_inquiry_rate,
    intent_stage             = EXCLUDED.intent_stage,
    bot_risk_score           = EXCLUDED.bot_risk_score,
    bot_risk_factors         = EXCLUDED.bot_risk_factors,
    is_flagged_bot           = EXCLUDED.is_flagged_bot,
    computed_at              = EXCLUDED.computed_at,
    updated_at               = EXCLUDED.updated_at;

  GET DIAGNOSTICS upserted_count = ROW_COUNT;
  RAISE LOG '[refresh_user_behavior_profiles] upserted % users', upserted_count;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §6.  refresh_trending_listings()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Velocity-based trending feed by scope.
--
-- A listing trends when its 24h impression volume grows faster than its prior
-- 24h baseline AND its impressions are not concentrated in a single session.
--
--   velocity_score   = (impressions_24h − impressions_prev_24h)
--                      / GREATEST(1, impressions_prev_24h)
--
-- Anti-bot:
--   • Require sessions_24h ≥ 3 (≥ 3 unique sessions in 24h window).
--   • Require session_diversity ≥ 0.3 (proxy: unique_sessions / total_events).
--   • Drop listings with impressions_24h < 5 (noise floor).
--
-- Scopes populated:
--     'national'  → top 100, scope_id = 0
--     'province'  → top 30 per province, scope_id = province_id
--     'category'  → top 30 per category, scope_id = category_id
--
-- SECURITY DEFINER: reads listing_events.

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
      COUNT(*) FILTER (WHERE e.event_type = 'impression')::integer AS impressions_24h,
      COUNT(*) FILTER (WHERE e.event_type = 'click')::integer      AS clicks_24h,
      COUNT(DISTINCT e.session_id)::integer                         AS unique_sessions_24h,
      COUNT(*)::integer                                              AS total_events_24h
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
      COALESCE(p.impressions_prev_24h, 0) AS impressions_prev_24h,
      (
        (w.impressions_24h - COALESCE(p.impressions_prev_24h, 0))::float8
        / GREATEST(1, COALESCE(p.impressions_prev_24h, 0))::float8
      )::real                                AS velocity_score,
      CASE
        WHEN w.total_events_24h > 0
          THEN (w.unique_sessions_24h::float8 / w.total_events_24h::float8)::real
        ELSE 0.0::real
      END                                    AS session_diversity_proxy
    FROM win_24h w
    LEFT JOIN win_prev p ON p.listing_id = w.listing_id
  )
  SELECT
    j.listing_id,
    j.impressions_24h,
    j.clicks_24h,
    j.unique_sessions_24h,
    j.session_diversity_proxy,
    j.velocity_score,
    l.province_id,
    l.category_id,
    l.type::text  AS listing_type
  FROM joined j
  JOIN public.listings l ON l.id = j.listing_id
  WHERE l.status            = 'published'
    AND l.moderation_status = 'approved'
    AND l.is_public         = true
    AND j.impressions_24h           >= 5
    AND j.velocity_score             > 0
    AND j.unique_sessions_24h        >= 3
    AND j.session_diversity_proxy    >= 0.3;

  -- ── Atomically replace trending_listings ───────────────────────────────
  TRUNCATE TABLE public.trending_listings;

  -- National scope (top 100)
  INSERT INTO public.trending_listings (
    scope_type, scope_id, listing_id,
    velocity_score, impressions_24h, clicks_24h,
    session_diversity, unique_sessions, rank_position, computed_at
  )
  SELECT
    'national',
    0,
    listing_id,
    velocity_score,
    impressions_24h,
    clicks_24h,
    session_diversity_proxy,
    unique_sessions_24h,
    rn::smallint,
    now()
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (ORDER BY velocity_score DESC, impressions_24h DESC, listing_id) AS rn
    FROM _trend_base
  ) ranked
  WHERE rn <= 100;

  -- Province scope (top 30 per province)
  INSERT INTO public.trending_listings (
    scope_type, scope_id, listing_id,
    velocity_score, impressions_24h, clicks_24h,
    session_diversity, unique_sessions, rank_position, computed_at
  )
  SELECT
    'province',
    province_id,
    listing_id,
    velocity_score,
    impressions_24h,
    clicks_24h,
    session_diversity_proxy,
    unique_sessions_24h,
    rn::smallint,
    now()
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY province_id
        ORDER BY velocity_score DESC, impressions_24h DESC, listing_id
      ) AS rn
    FROM _trend_base
    WHERE province_id IS NOT NULL
  ) ranked
  WHERE rn <= 30
  ON CONFLICT (scope_type, scope_id, listing_id) DO NOTHING;

  -- Category scope (top 30 per category)
  INSERT INTO public.trending_listings (
    scope_type, scope_id, listing_id,
    velocity_score, impressions_24h, clicks_24h,
    session_diversity, unique_sessions, rank_position, computed_at
  )
  SELECT
    'category',
    category_id,
    listing_id,
    velocity_score,
    impressions_24h,
    clicks_24h,
    session_diversity_proxy,
    unique_sessions_24h,
    rn::smallint,
    now()
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY category_id
        ORDER BY velocity_score DESC, impressions_24h DESC, listing_id
      ) AS rn
    FROM _trend_base
    WHERE category_id IS NOT NULL
  ) ranked
  WHERE rn <= 30
  ON CONFLICT (scope_type, scope_id, listing_id) DO NOTHING;

  SELECT COUNT(*) INTO inserted_count FROM public.trending_listings;
  RAISE LOG '[refresh_trending_listings] inserted % rows across all scopes', inserted_count;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §7.  refresh_trending_keywords()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- search_logs columns (003):  query (PK), count, last_searched_at.
-- No per-period breakdown is stored, so velocity is approximated using:
--
--     searches_7d       = count if last_searched_at >= now() - 7d, else 0
--     searches_prev_7d  = count if last_searched_at falls in [-14d, -7d), else 0
--     velocity_score    = (searches_7d − searches_prev_7d)
--                         / GREATEST(1, searches_prev_7d)
--
-- This treats `count` as a recent activity counter (consistent with the
-- upsert semantics used by the search layer).  When search_logs gains a
-- province_id column, this function can populate the per-province scope
-- without schema changes (trending_keywords.province_id is already there).
--
-- SECURITY DEFINER: search_logs has its own RLS; running as definer keeps
-- the path consistent with the other refreshers.

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
  CREATE TEMPORARY TABLE _kw_base ON COMMIT DROP AS
  SELECT
    sl.query AS keyword,
    CASE
      WHEN sl.last_searched_at >= now() - interval '7 days'
        THEN COALESCE(sl.count, 0)
      ELSE 0
    END                                              AS searches_7d,
    CASE
      WHEN sl.last_searched_at <  now() - interval '7 days'
       AND sl.last_searched_at >= now() - interval '14 days'
        THEN COALESCE(sl.count, 0)
      ELSE 0
    END                                              AS searches_prev_7d
  FROM public.search_logs sl
  WHERE sl.query IS NOT NULL
    AND length(trim(sl.query)) >= 3
    -- Drop keywords that are pure numbers (price probes, phone scrapers).
    AND trim(sl.query) !~ '^[0-9]+$'
    AND sl.last_searched_at >= now() - interval '14 days';

  CREATE TEMPORARY TABLE _kw_ranked ON COMMIT DROP AS
  WITH scored AS (
    SELECT
      keyword,
      searches_7d,
      searches_prev_7d,
      (
        (searches_7d - searches_prev_7d)::float8
        / GREATEST(1, searches_prev_7d)::float8
      )::real AS velocity_score
    FROM _kw_base
    WHERE searches_7d > 0
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
  )
  SELECT *
  FROM ranked
  WHERE rank_position <= 50;

  -- Atomic replace
  TRUNCATE TABLE public.trending_keywords;

  INSERT INTO public.trending_keywords (
    keyword, province_id,
    searches_7d, searches_prev_7d,
    velocity_score, rank_position, computed_at
  )
  SELECT
    keyword,
    0,                       -- national scope only (see §7 header)
    searches_7d,
    searches_prev_7d,
    velocity_score,
    rank_position,
    now()
  FROM _kw_ranked;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE LOG '[refresh_trending_keywords] inserted % keywords', inserted_count;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §8.  get_similar_listings()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- "Similar to X" widget.
--
-- Primary path:  listing_similarity_graph WHERE source_id = p_listing_id.
-- Fallback:      pure-semantic ANN over listing_embeddings when the graph
--                yields fewer than 3 candidates.
--
-- Anti-spam/fraud:  spam_penalty < 0.80 AND NOT fraud_flag.
-- Anti-merchant-flood:  for any merchant with active_listings > 20, allow at
--                       most 2 results.
--
-- Returns 12 (default) listings with a why_recommended jsonb explaining the
-- top contributing signal.

CREATE OR REPLACE FUNCTION public.get_similar_listings(
  p_listing_id uuid,
  p_limit      integer DEFAULT 12,
  p_profile_id uuid    DEFAULT NULL
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
  category_id       integer,
  updated_at        timestamptz,
  similarity_score  real,
  edge_type         text,
  why_recommended   jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  graph_row_count integer := 0;
  seed_embedding  vector(384);
  fetch_k         integer := GREATEST(p_limit * 3, 24);
BEGIN
  -- Light HNSW recall bump for the fallback path.
  PERFORM set_config('hnsw.ef_search', '100', true);

  -- Count graph hits up front to decide path.
  SELECT COUNT(*) INTO graph_row_count
  FROM public.listing_similarity_graph
  WHERE source_id = p_listing_id;

  IF graph_row_count >= 3 THEN
    -- ── Primary path ───────────────────────────────────────────────────
    RETURN QUERY
    WITH candidate AS (
      SELECT
        sg.target_id           AS lid,
        sg.similarity_score,
        sg.behavioral_score,
        sg.semantic_score,
        sg.category_match,
        sg.province_match,
        sg.price_proximity,
        sg.edge_type,
        ROW_NUMBER() OVER (ORDER BY sg.similarity_score DESC, sg.target_id) AS rn
      FROM public.listing_similarity_graph sg
      WHERE sg.source_id = p_listing_id
      ORDER BY sg.similarity_score DESC
      LIMIT fetch_k
    ),
    enriched AS (
      SELECT
        c.*,
        l.id,
        l.type::text             AS type,
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
        l.category_id,
        l.owner_id,
        l.updated_at,
        COALESCE(qs.quality_score, 0)::float8       AS quality_score,
        COALESCE(qs.bounce_rate, 0)::float8         AS bounce_rate,
        COALESCE(qs.inquiry_rate, 0)::float8        AS inquiry_rate,
        COALESCE(qs.save_rate, 0)::float8           AS save_rate,
        COALESCE(cs.ctr_7d, 0)::float8              AS ctr_7d,
        COALESCE(ts.trust_score, 0)::float8         AS trust_score,
        COALESCE(ts.fraud_flag, false)              AS fraud_flag,
        COALESCE(ts.active_listings, 0)             AS merchant_active_listings,
        CASE
          WHEN COALESCE(qs.bounce_rate, 0) > 0.85
            OR COALESCE(qs.inquiry_rate, 0) = 0
            AND COALESCE(qs.quality_score, 0) < 0.10
          THEN 0.85
          WHEN COALESCE(qs.bounce_rate, 0) > 0.70 THEN 0.30
          ELSE 0.0
        END::float8                                  AS spam_penalty
      FROM candidate c
      JOIN public.listings              l  ON l.id          = c.lid
      LEFT JOIN public.listing_quality_scores qs ON qs.listing_id = l.id
      LEFT JOIN public.listing_ctr_stats      cs ON cs.listing_id = l.id
      LEFT JOIN public.merchant_trust_scores  ts ON ts.profile_id  = l.owner_id
      WHERE l.id <> p_listing_id
        AND l.status            = 'published'
        AND l.moderation_status = 'approved'
        AND l.is_public         = true
    ),
    filtered AS (
      SELECT *
      FROM enriched
      WHERE spam_penalty < 0.80
        AND NOT fraud_flag
    ),
    diversified AS (
      SELECT
        f.*,
        ROW_NUMBER() OVER (
          PARTITION BY
            CASE WHEN f.merchant_active_listings > 20 THEN f.owner_id END
          ORDER BY f.similarity_score DESC, f.id
        ) AS merchant_rn
      FROM filtered f
    ),
    capped AS (
      SELECT *
      FROM diversified
      WHERE merchant_rn IS NULL
         OR merchant_rn <= 2
    ),
    scored AS (
      SELECT
        c.*,
        (
          c.similarity_score::float8
          + LEAST(0.20, c.quality_score * 0.20)
          + LEAST(0.15, c.ctr_7d * 1.5)
          + LEAST(
              0.10,
              GREATEST(
                0.0,
                EXTRACT(epoch FROM (now() - c.updated_at))::float8 / -2592000.0 + 0.10
              )
            )
          - c.spam_penalty
        )::real AS final_score
      FROM capped c
    )
    SELECT
      s.id,
      s.type,
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
      s.category_id,
      s.updated_at,
      s.similarity_score,
      s.edge_type,
      jsonb_build_object(
        'primary_signal',
          CASE
            WHEN s.behavioral_score >= s.semantic_score AND s.behavioral_score > 0.10
              THEN 'co_engagement'
            WHEN s.semantic_score   > s.behavioral_score AND s.semantic_score   > 0.20
              THEN 'semantic_similarity'
            WHEN s.category_match AND s.province_match
              THEN 'same_category_and_province'
            WHEN s.price_proximity > 0.50
              THEN 'price_match'
            ELSE 'graph_edge'
          END,
        'semantic_score',   s.semantic_score,
        'behavioral_score', s.behavioral_score,
        'category_match',   s.category_match,
        'province_match',   s.province_match,
        'price_proximity',  s.price_proximity,
        'combined_score',   s.final_score
      ) AS why_recommended
    FROM scored s
    ORDER BY s.final_score DESC NULLS LAST, s.id
    LIMIT p_limit;

    RETURN;
  END IF;

  -- ── Fallback path: ANN over listing_embeddings ─────────────────────────
  SELECT le.embedding INTO seed_embedding
  FROM public.listing_embeddings le
  WHERE le.listing_id = p_listing_id;

  IF seed_embedding IS NULL THEN
    -- No embedding either — degrade gracefully to empty result.
    RETURN;
  END IF;

  RETURN QUERY
  WITH ann AS (
    SELECT
      le.listing_id                                                AS lid,
      GREATEST(0.0, (1.0 - (le.embedding <=> seed_embedding))::real) AS sim
    FROM public.listing_embeddings le
    WHERE le.listing_id <> p_listing_id
    ORDER BY le.embedding <=> seed_embedding
    LIMIT fetch_k
  ),
  enriched AS (
    SELECT
      a.lid,
      a.sim,
      l.id,
      l.type::text          AS type,
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
      l.category_id,
      l.owner_id,
      l.updated_at,
      COALESCE(qs.bounce_rate, 0)::float8       AS bounce_rate,
      COALESCE(qs.inquiry_rate, 0)::float8      AS inquiry_rate,
      COALESCE(qs.quality_score, 0)::float8     AS quality_score,
      COALESCE(ts.fraud_flag, false)            AS fraud_flag,
      COALESCE(ts.active_listings, 0)           AS merchant_active_listings,
      CASE
        WHEN COALESCE(qs.bounce_rate, 0) > 0.85 THEN 0.85
        WHEN COALESCE(qs.bounce_rate, 0) > 0.70 THEN 0.30
        ELSE 0.0
      END::float8                                AS spam_penalty
    FROM ann a
    JOIN public.listings              l  ON l.id          = a.lid
    LEFT JOIN public.listing_quality_scores qs ON qs.listing_id = l.id
    LEFT JOIN public.merchant_trust_scores  ts ON ts.profile_id  = l.owner_id
    WHERE l.status            = 'published'
      AND l.moderation_status = 'approved'
      AND l.is_public         = true
      AND COALESCE(ts.fraud_flag, false) = false
  )
  SELECT
    e.id,
    e.type,
    e.slug,
    e.title,
    e.short_description,
    e.cover_url,
    e.location_text,
    e.price_text,
    e.price_amount,
    e.is_featured,
    e.is_verified,
    e.province_id,
    e.category_id,
    e.updated_at,
    e.sim                          AS similarity_score,
    'related'::text                AS edge_type,
    jsonb_build_object(
      'primary_signal',   'semantic_fallback',
      'semantic_score',   e.sim,
      'behavioral_score', 0.0,
      'category_match',   false,
      'province_match',   false,
      'price_proximity',  0.0,
      'combined_score',   e.sim
    ) AS why_recommended
  FROM enriched e
  WHERE e.spam_penalty < 0.80
  ORDER BY e.sim DESC, e.id
  LIMIT p_limit;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §9.  get_personalized_feed()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Authenticated personalised home feed.
--
-- Path A — personalised:  user has interest_embedding, is not flagged bot,
--                         data_points ≥ 3.  ANN over listing_embeddings.
-- Path B — cold-start:    fall back to province/category browse ranked by
--                         freshness + featured/verified + quality.
--
-- Diversity caps (Path A): max 2 listings per merchant, max 3 per category.
--
-- Cursor pagination uses (rank_score, updated_at, id) as a deterministic
-- tiebreaker — same convention as 024's search_listings_candidates.

CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_profile_id           uuid,
  p_province_id          integer          DEFAULT NULL,
  p_category_id          integer          DEFAULT NULL,
  p_type                 text             DEFAULT NULL,
  p_limit                integer          DEFAULT 20,
  p_cursor_score         double precision DEFAULT NULL,
  p_cursor_updated_at    timestamptz      DEFAULT NULL,
  p_cursor_id            uuid             DEFAULT NULL
)
RETURNS TABLE (
  id                       uuid,
  type                     text,
  slug                     text,
  title                    text,
  short_description        text,
  cover_url                text,
  location_text            text,
  price_text               text,
  price_amount             numeric,
  is_featured              boolean,
  is_verified              boolean,
  province_id              integer,
  district_id              integer,
  category_id              integer,
  contact_phone            text,
  updated_at               timestamptz,
  rank_score               double precision,
  personalization_context  jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uiv_embedding   vector(384);
  uiv_data_points integer := 0;
  uiv_primary_cat integer;
  uiv_primary_prv integer;
  is_bot          boolean := false;
  use_personalised boolean := false;
  k_pool          integer;
BEGIN
  PERFORM set_config('hnsw.ef_search', '150', true);

  SELECT
    uiv.interest_embedding,
    uiv.data_points,
    uiv.primary_category_id,
    uiv.primary_province_id
  INTO uiv_embedding, uiv_data_points, uiv_primary_cat, uiv_primary_prv
  FROM public.user_interest_vectors uiv
  WHERE uiv.profile_id = p_profile_id;

  SELECT COALESCE(ubp.is_flagged_bot, false)
  INTO is_bot
  FROM public.user_behavior_profile ubp
  WHERE ubp.profile_id = p_profile_id;
  is_bot := COALESCE(is_bot, false);

  use_personalised := (
    uiv_embedding   IS NOT NULL
    AND uiv_data_points >= 3
    AND NOT is_bot
  );

  k_pool := GREATEST(p_limit * 10, 100);

  IF use_personalised THEN
    RETURN QUERY
    WITH ann AS (
      SELECT
        le.listing_id,
        GREATEST(0.0,
          (1.0 - (le.embedding <=> uiv_embedding))::float8
        ) AS cosine_sim
      FROM public.listing_embeddings le
      ORDER BY le.embedding <=> uiv_embedding
      LIMIT k_pool
    ),
    enriched AS (
      SELECT
        a.cosine_sim,
        l.id,
        l.type::text             AS type,
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
        l.owner_id,
        l.contact_phone,
        l.updated_at,
        COALESCE(qs.quality_score, 0)::float8   AS quality_score,
        COALESCE(qs.bounce_rate, 0)::float8     AS bounce_rate,
        COALESCE(cs.ctr_7d, 0)::float8          AS ctr_7d,
        COALESCE(ts.fraud_flag, false)          AS fraud_flag,
        COALESCE(ts.active_listings, 0)         AS merchant_active_listings,
        CASE
          WHEN COALESCE(qs.bounce_rate, 0) > 0.85 THEN 0.85
          WHEN COALESCE(qs.bounce_rate, 0) > 0.70 THEN 0.30
          ELSE 0.0
        END::float8                              AS spam_penalty,
        -- Per-user affinity boost
        COALESCE(
          (SELECT MAX(ua.score)
             FROM public.user_affinities ua
            WHERE ua.profile_id    = p_profile_id
              AND ua.affinity_type = 'province'
              AND ua.affinity_key  = l.province_id::text),
          0
        )::float8                                 AS province_affinity,
        COALESCE(
          (SELECT MAX(ua.score)
             FROM public.user_affinities ua
            WHERE ua.profile_id    = p_profile_id
              AND ua.affinity_type = 'category'
              AND ua.affinity_key  = l.category_id::text),
          0
        )::float8                                 AS category_affinity
      FROM ann a
      JOIN public.listings              l  ON l.id          = a.listing_id
      LEFT JOIN public.listing_quality_scores qs ON qs.listing_id = l.id
      LEFT JOIN public.listing_ctr_stats      cs ON cs.listing_id = l.id
      LEFT JOIN public.merchant_trust_scores  ts ON ts.profile_id  = l.owner_id
      WHERE l.status            = 'published'
        AND l.moderation_status = 'approved'
        AND l.is_public         = true
        AND (p_type        IS NULL OR l.type::text  = p_type)
        AND (p_province_id IS NULL OR l.province_id = p_province_id)
        AND (p_category_id IS NULL OR l.category_id = p_category_id)
    ),
    filtered AS (
      SELECT *
      FROM enriched
      WHERE NOT fraud_flag
        AND spam_penalty < 0.80
    ),
    scored AS (
      SELECT
        f.*,
        (
          f.cosine_sim * 0.50
          + LEAST(0.20, f.quality_score * 0.20)
          + LEAST(0.10, f.ctr_7d * 1.5)
          + CASE
              WHEN uiv_primary_prv IS NOT NULL AND f.province_id = uiv_primary_prv
                THEN 0.08
              ELSE 0.0
            END
          + LEAST(
              0.10,
              GREATEST(
                0.0,
                0.10
                + EXTRACT(epoch FROM (now() - f.updated_at))::float8 / -2592000.0
              )
            )
          - f.spam_penalty
          + LEAST(0.10, f.province_affinity * 0.05)
          + LEAST(0.10, f.category_affinity * 0.05)
        ) AS personalized_score
      FROM filtered f
    ),
    diversified AS (
      SELECT
        s.*,
        ROW_NUMBER() OVER (
          PARTITION BY s.owner_id
          ORDER BY s.personalized_score DESC, s.id
        )::integer AS merchant_rn,
        ROW_NUMBER() OVER (
          PARTITION BY s.category_id
          ORDER BY s.personalized_score DESC, s.id
        )::integer AS category_rn
      FROM scored s
    ),
    capped AS (
      SELECT *
      FROM diversified
      WHERE merchant_rn <= 2
        AND category_rn <= 3
    )
    SELECT
      c.id,
      c.type,
      c.slug,
      c.title,
      c.short_description,
      c.cover_url,
      c.location_text,
      c.price_text,
      c.price_amount,
      c.is_featured,
      c.is_verified,
      c.province_id,
      c.district_id,
      c.category_id,
      c.contact_phone,
      c.updated_at,
      c.personalized_score AS rank_score,
      jsonb_build_object(
        'source',           'personalized',
        'semantic_score',   c.cosine_sim,
        'quality_score',    c.quality_score,
        'ctr_signal',       c.ctr_7d,
        'province_affinity',c.province_affinity,
        'category_affinity',c.category_affinity,
        'primary_category_match', uiv_primary_cat IS NOT NULL AND c.category_id = uiv_primary_cat,
        'primary_province_match', uiv_primary_prv IS NOT NULL AND c.province_id = uiv_primary_prv,
        'combined_score',   c.personalized_score
      ) AS personalization_context
    FROM capped c
    WHERE (
            p_cursor_score      IS NULL
         OR p_cursor_updated_at IS NULL
         OR p_cursor_id         IS NULL
         OR (c.personalized_score, c.updated_at, c.id)
            < (p_cursor_score, p_cursor_updated_at, p_cursor_id)
      )
    ORDER BY c.personalized_score DESC, c.updated_at DESC, c.id
    LIMIT p_limit;

    RETURN;
  END IF;

  -- ── Cold-start: province / category browse fallback ───────────────────
  RETURN QUERY
  WITH base AS (
    SELECT
      l.id,
      l.type::text       AS type,
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
      l.owner_id,
      l.contact_phone,
      l.updated_at,
      COALESCE(qs.quality_score, 0)::float8 AS quality_score,
      COALESCE(qs.bounce_rate, 0)::float8   AS bounce_rate,
      COALESCE(cs.ctr_7d, 0)::float8        AS ctr_7d,
      COALESCE(ts.fraud_flag, false)        AS fraud_flag,
      COALESCE(scs.trending_score, 0)::float8 AS trending_score
    FROM public.listings l
    LEFT JOIN public.listing_quality_scores qs  ON qs.listing_id  = l.id
    LEFT JOIN public.listing_ctr_stats      cs  ON cs.listing_id  = l.id
    LEFT JOIN public.merchant_trust_scores  ts  ON ts.profile_id  = l.owner_id
    LEFT JOIN public.listing_scores         scs ON scs.listing_id = l.id
    WHERE l.status            = 'published'
      AND l.moderation_status = 'approved'
      AND l.is_public         = true
      AND COALESCE(ts.fraud_flag, false) = false
      AND (p_type        IS NULL OR l.type::text  = p_type)
      AND (p_province_id IS NULL OR l.province_id = p_province_id)
      AND (p_category_id IS NULL OR l.category_id = p_category_id)
  ),
  scored AS (
    SELECT
      b.*,
      (
        LEAST(0.30, b.trending_score::float8 * 0.10)
        + LEAST(0.25, b.quality_score * 0.25)
        + LEAST(0.15, b.ctr_7d * 1.5)
        + CASE WHEN b.is_featured THEN 0.10 ELSE 0.0 END
        + CASE WHEN b.is_verified THEN 0.05 ELSE 0.0 END
        + LEAST(
            0.15,
            GREATEST(
              0.0,
              0.15
              + EXTRACT(epoch FROM (now() - b.updated_at))::float8 / -2592000.0
            )
          )
        - CASE WHEN b.bounce_rate > 0.70 THEN 0.30 ELSE 0.0 END
      ) AS browse_score
    FROM base b
  )
  SELECT
    s.id,
    s.type,
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
    s.browse_score AS rank_score,
    jsonb_build_object(
      'source',         'browse_fallback',
      'reason',         CASE
                          WHEN uiv_embedding IS NULL    THEN 'no_interest_vector'
                          WHEN uiv_data_points < 3       THEN 'insufficient_data_points'
                          WHEN is_bot                    THEN 'flagged_user'
                          ELSE                                'unspecified'
                        END,
      'quality_score',  s.quality_score,
      'trending_score', s.trending_score,
      'ctr_signal',     s.ctr_7d,
      'combined_score', s.browse_score
    ) AS personalization_context
  FROM scored s
  WHERE (
          p_cursor_score      IS NULL
       OR p_cursor_updated_at IS NULL
       OR p_cursor_id         IS NULL
       OR (s.browse_score, s.updated_at, s.id)
          < (p_cursor_score, p_cursor_updated_at, p_cursor_id)
    )
  ORDER BY s.browse_score DESC, s.updated_at DESC, s.id
  LIMIT p_limit;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §10. get_trending_listings()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Read-side wrapper over trending_listings.  Applies live spam/fraud filters
-- so admin actions take effect immediately without waiting for the next
-- 15-minute refresh.

CREATE OR REPLACE FUNCTION public.get_trending_listings(
  p_scope_type text    DEFAULT 'national',
  p_scope_id   integer DEFAULT 0,
  p_type       text    DEFAULT NULL,
  p_limit      integer DEFAULT 20
)
RETURNS TABLE (
  id                  uuid,
  type                text,
  slug                text,
  title               text,
  short_description   text,
  cover_url           text,
  location_text       text,
  price_text          text,
  price_amount        numeric,
  is_featured         boolean,
  is_verified         boolean,
  province_id         integer,
  category_id         integer,
  updated_at          timestamptz,
  velocity_score      real,
  rank_position       smallint,
  session_diversity   real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.type::text          AS type,
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
    l.category_id,
    l.updated_at,
    tl.velocity_score,
    tl.rank_position,
    tl.session_diversity
  FROM public.trending_listings tl
  JOIN public.listings              l  ON l.id          = tl.listing_id
  LEFT JOIN public.listing_quality_scores qs ON qs.listing_id = l.id
  LEFT JOIN public.merchant_trust_scores  ts ON ts.profile_id  = l.owner_id
  WHERE tl.scope_type            = p_scope_type
    AND tl.scope_id              = p_scope_id
    AND l.status                 = 'published'
    AND l.moderation_status      = 'approved'
    AND l.is_public              = true
    AND COALESCE(ts.fraud_flag, false) = false
    AND CASE
          WHEN COALESCE(qs.bounce_rate, 0) > 0.85 THEN 0.85
          WHEN COALESCE(qs.bounce_rate, 0) > 0.70 THEN 0.30
          ELSE 0.0
        END < 0.80
    AND (p_type IS NULL OR l.type::text = p_type)
  ORDER BY tl.velocity_score DESC, tl.rank_position ASC, l.id
  LIMIT p_limit;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §11. get_recommendation_candidates()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Unified candidate pool for the AI reranker.  Companion to
-- search_listings_candidates() from 024 — that function retrieves on a
-- query string; this function retrieves on a (listing, user, geography)
-- context with no query string.
--
-- Four candidate sources are merged via UNION ALL and DISTINCT ON:
--
--   1. graph        — listing_similarity_graph WHERE source_id = p_listing_id.
--   2. trending     — trending_listings for province scope (or national).
--   3. personalized — ANN against listing_embeddings using the user's
--                     interest vector.
--   4. cold_start   — listings created within 7 days, no embedding yet
--                     (gives new listings a fair shot at exposure).
--
-- DISTINCT ON keeps the highest-priority source per listing
-- (graph > personalized > trending > cold_start).
--
-- Computes the 14-feature ranking_breakdown vector used by 024.

CREATE OR REPLACE FUNCTION public.get_recommendation_candidates(
  p_listing_id  uuid    DEFAULT NULL,
  p_profile_id  uuid    DEFAULT NULL,
  p_province_id integer DEFAULT NULL,
  p_category_id integer DEFAULT NULL,
  p_type        text    DEFAULT NULL,
  p_limit       integer DEFAULT 100
)
RETURNS TABLE (
  listing_id            uuid,
  type                  text,
  slug                  text,
  title                 text,
  short_description     text,
  cover_url             text,
  location_text         text,
  price_text            text,
  price_amount          numeric,
  is_featured           boolean,
  is_verified           boolean,
  province_id           integer,
  district_id           integer,
  category_id           integer,
  updated_at            timestamptz,
  candidate_source      text,
  similarity_score      double precision,
  velocity_score        double precision,
  personalization_score double precision,
  quality_score         double precision,
  content_score         double precision,
  trust_score           double precision,
  freshness_score       double precision,
  ctr_signal            double precision,
  spam_penalty          double precision,
  combined_score        double precision,
  why_recommended       jsonb,
  ranking_breakdown     jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uiv_embedding   vector(384);
  uiv_data_points integer := 0;
BEGIN
  PERFORM set_config('hnsw.ef_search', '200', true);

  IF p_profile_id IS NOT NULL THEN
    SELECT uiv.interest_embedding, uiv.data_points
    INTO uiv_embedding, uiv_data_points
    FROM public.user_interest_vectors uiv
    WHERE uiv.profile_id = p_profile_id;
  END IF;

  RETURN QUERY
  WITH
  -- ── Source 1: graph ────────────────────────────────────────────────
  graph_cands AS (
    SELECT
      sg.target_id                       AS listing_id,
      'graph'::text                      AS source,
      1                                   AS source_priority,
      sg.similarity_score::float8        AS similarity_score,
      0.0::float8                         AS velocity_score,
      0.0::float8                         AS personalization_score,
      jsonb_build_object(
        'edge_type',        sg.edge_type,
        'behavioral_score', sg.behavioral_score,
        'semantic_score',   sg.semantic_score,
        'category_match',   sg.category_match,
        'province_match',   sg.province_match,
        'price_proximity',  sg.price_proximity
      ) AS shared_signals
    FROM public.listing_similarity_graph sg
    WHERE p_listing_id IS NOT NULL
      AND sg.source_id = p_listing_id
    ORDER BY sg.similarity_score DESC
    LIMIT 40
  ),
  -- ── Source 2: trending ──────────────────────────────────────────────
  trending_cands AS (
    SELECT
      tl.listing_id                      AS listing_id,
      'trending'::text                   AS source,
      3                                   AS source_priority,
      0.0::float8                         AS similarity_score,
      tl.velocity_score::float8          AS velocity_score,
      0.0::float8                         AS personalization_score,
      jsonb_build_object(
        'scope_type',        tl.scope_type,
        'scope_id',          tl.scope_id,
        'session_diversity', tl.session_diversity,
        'rank_position',     tl.rank_position
      ) AS shared_signals
    FROM public.trending_listings tl
    WHERE
      CASE
        WHEN p_province_id IS NOT NULL
          THEN tl.scope_type = 'province' AND tl.scope_id = p_province_id
        WHEN p_category_id IS NOT NULL
          THEN tl.scope_type = 'category' AND tl.scope_id = p_category_id
        ELSE tl.scope_type = 'national' AND tl.scope_id = 0
      END
    ORDER BY tl.rank_position
    LIMIT 30
  ),
  -- ── Source 3: personalised ──────────────────────────────────────────
  personalized_cands AS (
    SELECT
      le.listing_id                      AS listing_id,
      'personalized'::text               AS source,
      2                                   AS source_priority,
      0.0::float8                         AS similarity_score,
      0.0::float8                         AS velocity_score,
      GREATEST(0.0,
        (1.0 - (le.embedding <=> uiv_embedding))::float8
      )                                   AS personalization_score,
      jsonb_build_object(
        'data_points',   uiv_data_points,
        'cosine_distance', (le.embedding <=> uiv_embedding)::float8
      ) AS shared_signals
    FROM public.listing_embeddings le
    WHERE uiv_embedding IS NOT NULL
      AND uiv_data_points >= 3
    ORDER BY le.embedding <=> uiv_embedding
    LIMIT 40
  ),
  -- ── Source 4: cold-start ────────────────────────────────────────────
  cold_cands AS (
    SELECT
      l.id                                AS listing_id,
      'cold_start'::text                  AS source,
      4                                   AS source_priority,
      0.0::float8                         AS similarity_score,
      0.0::float8                         AS velocity_score,
      0.0::float8                         AS personalization_score,
      jsonb_build_object(
        'created_at', l.created_at,
        'age_hours',  EXTRACT(epoch FROM (now() - l.created_at))::float8 / 3600.0
      ) AS shared_signals
    FROM public.listings l
    LEFT JOIN public.listing_embeddings le ON le.listing_id = l.id
    WHERE l.created_at >= now() - interval '7 days'
      AND l.status            = 'published'
      AND l.moderation_status = 'approved'
      AND l.is_public         = true
      AND le.listing_id IS NULL  -- no embedding yet
      AND (p_type        IS NULL OR l.type::text  = p_type)
      AND (p_province_id IS NULL OR l.province_id = p_province_id)
      AND (p_category_id IS NULL OR l.category_id = p_category_id)
    ORDER BY l.created_at DESC, l.id
    LIMIT 20
  ),
  -- Merge + dedup
  unioned AS (
    SELECT * FROM graph_cands
    UNION ALL SELECT * FROM trending_cands
    UNION ALL SELECT * FROM personalized_cands
    UNION ALL SELECT * FROM cold_cands
  ),
  deduped AS (
    SELECT DISTINCT ON (listing_id)
      listing_id, source, source_priority,
      similarity_score, velocity_score, personalization_score,
      shared_signals
    FROM unioned
    ORDER BY listing_id, source_priority ASC
  ),
  enriched AS (
    SELECT
      d.listing_id,
      d.source,
      d.similarity_score,
      d.velocity_score,
      d.personalization_score,
      d.shared_signals,
      l.id,
      l.type::text          AS l_type,
      l.slug,
      l.title,
      l.short_description,
      l.cover_url,
      l.location_text,
      l.price_text,
      l.price_amount,
      l.is_featured,
      l.is_verified,
      l.province_id         AS l_province_id,
      l.district_id         AS l_district_id,
      l.category_id         AS l_category_id,
      l.owner_id,
      l.updated_at          AS l_updated_at,
      l.created_at          AS l_created_at,
      COALESCE(qs.quality_score, 0)::float8       AS q_quality_score,
      COALESCE(qs.inquiry_rate, 0)::float8        AS inquiry_rate,
      COALESCE(qs.save_rate, 0)::float8           AS save_rate,
      COALESCE(qs.bounce_rate, 0)::float8         AS bounce_rate,
      COALESCE(qs.avg_dwell_seconds, 0)::float8   AS avg_dwell_seconds,
      COALESCE(cs.ctr_7d, 0)::float8              AS ctr_7d,
      COALESCE(cs.impressions_7d, 0)              AS impressions_7d,
      COALESCE(ts.trust_score, 0)::float8         AS trust_score,
      COALESCE(ts.identity_verified, false)       AS identity_verified,
      COALESCE(ts.fraud_flag, false)              AS fraud_flag,
      COALESCE(ts.active_listings, 0)             AS merchant_active_listings,
      COALESCE(scs.trending_score, 0)::float8     AS listing_trending_score,
      CASE
        WHEN length(COALESCE(l.title, '')) >= 20
         AND length(COALESCE(l.description, '')) >= 80
         AND l.cover_url IS NOT NULL THEN 0.90
        WHEN length(COALESCE(l.title, '')) >= 12
         AND l.cover_url IS NOT NULL THEN 0.60
        WHEN length(COALESCE(l.title, '')) >= 8  THEN 0.30
        ELSE 0.10
      END::float8                                  AS content_score,
      CASE
        WHEN COALESCE(qs.bounce_rate, 0) > 0.85
          OR (COALESCE(qs.inquiry_rate, 0) = 0
              AND COALESCE(qs.quality_score, 0) < 0.10)
          THEN 0.85
        WHEN COALESCE(qs.bounce_rate, 0) > 0.70 THEN 0.30
        ELSE 0.0
      END::float8                                  AS spam_penalty,
      LEAST(
        1.0,
        GREATEST(
          0.0,
          1.0 - (EXTRACT(epoch FROM (now() - l.updated_at))::float8 / 2592000.0)
        )
      )::float8                                    AS freshness_score
    FROM deduped d
    JOIN public.listings              l  ON l.id          = d.listing_id
    LEFT JOIN public.listing_quality_scores qs  ON qs.listing_id  = l.id
    LEFT JOIN public.listing_ctr_stats      cs  ON cs.listing_id  = l.id
    LEFT JOIN public.merchant_trust_scores  ts  ON ts.profile_id  = l.owner_id
    LEFT JOIN public.listing_scores         scs ON scs.listing_id = l.id
    WHERE l.status            = 'published'
      AND l.moderation_status = 'approved'
      AND l.is_public         = true
      AND COALESCE(ts.fraud_flag, false) = false
      AND (p_type IS NULL OR l.type::text = p_type)
  ),
  scored AS (
    SELECT
      e.*,
      (
        e.similarity_score      * 0.20
        + e.personalization_score * 0.20
        + LEAST(0.20, e.velocity_score * 0.05)
        + LEAST(0.15, e.q_quality_score * 0.15)
        + LEAST(0.10, e.content_score * 0.10)
        + LEAST(0.10, e.trust_score / 100.0 * 0.10)
        + e.freshness_score * 0.05
        + LEAST(0.10, e.ctr_7d * 1.5)
        - e.spam_penalty
      )::float8 AS combined_score,
      CASE
        WHEN e.source = 'graph'        THEN 'similar_to_seed'
        WHEN e.source = 'trending'     THEN 'rising_in_scope'
        WHEN e.source = 'personalized' THEN 'matches_user_interest'
        WHEN e.source = 'cold_start'   THEN 'fresh_listing'
        ELSE                                'unspecified'
      END AS primary_signal
    FROM enriched e
  )
  SELECT
    s.id                                AS listing_id,
    s.l_type                            AS type,
    s.slug,
    s.title,
    s.short_description,
    s.cover_url,
    s.location_text,
    s.price_text,
    s.price_amount,
    s.is_featured,
    s.is_verified,
    s.l_province_id                     AS province_id,
    s.l_district_id                     AS district_id,
    s.l_category_id                     AS category_id,
    s.l_updated_at                      AS updated_at,
    s.source                            AS candidate_source,
    s.similarity_score,
    s.velocity_score,
    s.personalization_score,
    s.q_quality_score                   AS quality_score,
    s.content_score,
    s.trust_score,
    s.freshness_score,
    s.ctr_7d                            AS ctr_signal,
    s.spam_penalty,
    s.combined_score,
    jsonb_build_object(
      'source',            s.source,
      'primary_signal',    s.primary_signal,
      'score_contribution', s.combined_score,
      'shared_signals',    s.shared_signals
    ) AS why_recommended,
    jsonb_build_object(
      'source',             s.source,
      'similarity',         s.similarity_score,
      'velocity',           s.velocity_score,
      'personalization',    s.personalization_score,
      'quality',            s.q_quality_score,
      'content',            s.content_score,
      'trust',              s.trust_score,
      'freshness',          s.freshness_score,
      'ctr',                s.ctr_7d,
      'inquiry_rate',       s.inquiry_rate,
      'save_rate',          s.save_rate,
      'bounce_rate',        s.bounce_rate,
      'avg_dwell_seconds',  s.avg_dwell_seconds,
      'spam_penalty',       s.spam_penalty,
      'combined',           s.combined_score
    ) AS ranking_breakdown
  FROM scored s
  ORDER BY s.combined_score DESC, s.l_updated_at DESC, s.id
  LIMIT p_limit;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §12. pg_cron jobs
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Staggered schedule (minute slots) to avoid contention with the existing
-- pipeline from 010 / 011 / 013 / 024:
--
--   :05, :35     refresh_user_interest_vectors
--   :08, :23, :38, :53   refresh_trending_listings (every 15 min)
--   :20, :50     refresh_user_behavior_profiles
--   :45          refresh_trending_keywords (hourly)
--   02:00 UTC    refresh_listing_similarity_graph (daily)

DO $$
BEGIN
  PERFORM cron.schedule(
    'refresh-trending-listings',
    '8-59/15 * * * *',
    $$SELECT public.refresh_trending_listings()$$
  );
  PERFORM cron.schedule(
    'refresh-user-interest-vectors',
    '5-59/30 * * * *',
    $$SELECT public.refresh_user_interest_vectors()$$
  );
  PERFORM cron.schedule(
    'refresh-user-behavior-profiles',
    '20-59/30 * * * *',
    $$SELECT public.refresh_user_behavior_profiles()$$
  );
  PERFORM cron.schedule(
    'refresh-trending-keywords',
    '45 * * * *',
    $$SELECT public.refresh_trending_keywords()$$
  );
  PERFORM cron.schedule(
    'refresh-listing-similarity-graph',
    '0 2 * * *',
    $$SELECT public.refresh_listing_similarity_graph()$$
  );
EXCEPTION WHEN undefined_function OR undefined_schema THEN
  RAISE WARNING
    '[025] pg_cron not enabled — recommendation refresh jobs will not auto-run. '
    'Enable pg_cron, then call cron.schedule() manually.';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- §13. RLS policies
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.listing_similarity_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interest_vectors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_profile    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_keywords        ENABLE ROW LEVEL SECURITY;

-- Public reads for cross-listing similarity (no PII).
DROP POLICY IF EXISTS "listing_similarity_graph_public_read"
  ON public.listing_similarity_graph;
CREATE POLICY "listing_similarity_graph_public_read"
  ON public.listing_similarity_graph FOR SELECT
  TO anon, authenticated USING (true);

-- Public reads for trending feeds (already aggregated, no PII).
DROP POLICY IF EXISTS "trending_listings_public_read"
  ON public.trending_listings;
CREATE POLICY "trending_listings_public_read"
  ON public.trending_listings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "trending_keywords_public_read"
  ON public.trending_keywords;
CREATE POLICY "trending_keywords_public_read"
  ON public.trending_keywords FOR SELECT
  TO anon, authenticated USING (true);

-- Per-user privacy: authenticated users may read ONLY their own row.
DROP POLICY IF EXISTS "user_interest_vectors_owner_read"
  ON public.user_interest_vectors;
CREATE POLICY "user_interest_vectors_owner_read"
  ON public.user_interest_vectors FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "user_behavior_profile_owner_read"
  ON public.user_behavior_profile;
CREATE POLICY "user_behavior_profile_owner_read"
  ON public.user_behavior_profile FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- §14. Grants
-- ══════════════════════════════════════════════════════════════════════════════

-- Refresh functions: admin / cron only.
REVOKE EXECUTE ON FUNCTION public.refresh_listing_similarity_graph()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_user_interest_vectors()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_user_behavior_profiles()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_trending_listings()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_trending_keywords()
  FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_listing_similarity_graph() TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_user_interest_vectors()    TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_user_behavior_profiles()   TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_trending_listings()        TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_trending_keywords()        TO postgres;

-- Query API.
GRANT EXECUTE ON FUNCTION public.get_similar_listings(uuid, integer, uuid)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_personalized_feed(
  uuid, integer, integer, text, integer,
  double precision, timestamptz, uuid
) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_personalized_feed(
  uuid, integer, integer, text, integer,
  double precision, timestamptz, uuid
) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_trending_listings(text, integer, text, integer)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_recommendation_candidates(
  uuid, uuid, integer, integer, text, integer
) TO anon, authenticated;

-- Table-level SELECTs (RLS still applies).
GRANT SELECT ON public.listing_similarity_graph TO anon, authenticated;
GRANT SELECT ON public.trending_listings        TO anon, authenticated;
GRANT SELECT ON public.trending_keywords        TO anon, authenticated;

REVOKE SELECT ON public.user_interest_vectors FROM anon;
REVOKE SELECT ON public.user_behavior_profile FROM anon;
GRANT SELECT ON public.user_interest_vectors TO authenticated;
GRANT SELECT ON public.user_behavior_profile TO authenticated;

-- ── End of 025_recommendation_engine.sql ──────────────────────────────────────
