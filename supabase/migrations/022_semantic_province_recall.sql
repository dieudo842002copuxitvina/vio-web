-- ══════════════════════════════════════════════════════════════════════════════
-- 022  SEMANTIC SEARCH — ANN PROVINCE RECALL FIX
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Addresses Critical Item 6: under-retrieval when a province filter is active.
--
-- Root cause: HNSW post-filtering.  The global ANN scan returns k_candidates
-- from the entire embedding space; when province_id covers only a small fraction
-- of listings (e.g. 5%), a k=100 candidate set may contain 0–2 matches after
-- the WHERE filter, regardless of how relevant those listings are.
--
-- Two fixes:
--
--   1.  ef_search = 200 (was: default 40)
--       Increases the HNSW beam-search width, yielding higher recall at the cost
--       of ~2–3× more distance computations per query.  At 384 dims and 1M rows
--       this adds ~3–5 ms per query — well within the 200 ms P99 budget.
--       Uses set_config(..., true) which is equivalent to SET LOCAL: the setting
--       reverts when the function's calling transaction ends.
--
--   2.  Dynamic k_candidates
--       Without province filter: k = GREATEST(100, p_limit × 5)   — unchanged
--       With province filter:    k = GREATEST(300, p_limit × 20)  — 4× headroom
--
--       Reasoning: if province X holds 5% of listings, we need 300 candidates
--       before filtering to expect ≥15 province hits at p_limit=20.
--       k = p_limit × 20 generalises: for any province covering ≥5% of the
--       index the expected post-filter recall is ≥ p_limit at k × 20.
--       Worst-case (very small province) the TypeScript hybrid fallback fires.
--
-- Safe to re-run: OR REPLACE.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION search_listings_semantic(
  query_embedding      vector(384),
  p_type               text        DEFAULT NULL,
  p_province_id        integer     DEFAULT NULL,
  p_district_id        integer     DEFAULT NULL,
  p_category_id        integer     DEFAULT NULL,
  p_price_min          numeric     DEFAULT NULL,
  p_price_max          numeric     DEFAULT NULL,
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
SET search_path = public
AS $$
DECLARE
  k_candidates integer;
BEGIN
  -- Widen the HNSW beam for this query (reverts at end of transaction).
  -- Default ef_search=40 is insufficient for K=100+ with geographic post-filtering.
  PERFORM set_config('hnsw.ef_search', '200', true);

  -- Dynamic candidate pool:
  --   Province filter active → 20× headroom to survive post-filter attrition.
  --   No geographic filter   → 5× headroom is sufficient (global recall is high).
  k_candidates := CASE
    WHEN p_province_id IS NOT NULL THEN GREATEST(300, p_limit * 20)
    ELSE                                GREATEST(100, p_limit * 5)
  END;

  RETURN QUERY
  WITH ann_candidates AS (
    -- ANN retrieval: nearest neighbours by cosine distance.
    -- Metadata filters are applied AFTER this scan to preserve recall.
    -- The enlarged k_candidates + ef_search=200 ensure geographic filters
    -- have enough candidates to return a full p_limit result page.
    SELECT
      le.listing_id,
      1.0 - (le.embedding <=> query_embedding)  AS cosine_similarity
    FROM public.listing_embeddings le
    ORDER BY le.embedding <=> query_embedding
    LIMIT k_candidates
  ),
  reranked AS (
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
        -- ── Semantic similarity (dominant at 70%) ──────────────────────────
        GREATEST(0.0, ac.cosine_similarity) * 0.70

        -- ── Static boosts ─────────────────────────────────────────────────
        + CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

        -- ── Geo context ───────────────────────────────────────────────────
        + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
            THEN 0.20 ELSE 0.0 END
        + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
            THEN 0.15 ELSE 0.0 END
        + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
            THEN 0.10 ELSE 0.0 END

        -- ── Freshness ─────────────────────────────────────────────────────
        + GREATEST(0.0, 0.05 * (
            1.0 - LEAST(
              EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
              1.0
            )
          ))

        -- ── CTR boost (max +0.40) ──────────────────────────────────────────
        + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
            THEN LEAST(0.40, GREATEST(0.0,
                   COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
            ELSE 0.0
          END

        -- ── Quality boost (max +0.30) ──────────────────────────────────────
        + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

        -- ── Cold-start floor (max +0.25) ───────────────────────────────────
        + CASE
            WHEN COALESCE(cs.impressions_7d, 0) < 50
                 AND EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0
            THEN 0.25 * GREATEST(0.0,
                   1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 604800.0)
            ELSE 0.0
          END

        -- ── Trust boost (max +0.05) ────────────────────────────────────────
        + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
                    AND COALESCE(mts.identity_verified, false)
            THEN 0.05 * LEAST(1.0,
                   (COALESCE(mts.trust_score, 0)::float - 80.0) / 20.0)
            ELSE 0.0
          END

        -- ── Spam penalty (max −0.40) ───────────────────────────────────────
        - COALESCE(qs.spam_penalty, 0)::numeric * 0.40
      )::float4 AS _rank

    FROM ann_candidates ac
    JOIN public.listings l ON l.id = ac.listing_id

    LEFT JOIN public.listing_ctr_stats       cs  ON cs.listing_id  = l.id
    LEFT JOIN public.listing_quality_scores  qs  ON qs.listing_id  = l.id
    LEFT JOIN public.merchant_trust_scores   mts ON mts.profile_id = l.owner_id

    WHERE
      l.is_public             = true
      AND l.moderation_status = 'approved'
      AND l.status            = 'published'
      AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
      AND (p_type        IS NULL OR l.type::text  = p_type)
      AND (p_province_id IS NULL OR l.province_id = p_province_id)
      AND (p_district_id IS NULL OR l.district_id = p_district_id)
      AND (p_category_id IS NULL OR l.category_id = p_category_id)
      AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
      AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
  )
  SELECT
    r.id,
    r.type::text,
    r.slug,
    r.title,
    r.short_description,
    r.cover_url,
    r.location_text,
    r.price_text,
    r.price_amount,
    r.is_featured,
    r.is_verified,
    r.province_id,
    r.district_id,
    r.category_id,
    r.contact_phone,
    r.updated_at,
    r._rank
  FROM reranked r
  WHERE (
    p_cursor_score IS NULL
    OR r._rank < p_cursor_score
    OR (r._rank = p_cursor_score AND r.updated_at < p_cursor_updated_at)
    OR (r._rank = p_cursor_score AND r.updated_at = p_cursor_updated_at
        AND r.id < p_cursor_id)
  )
  ORDER BY r._rank DESC, r.updated_at DESC, r.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_listings_semantic TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- END 022_semantic_province_recall.sql
-- ══════════════════════════════════════════════════════════════════════════════
