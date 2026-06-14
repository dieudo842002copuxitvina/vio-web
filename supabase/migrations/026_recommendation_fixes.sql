-- ── 026_recommendation_fixes.sql ─────────────────────────────────────────────
-- Patches for critical and high-priority issues found in 025_recommendation_engine.
--
-- Changes (no schema changes, no signature changes, no return-type changes):
--
--   §1  Indexes
--       • CREATE listing_relationships_strength_positive_idx
--         Eliminates full-scan in refresh_listing_similarity_graph when
--         filtering listing_relationships WHERE strength > 0.
--       • DROP user_interest_vectors_hnsw_idx
--         The index is never used by any query in 025: get_personalized_feed
--         does ANN over listing_embeddings using the user vector as the query
--         parameter, not over user_interest_vectors.  Removing saves ~1.5 GB
--         RAM and avoids a 30-min build cost at 1M users.
--
--   §2  get_similar_listings() — OR REPLACE
--       • Remove custom spam_penalty CASE logic in both the graph-path enriched
--         CTE and the ANN-fallback enriched CTE.
--       • Replace with COALESCE(qs.spam_penalty, 0.0)::float8.
--         listing_quality_scores.spam_penalty (set by refresh_listing_quality_scores
--         from migration 019) is the canonical anti-spam signal: it incorporates
--         listing_authenticity.spam_score and is kept current by a 15-min cron.
--         The bespoke CASE on bounce_rate/inquiry_rate had an operator-precedence
--         bug that silently assigned spam_penalty = 0.85 to every new listing
--         (inquiry_rate = 0, quality_score = 0 on first publish), blacklisting
--         cold-start inventory from the "similar" widget.
--       • Remove bounce_rate and inquiry_rate from both enriched CTEs — they were
--         only consumed by the CASE expression that is being removed.
--
--   §3  get_personalized_feed() — OR REPLACE
--       • Pre-load all province and category affinities for the calling user into
--         two JSONB maps (uiv_prov_affinities, uiv_cat_affinities) before the
--         main query runs.
--       • Replace two correlated subqueries per candidate row with JSONB ->>
--         lookups against those maps.
--         The original subqueries executed once per ANN candidate: with k_pool =
--         GREATEST(p_limit × 10, 100) that is ≥ 200 index lookups per call.
--         The fix reduces that to a single indexed scan of user_affinities once
--         per function invocation regardless of k_pool size.
--
-- Depends on: 025_recommendation_engine
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────


-- ══════════════════════════════════════════════════════════════════════════════
-- §1.  Indexes
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1.1  listing_relationships_strength_positive_idx ─────────────────────────
-- refresh_listing_similarity_graph filters listing_relationships WHERE strength > 0.
-- Without this index the planner must scan all rows of listing_relationships
-- (potentially millions) to discard zero-strength entries.
-- The partial predicate keeps index size small: only rows with positive strength
-- are included.
--
-- Planner note: the existing (source_listing_id, strength DESC) index (013)
-- supports per-source lookups; this index supports the cross-source scan that
-- the similarity-graph builder performs without a specific source_listing_id
-- predicate.

CREATE INDEX IF NOT EXISTS listing_relationships_strength_positive_idx
  ON public.listing_relationships (strength DESC)
  WHERE strength > 0;

-- ── 1.2  Drop unused HNSW index on user_interest_vectors ─────────────────────
-- get_personalized_feed issues ANN queries against listing_embeddings using
-- the user's interest_embedding as the query vector — it does NOT scan
-- user_interest_vectors via HNSW.  The index therefore adds build and
-- maintenance cost with zero query benefit.
-- Re-add with a comment in a future migration if user-user CF is implemented.

DROP INDEX IF EXISTS public.user_interest_vectors_hnsw_idx;


-- ══════════════════════════════════════════════════════════════════════════════
-- §2.  get_similar_listings() — spam_penalty correctness fix
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Signature and return type are identical to 025.  OR REPLACE is safe.

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
    -- ── Primary path: listing_similarity_graph ─────────────────────────────
    RETURN QUERY
    WITH candidate AS (
      SELECT
        sg.target_id        AS lid,
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
        l.type::text                                  AS type,
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
        COALESCE(qs.quality_score, 0)::float8         AS quality_score,
        COALESCE(cs.ctr_7d, 0)::float8                AS ctr_7d,
        COALESCE(ts.fraud_flag, false)                AS fraud_flag,
        COALESCE(ts.active_listings, 0)               AS merchant_active_listings,
        -- Canonical spam signal from listing_quality_scores (set by
        -- refresh_listing_quality_scores, which reads listing_authenticity).
        -- Replaces a bespoke bounce_rate CASE that had an operator-precedence
        -- bug silently blacklisting all cold-start listings.
        COALESCE(qs.spam_penalty, 0.0)::float8        AS spam_penalty
      FROM candidate c
      JOIN public.listings                   l  ON l.id           = c.lid
      LEFT JOIN public.listing_quality_scores qs ON qs.listing_id  = l.id
      LEFT JOIN public.listing_ctr_stats      cs ON cs.listing_id  = l.id
      LEFT JOIN public.merchant_trust_scores  ts ON ts.profile_id  = l.owner_id
      WHERE l.id              <> p_listing_id
        AND l.status           = 'published'
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
            WHEN s.semantic_score > s.behavioral_score AND s.semantic_score > 0.20
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

  -- ── Fallback path: ANN over listing_embeddings ─────────────────────────────
  SELECT le.embedding INTO seed_embedding
  FROM public.listing_embeddings le
  WHERE le.listing_id = p_listing_id;

  IF seed_embedding IS NULL THEN
    -- No graph edges and no embedding — degrade gracefully to empty result.
    RETURN;
  END IF;

  RETURN QUERY
  WITH ann AS (
    SELECT
      le.listing_id                                                      AS lid,
      GREATEST(0.0, (1.0 - (le.embedding <=> seed_embedding))::real)    AS sim
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
      l.type::text                                  AS type,
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
      COALESCE(ts.fraud_flag, false)                AS fraud_flag,
      -- Canonical spam signal; replaces bespoke bounce_rate CASE (see §2 header).
      COALESCE(qs.spam_penalty, 0.0)::float8        AS spam_penalty
    FROM ann a
    JOIN public.listings                   l  ON l.id           = a.lid
    LEFT JOIN public.listing_quality_scores qs ON qs.listing_id  = l.id
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
    e.sim                       AS similarity_score,
    'related'::text             AS edge_type,
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
-- §3.  get_personalized_feed() — N+1 affinity lookup fix
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Signature and return type are identical to 025.  OR REPLACE is safe.
--
-- Root cause of the N+1:
--   The 025 version executes two correlated subqueries against user_affinities
--   per row inside the enriched CTE:
--
--     (SELECT MAX(ua.score) FROM user_affinities ua
--      WHERE ua.profile_id = p_profile_id AND ua.affinity_type = 'province'
--        AND ua.affinity_key = l.province_id::text)
--
--     (SELECT MAX(ua.score) FROM user_affinities ua
--      WHERE ua.profile_id = p_profile_id AND ua.affinity_type = 'category'
--        AND ua.affinity_key = l.category_id::text)
--
--   With k_pool = GREATEST(p_limit × 10, 100) ANN candidates, this fires
--   2 × k_pool index lookups per function call — a minimum of 200 extra
--   index probes that scale with p_limit.
--
-- Fix:
--   Load all province and category affinities for the calling user once into
--   two JSONB maps before the main query begins.  Inside enriched, replace
--   the correlated subqueries with JSONB ->> key lookups (O(log n) on the
--   map, executed in memory with no further index access).
--
--   The MAX() behaviour is preserved by grouping in the pre-load query.
--
-- Performance:
--   Before: 2 × k_pool index lookups per call  (≥ 200 at default p_limit)
--   After:  1 index scan of user_affinities per call, regardless of k_pool

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
  uiv_embedding        vector(384);
  uiv_data_points      integer          := 0;
  uiv_primary_cat      integer;
  uiv_primary_prv      integer;
  is_bot               boolean          := false;
  use_personalised     boolean          := false;
  k_pool               integer;
  -- JSONB maps: { "<affinity_key>" : score, … }
  -- Populated once below; used in the enriched CTE via ->> lookups.
  uiv_prov_affinities  jsonb            := '{}';
  uiv_cat_affinities   jsonb            := '{}';
BEGIN
  PERFORM set_config('hnsw.ef_search', '150', true);

  -- ── 1. Fetch user interest vector ────────────────────────────────────────
  SELECT
    uiv.interest_embedding,
    uiv.data_points,
    uiv.primary_category_id,
    uiv.primary_province_id
  INTO uiv_embedding, uiv_data_points, uiv_primary_cat, uiv_primary_prv
  FROM public.user_interest_vectors uiv
  WHERE uiv.profile_id = p_profile_id;

  -- ── 2. Check bot flag ─────────────────────────────────────────────────────
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

  -- ── 3. Pre-load affinities once (replaces N+1 correlated subqueries) ─────
  -- Aggregated with MAX() to match the original subquery semantics.
  -- Result is NULL when the user has no affinity rows; COALESCE defaults to {}.
  SELECT
    jsonb_object_agg(affinity_key, max_score) FILTER (WHERE affinity_type = 'province'),
    jsonb_object_agg(affinity_key, max_score) FILTER (WHERE affinity_type = 'category')
  INTO uiv_prov_affinities, uiv_cat_affinities
  FROM (
    SELECT affinity_type, affinity_key, MAX(score) AS max_score
    FROM public.user_affinities
    WHERE profile_id   = p_profile_id
      AND affinity_type IN ('province', 'category')
    GROUP BY affinity_type, affinity_key
  ) agg;

  uiv_prov_affinities := COALESCE(uiv_prov_affinities, '{}'::jsonb);
  uiv_cat_affinities  := COALESCE(uiv_cat_affinities,  '{}'::jsonb);

  -- ── 4. Personalised path ──────────────────────────────────────────────────
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
        l.type::text                                          AS type,
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
        COALESCE(qs.quality_score, 0)::float8                 AS quality_score,
        COALESCE(qs.bounce_rate,   0)::float8                 AS bounce_rate,
        COALESCE(cs.ctr_7d, 0)::float8                        AS ctr_7d,
        COALESCE(ts.fraud_flag, false)                        AS fraud_flag,
        COALESCE(ts.active_listings, 0)                       AS merchant_active_listings,
        CASE
          WHEN COALESCE(qs.bounce_rate, 0) > 0.85 THEN 0.85
          WHEN COALESCE(qs.bounce_rate, 0) > 0.70 THEN 0.30
          ELSE 0.0
        END::float8                                           AS spam_penalty,
        -- Province affinity: single JSONB lookup instead of correlated subquery.
        -- Key format matches user_affinities.affinity_key (province_id cast to text).
        COALESCE(
          (uiv_prov_affinities ->> l.province_id::text)::float8,
          0.0
        )                                                     AS province_affinity,
        -- Category affinity: same pattern.
        COALESCE(
          (uiv_cat_affinities ->> l.category_id::text)::float8,
          0.0
        )                                                     AS category_affinity
      FROM ann a
      JOIN public.listings                   l  ON l.id          = a.listing_id
      LEFT JOIN public.listing_quality_scores qs ON qs.listing_id = l.id
      LEFT JOIN public.listing_ctr_stats      cs ON cs.listing_id = l.id
      LEFT JOIN public.merchant_trust_scores  ts ON ts.profile_id = l.owner_id
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
                0.10 + EXTRACT(epoch FROM (now() - f.updated_at))::float8 / -2592000.0
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
        'source',                   'personalized',
        'semantic_score',           c.cosine_sim,
        'quality_score',            c.quality_score,
        'ctr_signal',               c.ctr_7d,
        'province_affinity',        c.province_affinity,
        'category_affinity',        c.category_affinity,
        'primary_category_match',   uiv_primary_cat IS NOT NULL AND c.category_id = uiv_primary_cat,
        'primary_province_match',   uiv_primary_prv IS NOT NULL AND c.province_id = uiv_primary_prv,
        'combined_score',           c.personalized_score
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

  -- ── 5. Cold-start fallback: province / category browse ───────────────────
  RETURN QUERY
  WITH base AS (
    SELECT
      l.id,
      l.type::text                                  AS type,
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
      COALESCE(qs.quality_score,    0)::float8       AS quality_score,
      COALESCE(qs.bounce_rate,      0)::float8       AS bounce_rate,
      COALESCE(cs.ctr_7d,           0)::float8       AS ctr_7d,
      COALESCE(ts.fraud_flag,       false)           AS fraud_flag,
      COALESCE(scs.trending_score,  0)::float8       AS trending_score
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
              0.15 + EXTRACT(epoch FROM (now() - b.updated_at))::float8 / -2592000.0
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
                          WHEN uiv_embedding IS NULL  THEN 'no_interest_vector'
                          WHEN uiv_data_points < 3    THEN 'insufficient_data_points'
                          WHEN is_bot                 THEN 'flagged_user'
                          ELSE                             'unspecified'
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


-- ── Grants (mirror 025 — no changes to access model) ─────────────────────────

GRANT EXECUTE ON FUNCTION public.get_similar_listings(uuid, integer, uuid)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_personalized_feed(
  uuid, integer, integer, text, integer, double precision, timestamptz, uuid
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_personalized_feed(
  uuid, integer, integer, text, integer, double precision, timestamptz, uuid
) FROM anon;

-- ── End 026_recommendation_fixes.sql ─────────────────────────────────────────
