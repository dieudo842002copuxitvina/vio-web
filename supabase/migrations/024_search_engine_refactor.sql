-- ══════════════════════════════════════════════════════════════════════════════
-- 024  SEARCH ENGINE REFACTOR — STEP 2
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Expands the ranking formula, adds browse diversity, and delivers a unified
-- AI-reranking candidate pipeline.  All three functions are production-grade,
-- marketplace-scale, planner-aware, pgvector-aware, and AI-search-ready.
--
-- What this migration adds:
--
--   §1  search_listings_hybrid()  — OR REPLACE (same 14-param / float8 signature)
--       Adds 4 new ranking components vs migration 023:
--         • content_boost:   listing completeness + text richness  (max +0.15)
--         • save_signal:     save_rate from listing_quality_scores  (max +0.15)
--         • inquiry_signal:  inquiry_rate × 4, 5% = max            (max +0.20)
--         • identity_bonus:  identity_verified badge, unconditional (+0.03)
--       Enhances cold-start: single-phase → two-phase decay
--         Phase 1 (0–3 days):  0.25 × linear, CTR-aware reduction × 0.5
--         Phase 2 (3–7 days):  0.15 × linear, CTR-aware reduction × 0.5
--       All changes applied to both browse and scored paths.
--
--   §2  get_browse_feed() — NEW function
--       Purpose-built browse feed (q = '' always) with merchant diversity scoring.
--       Prevents feed domination by high-volume sellers via a static
--       merchant_diversity_factor derived from mts.active_listings.
--       Same return type as search_listings_hybrid(); cursor-stable pagination.
--
--   §3  search_listings_candidates() — DROP old (020 signature) + CREATE new
--       Unified AI reranking candidate export.
--       Two execution paths (plpgsql IF):
--         Path A (query_embedding IS NOT NULL): semantic ANN + keyword FULL OUTER JOIN
--         Path B (keyword-only):               FTS + trigram retrieval only
--       Returns one row per candidate with every individual feature score and
--       a ranking_breakdown jsonb column — the complete feature vector for an
--       external AI reranker.
--
-- Ranking budget after migration 024:
--   Text relevance:       0 – ~6.0   (FTS + trgm + exact title match)
--   Semantic similarity:  0 – +0.70  (cosine × 0.70 in candidates / semantic func)
--   Quality boost:        0 – +0.30  (listing_quality_scores.quality_score × 0.30)
--   Content boost:        0 – +0.15  (content_score × 0.15)                ← NEW
--   Save signal:          0 – +0.15  (save_rate × 1.0, capped)             ← NEW
--   Inquiry signal:       0 – +0.20  (inquiry_rate × 4.0, 5% = max)        ← NEW
--   CTR signal:           0 – +0.40  (impression-normalised, ≥50 gate)
--   Velocity boost:       0 – +0.30  (listing_scores.trending_score burst)
--   Featured boost:               +0.30
--   Verified boost:               +0.10
--   Geo relevance:        0 – +0.45  (province +0.20, district +0.15, cat +0.10)
--   Freshness:            0 – +0.05  (linear decay over 30 days)
--   Trust ramp:           0 – +0.05  (trust_score 80→100, linear)
--   Identity verified:            +0.03  (unconditional badge bonus)        ← NEW
--   Cold-start:           0 – +0.25  (two-phase: 0–3d × 0.25, 3–7d × 0.15) ← ENHANCED
--   Personalisation:      0 – +0.10  (province 0.04 + district 0.03 + cat 0.03)
--   Spam penalty:         0 – −0.40  (qs.spam_penalty × 0.40)
--   Hard exclusion:       WHERE spam_penalty < 0.80 AND NOT fraud_flag
--
-- Depends on: 001–023
-- Safe to re-run: OR REPLACE / DROP IF EXISTS / CREATE OR REPLACE throughout.
--
-- Rollback (manual — no DOWN migration):
--   §1: Restore from migration 023 (§7).
--   §2: DROP FUNCTION IF EXISTS public.get_browse_feed(
--         integer, integer, integer, text, numeric, numeric,
--         integer, double precision, timestamptz, uuid, uuid);
--   §3: DROP FUNCTION IF EXISTS public.search_listings_candidates(
--         text, vector, text, integer, integer, integer,
--         numeric, numeric, integer, uuid);
--       Restore search_listings_candidates from migration 020.
--
-- Performance expectations vs migration 023:
--   search_listings_hybrid (browse):  +5–8 ms  (3 extra LEFT JOIN columns read)
--   search_listings_hybrid (keyword): +5–8 ms  (same; signal joins already warm)
--   get_browse_feed:                  5–15 ms  (same index profile as browse mode)
--   search_listings_candidates:       15–40 ms (batch K=100, includes FULL OUTER JOIN)
-- ══════════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════════
-- §1.  search_listings_hybrid() — enhanced 15-component ranking
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Changes vs migration 023 (§7):
--
--   A. content_boost (max +0.15) — NEW
--      listing_quality_scores.content_score encodes listing completeness and
--      text richness (completeness × 0.60 + text_score × 0.40, from migration
--      019).  A fully-detailed listing gets +0.15 over a sparse one.
--      content_score ∈ [0,1] → content_boost = content_score × 0.15.
--
--   B. save_signal (max +0.15) — NEW
--      save_rate = saves / clicks (7-day window, from listing_quality_scores).
--      At 15% save rate (0.15) the signal is capped at +0.15.
--      save_rate ∈ [0, 1] → save_signal = LEAST(0.15, save_rate × 1.0).
--      No impressions gate (save_rate is click-normalised; a listing with
--      only 5 clicks but 2 saves still deserves the signal).
--
--   C. inquiry_signal (max +0.20) — NEW
--      inquiry_rate = inquiries / clicks (7-day window).
--      At 5% inquiry rate (0.05 × 4.0 = 0.20) the signal is capped at +0.20.
--      inquiry_rate ∈ [0, 1] → inquiry_signal = LEAST(0.20, inquiry_rate × 4.0).
--      Inquiry is the strongest intent signal in a marketplace; it deserves
--      the largest single behavioural component.
--
--   D. identity_verified bonus (+0.03) — NEW
--      Splits the trust boost into two sub-components:
--        trust_ramp:       0.05 × LEAST(1, (trust_score - 80) / 20)  [unchanged]
--        identity_verified: +0.03 unconditional badge bonus
--      Previously a merchant with trust_score 75 and identity_verified got 0.
--      Now they get +0.03.  Total trust max = 0.08.
--
--   E. Two-phase cold-start decay — ENHANCED
--      Old: single linear decay over 7 days, max +0.25.
--      New: Phase 1 (0–3 days): 0.25 × (1 – age/259200)   strong intro boost
--           Phase 2 (3–7 days): 0.15 × (1 – (age–3d)/4d)  gentle tail boost
--      CTR-aware: when ctr_7d > 0.05 (listing gaining traction), multiplied
--      by 0.5 so the cold-start floor cedes to earned engagement signals.
--      Condition unchanged: impressions_7d < 50.
--
-- No DROP required: same signature and float8 return type as migration 023.
-- Safe OR REPLACE.

CREATE OR REPLACE FUNCTION public.search_listings_hybrid(
  q                    text             DEFAULT '',
  p_type               text             DEFAULT NULL,
  p_province_id        integer          DEFAULT NULL,
  p_district_id        integer          DEFAULT NULL,
  p_category_id        integer          DEFAULT NULL,
  p_price_min          numeric          DEFAULT NULL,
  p_price_max          numeric          DEFAULT NULL,
  p_area_min           numeric          DEFAULT NULL,
  p_area_max           numeric          DEFAULT NULL,
  p_limit              integer          DEFAULT 20,
  p_cursor_score       double precision DEFAULT NULL,
  p_cursor_updated_at  timestamptz      DEFAULT NULL,
  p_cursor_id          uuid             DEFAULT NULL,
  p_profile_id         uuid             DEFAULT NULL
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
  rank_score        double precision
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q_norm         text;
  tsq            tsquery;
  area_schema_id uuid;
BEGIN
  -- Raise trigram similarity gate to 0.30.
  -- Forces the % operator to use the GIN index predicate, not just the bitmap.
  -- Reverts at end of calling transaction (LOCAL scope).
  PERFORM set_config('pg_trgm.similarity_threshold', '0.30', true);

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
    FROM   public.listing_attribute_schemas s
    WHERE  s.listing_type = 'land' AND s.key = 'area_m2'
    LIMIT  1;
  END IF;

  -- ── Browse-mode path (q = '') ────────────────────────────────────────────
  -- Planner uses listings_province_category_updated_idx or
  -- listings_province_type_featured_updated_idx to avoid full sort.

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
          -- ── Static boosts ────────────────────────────────────────────────
          CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
          + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

          -- ── Geo context ──────────────────────────────────────────────────
          + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
              THEN 0.20 ELSE 0.0 END
          + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
              THEN 0.15 ELSE 0.0 END
          + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
              THEN 0.10 ELSE 0.0 END

          -- ── Freshness: linear decay over 30 days (max +0.05) ─────────────
          + GREATEST(0.0, 0.05 * (
              1.0 - LEAST(
                EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
                1.0
              )
            ))

          -- ── CTR boost (impression-normalised, max +0.40) ──────────────────
          -- Gate: ≥50 impressions ensures statistical significance.
          -- ctr_7d - 0.03 baseline (3% organic CTR floor), × 5 to reach max.
          + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
              THEN LEAST(0.40, GREATEST(0.0,
                     COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
              ELSE 0.0
            END

          -- ── Quality boost (engagement composite, max +0.30) ───────────────
          + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

          -- ── Content boost (listing richness, max +0.15) ───────────────────
          -- content_score = completeness × 0.60 + text_score × 0.40 (019)
          + COALESCE(LEAST(0.15, qs.content_score::float8 * 0.15), 0.0)

          -- ── Save signal (interest conversion rate, max +0.15) ─────────────
          -- save_rate = saves / clicks (7-day, click-normalised)
          + COALESCE(LEAST(0.15, qs.save_rate::float8 * 1.0), 0.0)

          -- ── Inquiry signal (intent conversion rate, max +0.20) ────────────
          -- inquiry_rate = inquiries / clicks; 5% inquiry rate = max
          + COALESCE(LEAST(0.20, qs.inquiry_rate::float8 * 4.0), 0.0)

          -- ── Velocity boost: trending burst ratio (max +0.30) ──────────────
          + COALESCE(
              CASE WHEN ls.trending_score > 1.0
                THEN LEAST(0.30, (ls.trending_score::numeric - 1.0) * 0.20)
                ELSE 0.0
              END,
              0.0
            )

          -- ── Cold-start: two-phase decay, CTR-aware (max +0.25) ────────────
          -- Phase 1 (0–3 days): 0.25 × (1 – age/3d)    — strong intro boost
          -- Phase 2 (3–7 days): 0.15 × (1 – (age–3d)/4d) — gentle tail boost
          -- CTR-aware: × 0.5 when ctr_7d > 0.05 (listing earning traction)
          + CASE
              WHEN COALESCE(cs.impressions_7d, 0) < 50 THEN
                GREATEST(0.0,
                  CASE
                    WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 259200.0 THEN
                      0.25 * (1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 259200.0)
                    WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0 THEN
                      0.15 * (1.0 - (
                        EXTRACT(epoch FROM (now() - l.updated_at)) - 259200.0
                      ) / 345600.0)
                    ELSE 0.0
                  END
                ) * CASE WHEN COALESCE(cs.ctr_7d, 0) > 0.05 THEN 0.5 ELSE 1.0 END
              ELSE 0.0
            END

          -- ── Trust ramp (trust_score 80→100, max +0.05) ────────────────────
          + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
              THEN 0.05 * LEAST(1.0,
                     (COALESCE(mts.trust_score, 0)::float8 - 80.0) / 20.0)
              ELSE 0.0
            END

          -- ── Identity verified bonus (unconditional, +0.03) ────────────────
          + CASE WHEN COALESCE(mts.identity_verified, false) THEN 0.03 ELSE 0.0 END

          -- ── Spam penalty (max −0.40) ───────────────────────────────────────
          - COALESCE(qs.spam_penalty, 0)::numeric * 0.40

          -- ── Personalisation (max +0.10) ────────────────────────────────────
          + COALESCE(LEAST(0.04, ua_prov.score::numeric * 0.04), 0.0)
          + COALESCE(LEAST(0.03, ua_dist.score::numeric * 0.03), 0.0)
          + COALESCE(LEAST(0.03, ua_cat.score::numeric  * 0.03), 0.0)
        )::double precision AS _rank

      FROM public.listings l
      LEFT JOIN public.listing_ctr_stats      cs      ON cs.listing_id      = l.id
      LEFT JOIN public.listing_quality_scores qs      ON qs.listing_id      = l.id
      LEFT JOIN public.listing_scores         ls      ON ls.listing_id      = l.id
      LEFT JOIN public.merchant_trust_scores  mts     ON mts.profile_id     = l.owner_id
      LEFT JOIN public.user_affinities        ua_prov
            ON  ua_prov.profile_id    = p_profile_id
            AND ua_prov.affinity_type = 'province'
            AND ua_prov.affinity_key  = l.province_id::text
      LEFT JOIN public.user_affinities        ua_dist
            ON  ua_dist.profile_id    = p_profile_id
            AND ua_dist.affinity_type = 'district'
            AND ua_dist.affinity_key  = l.district_id::text
      LEFT JOIN public.user_affinities        ua_cat
            ON  ua_cat.profile_id     = p_profile_id
            AND ua_cat.affinity_type  = 'category'
            AND ua_cat.affinity_key   = l.category_id::text

      WHERE
        l.is_public             = true
        AND l.moderation_status = 'approved'
        AND l.status            = 'published'
        AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
        AND COALESCE(qs.spam_penalty, 0) < 0.80
        AND (p_type        IS NULL OR l.type::text   = p_type)
        AND (p_province_id IS NULL OR l.province_id  = p_province_id)
        AND (p_district_id IS NULL OR l.district_id  = p_district_id)
        AND (p_category_id IS NULL OR l.category_id  = p_category_id)
        AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
        AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
        AND (
          area_schema_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.listing_attribute_values av
            WHERE  av.listing_id = l.id
            AND    av.schema_id  = area_schema_id
            AND    (p_area_min IS NULL OR av.value_number >= p_area_min)
            AND    (p_area_max IS NULL OR av.value_number <= p_area_max)
          )
        )
    )
    SELECT
      b.id, b.type::text, b.slug, b.title, b.short_description, b.cover_url,
      b.location_text, b.price_text, b.price_amount, b.is_featured, b.is_verified,
      b.province_id, b.district_id, b.category_id, b.contact_phone,
      b.updated_at, b._rank
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

  -- ── Scored search path (q ≠ '') ──────────────────────────────────────────
  -- Text signals dominate; behavioural signals are additive and bounded.
  -- Gate uses the % operator (similarity >= pg_trgm.similarity_threshold)
  -- which forces the planner to use the GIN index for the predicate.

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
        -- ── Text relevance signals (dominant, 0–~6.0) ─────────────────────
        CASE
          WHEN l.title_normalized = q_norm                      THEN 2.0
          WHEN length(q_norm) >= 3
               AND l.title_normalized LIKE (q_norm || '%')      THEN 1.0
          ELSE 0.0
        END
        + CASE WHEN tsq IS NOT NULL
            THEN ts_rank(l.search_vector, tsq, 1) * 2.0
            ELSE 0.0
          END
        + GREATEST(0.0, similarity(l.title_normalized, q_norm) * 0.8)
        + GREATEST(0.0,
            COALESCE(similarity(l.short_description_normalized, q_norm), 0.0) * 0.2)

        -- ── Static boosts ────────────────────────────────────────────────
        + CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

        -- ── Geo context ──────────────────────────────────────────────────
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

        -- ── Content boost (max +0.15) ──────────────────────────────────────
        + COALESCE(LEAST(0.15, qs.content_score::float8 * 0.15), 0.0)

        -- ── Save signal (max +0.15) ────────────────────────────────────────
        + COALESCE(LEAST(0.15, qs.save_rate::float8 * 1.0), 0.0)

        -- ── Inquiry signal (max +0.20) ─────────────────────────────────────
        + COALESCE(LEAST(0.20, qs.inquiry_rate::float8 * 4.0), 0.0)

        -- ── Velocity boost (max +0.30) ─────────────────────────────────────
        + COALESCE(
            CASE WHEN ls.trending_score > 1.0
              THEN LEAST(0.30, (ls.trending_score::numeric - 1.0) * 0.20)
              ELSE 0.0
            END,
            0.0
          )

        -- ── Cold-start: two-phase decay, CTR-aware (max +0.25) ────────────
        + CASE
            WHEN COALESCE(cs.impressions_7d, 0) < 50 THEN
              GREATEST(0.0,
                CASE
                  WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 259200.0 THEN
                    0.25 * (1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 259200.0)
                  WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0 THEN
                    0.15 * (1.0 - (
                      EXTRACT(epoch FROM (now() - l.updated_at)) - 259200.0
                    ) / 345600.0)
                  ELSE 0.0
                END
              ) * CASE WHEN COALESCE(cs.ctr_7d, 0) > 0.05 THEN 0.5 ELSE 1.0 END
            ELSE 0.0
          END

        -- ── Trust ramp (max +0.05) ─────────────────────────────────────────
        + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
            THEN 0.05 * LEAST(1.0,
                   (COALESCE(mts.trust_score, 0)::float8 - 80.0) / 20.0)
            ELSE 0.0
          END

        -- ── Identity verified bonus (+0.03) ────────────────────────────────
        + CASE WHEN COALESCE(mts.identity_verified, false) THEN 0.03 ELSE 0.0 END

        -- ── Spam penalty (max −0.40) ───────────────────────────────────────
        - COALESCE(qs.spam_penalty, 0)::numeric * 0.40

        -- ── Personalisation (max +0.10) ────────────────────────────────────
        + COALESCE(LEAST(0.04, ua_prov.score::numeric * 0.04), 0.0)
        + COALESCE(LEAST(0.03, ua_dist.score::numeric * 0.03), 0.0)
        + COALESCE(LEAST(0.03, ua_cat.score::numeric  * 0.03), 0.0)
      )::double precision AS _rank

    FROM public.listings l
    LEFT JOIN public.listing_ctr_stats      cs      ON cs.listing_id      = l.id
    LEFT JOIN public.listing_quality_scores qs      ON qs.listing_id      = l.id
    LEFT JOIN public.listing_scores         ls      ON ls.listing_id      = l.id
    LEFT JOIN public.merchant_trust_scores  mts     ON mts.profile_id     = l.owner_id
    LEFT JOIN public.user_affinities        ua_prov
          ON  ua_prov.profile_id    = p_profile_id
          AND ua_prov.affinity_type = 'province'
          AND ua_prov.affinity_key  = l.province_id::text
    LEFT JOIN public.user_affinities        ua_dist
          ON  ua_dist.profile_id    = p_profile_id
          AND ua_dist.affinity_type = 'district'
          AND ua_dist.affinity_key  = l.district_id::text
    LEFT JOIN public.user_affinities        ua_cat
          ON  ua_cat.profile_id     = p_profile_id
          AND ua_cat.affinity_type  = 'category'
          AND ua_cat.affinity_key   = l.category_id::text

    WHERE
      l.is_public             = true
      AND l.moderation_status = 'approved'
      AND l.status            = 'published'
      AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
      AND COALESCE(qs.spam_penalty, 0) < 0.80

      AND (p_type        IS NULL OR l.type::text   = p_type)
      AND (p_province_id IS NULL OR l.province_id  = p_province_id)
      AND (p_district_id IS NULL OR l.district_id  = p_district_id)
      AND (p_category_id IS NULL OR l.category_id  = p_category_id)
      AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
      AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)

      -- Text gate: FTS hit OR prefix match OR GIN-backed trigram match.
      -- similarity_threshold = 0.30 was SET LOCAL above; the % operator
      -- (similarity >= threshold) forces GIN index predicate usage.
      AND (
        (tsq IS NOT NULL AND l.search_vector @@ tsq)
        OR (length(q_norm) >= 3 AND l.title_normalized LIKE (q_norm || '%'))
        OR l.title_normalized % q_norm
      )

      AND (
        area_schema_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.listing_attribute_values av
          WHERE  av.listing_id = l.id
          AND    av.schema_id  = area_schema_id
          AND    (p_area_min IS NULL OR av.value_number >= p_area_min)
          AND    (p_area_max IS NULL OR av.value_number <= p_area_max)
        )
      )
  )
  SELECT
    s.id, s.type::text, s.slug, s.title, s.short_description, s.cover_url,
    s.location_text, s.price_text, s.price_amount, s.is_featured, s.is_verified,
    s.province_id, s.district_id, s.category_id, s.contact_phone,
    s.updated_at, s._rank
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

GRANT EXECUTE ON FUNCTION public.search_listings_hybrid TO anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- §2.  get_browse_feed() — diversity-aware browse feed
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Purpose-built browse entry point (always q = '').  Returns listings ranked
-- by the same 15-component formula as search_listings_hybrid browse mode,
-- then multiplied by a merchant_diversity_factor to prevent feed domination
-- by high-volume sellers.
--
-- Merchant diversity factor (static, cursor-stable):
--   active_listings > 50  → × 0.80  (20% reduction)
--   active_listings > 20  → × 0.90  (10% reduction)
--   active_listings ≤ 20  → × 1.00  (no penalty)
--
-- Rationale for static factor vs window-based diversity:
--   Window-based diversity (e.g. "no more than 2 listings per merchant per
--   page") breaks cursor-based pagination — page 2 of the same cursor would
--   need to re-evaluate the entire prior result set.  A static factor is
--   cursor-stable: the effective rank of a listing never changes between
--   page 1 and page N of the same session.
--
--   The 0.80 and 0.90 values are mild penalties that reduce domination
--   without excluding high-quality sellers.  A featured listing from a
--   50-listing merchant (0.30 base) becomes 0.30 × 0.80 = 0.24 effective
--   rank — still competitive but no longer monopolising top slots.
--
-- Planner notes:
--   • listings_province_category_updated_idx: (province_id, category_id, updated_at)
--     — used when both p_province_id and p_category_id are non-null.
--   • listings_province_type_featured_updated_idx: (province_id, type, updated_at)
--     — used for homepage featured-in-province widget.
--   • listings_category_featured_updated_idx: (category_id, is_featured, updated_at)
--     — used for category-only browse.
--   • listings_owner_updated_public_idx: (owner_id, updated_at)
--     — used indirectly via the merchant_trust_scores JOIN on profile_id = owner_id.
--
-- Caching strategy (application layer):
--   get_browse_feed results are cacheable by (province_id, category_id, type,
--   price_min, price_max, cursor tuple).  Recommended Redis TTL: 2 minutes
--   (balance between freshness and latency for feed pages).
--   The cursor tuple must be included in the cache key; cursored pages are
--   independent cache entries.

CREATE OR REPLACE FUNCTION public.get_browse_feed(
  p_province_id        integer          DEFAULT NULL,
  p_district_id        integer          DEFAULT NULL,
  p_category_id        integer          DEFAULT NULL,
  p_type               text             DEFAULT NULL,
  p_price_min          numeric          DEFAULT NULL,
  p_price_max          numeric          DEFAULT NULL,
  p_limit              integer          DEFAULT 20,
  p_cursor_score       double precision DEFAULT NULL,
  p_cursor_updated_at  timestamptz      DEFAULT NULL,
  p_cursor_id          uuid             DEFAULT NULL,
  p_profile_id         uuid             DEFAULT NULL
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
  rank_score        double precision
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH feed AS (
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
      -- Base rank: identical to search_listings_hybrid browse mode
      (
        CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

        + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
            THEN 0.20 ELSE 0.0 END
        + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
            THEN 0.15 ELSE 0.0 END
        + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
            THEN 0.10 ELSE 0.0 END

        + GREATEST(0.0, 0.05 * (
            1.0 - LEAST(
              EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0, 1.0
            )
          ))

        + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
            THEN LEAST(0.40, GREATEST(0.0,
                   COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
            ELSE 0.0
          END

        + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)
        + COALESCE(LEAST(0.15, qs.content_score::float8 * 0.15), 0.0)
        + COALESCE(LEAST(0.15, qs.save_rate::float8 * 1.0), 0.0)
        + COALESCE(LEAST(0.20, qs.inquiry_rate::float8 * 4.0), 0.0)

        + COALESCE(
            CASE WHEN ls.trending_score > 1.0
              THEN LEAST(0.30, (ls.trending_score::numeric - 1.0) * 0.20)
              ELSE 0.0
            END,
            0.0
          )

        + CASE
            WHEN COALESCE(cs.impressions_7d, 0) < 50 THEN
              GREATEST(0.0,
                CASE
                  WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 259200.0 THEN
                    0.25 * (1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 259200.0)
                  WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0 THEN
                    0.15 * (1.0 - (
                      EXTRACT(epoch FROM (now() - l.updated_at)) - 259200.0
                    ) / 345600.0)
                  ELSE 0.0
                END
              ) * CASE WHEN COALESCE(cs.ctr_7d, 0) > 0.05 THEN 0.5 ELSE 1.0 END
            ELSE 0.0
          END

        + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
            THEN 0.05 * LEAST(1.0,
                   (COALESCE(mts.trust_score, 0)::float8 - 80.0) / 20.0)
            ELSE 0.0
          END
        + CASE WHEN COALESCE(mts.identity_verified, false) THEN 0.03 ELSE 0.0 END

        - COALESCE(qs.spam_penalty, 0)::numeric * 0.40

        + COALESCE(LEAST(0.04, ua_prov.score::numeric * 0.04), 0.0)
        + COALESCE(LEAST(0.03, ua_dist.score::numeric * 0.03), 0.0)
        + COALESCE(LEAST(0.03, ua_cat.score::numeric  * 0.03), 0.0)
      )::double precision AS _base_rank,

      -- Merchant diversity factor (static, cursor-stable)
      -- Applied after base rank to prevent high-volume seller domination.
      CASE
        WHEN COALESCE(mts.active_listings, 0) > 50 THEN 0.80
        WHEN COALESCE(mts.active_listings, 0) > 20 THEN 0.90
        ELSE 1.0
      END::double precision AS _diversity_factor

    FROM public.listings l
    LEFT JOIN public.listing_ctr_stats      cs      ON cs.listing_id      = l.id
    LEFT JOIN public.listing_quality_scores qs      ON qs.listing_id      = l.id
    LEFT JOIN public.listing_scores         ls      ON ls.listing_id      = l.id
    LEFT JOIN public.merchant_trust_scores  mts     ON mts.profile_id     = l.owner_id
    LEFT JOIN public.user_affinities        ua_prov
          ON  ua_prov.profile_id    = p_profile_id
          AND ua_prov.affinity_type = 'province'
          AND ua_prov.affinity_key  = l.province_id::text
    LEFT JOIN public.user_affinities        ua_dist
          ON  ua_dist.profile_id    = p_profile_id
          AND ua_dist.affinity_type = 'district'
          AND ua_dist.affinity_key  = l.district_id::text
    LEFT JOIN public.user_affinities        ua_cat
          ON  ua_cat.profile_id     = p_profile_id
          AND ua_cat.affinity_type  = 'category'
          AND ua_cat.affinity_key   = l.category_id::text

    WHERE
      l.is_public             = true
      AND l.moderation_status = 'approved'
      AND l.status            = 'published'
      AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
      AND COALESCE(qs.spam_penalty, 0) < 0.80
      AND (p_type        IS NULL OR l.type::text   = p_type)
      AND (p_province_id IS NULL OR l.province_id  = p_province_id)
      AND (p_district_id IS NULL OR l.district_id  = p_district_id)
      AND (p_category_id IS NULL OR l.category_id  = p_category_id)
      AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
      AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
  ),
  diversified AS (
    -- Apply diversity factor: effective rank used for ordering and cursor.
    -- Cursor comparisons use the diversity_rank so page N is stable.
    SELECT
      f.*,
      (f._base_rank * f._diversity_factor)::double precision AS _diversity_rank
    FROM feed f
  )
  SELECT
    d.id, d.type::text, d.slug, d.title, d.short_description, d.cover_url,
    d.location_text, d.price_text, d.price_amount, d.is_featured, d.is_verified,
    d.province_id, d.district_id, d.category_id, d.contact_phone,
    d.updated_at, d._diversity_rank AS rank_score
  FROM diversified d
  WHERE (
    p_cursor_score IS NULL
    OR d._diversity_rank < p_cursor_score
    OR (d._diversity_rank = p_cursor_score AND d.updated_at < p_cursor_updated_at)
    OR (d._diversity_rank = p_cursor_score AND d.updated_at = p_cursor_updated_at
        AND d.id < p_cursor_id)
  )
  ORDER BY d._diversity_rank DESC, d.updated_at DESC, d.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_browse_feed TO anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- §3.  search_listings_candidates() — unified AI reranking candidate pipeline
-- ══════════════════════════════════════════════════════════════════════════════
--
-- DROP old migration-020 signature first (different parameter list and return
-- type; OR REPLACE would create an overload, not replace the old function).

DROP FUNCTION IF EXISTS public.search_listings_candidates(
  vector, text, integer, integer, integer
);

-- search_listings_candidates() — new unified signature
--
-- Purpose: export a ranked candidate set of up to K=100 listings along with
-- every individual feature score for consumption by an external AI reranker.
-- Not intended for direct user-facing search (use search_listings_hybrid for
-- that).  The combined_score column provides a SQL-computed preliminary rank
-- that the reranker can use as a prior.
--
-- Parameters:
--   q                 — raw text query (empty string = no keyword component)
--   query_embedding   — pre-computed query vector (NULL = keyword-only path)
--   p_type            — listing type filter (NULL = all)
--   p_province_id     — province filter (also boosts rank)
--   p_district_id     — district filter (also boosts rank)
--   p_category_id     — category filter (also boosts rank)
--   p_price_min/max   — price range filter
--   p_limit           — candidate set size (default 100, max recommended 200)
--   p_profile_id      — personalisation context (NULL = no personalisation)
--
-- Execution paths:
--   Path A (query_embedding IS NOT NULL):
--     1. ANN scan: k_candidates = GREATEST(300, p_limit × 20) when province
--        filter active, else GREATEST(100, p_limit × 5) — same logic as
--        search_listings_semantic (migration 022/023).
--     2. Keyword candidates: FTS + trgm gate, LIMIT k_candidates × 2.
--     3. FULL OUTER JOIN by listing_id → retrieval_source ∈ {'semantic',
--        'keyword', 'both'}.
--     4. Join to all signal tables; compute 14 individual signal scores.
--     5. Order by combined_score DESC.
--
--   Path B (query_embedding IS NULL, q ≠ ''):
--     1. Keyword candidates only (same text gate as search_listings_hybrid).
--     2. semantic_score = 0.0, retrieval_source = 'keyword'.
--     3. Same signal computation and ranking_breakdown as Path A.
--
--   Returns empty when both q = '' and query_embedding IS NULL.
--   Call get_browse_feed() for unqueried browse use cases.
--
-- ranking_breakdown jsonb schema:
--   {
--     "retrieval_source": "semantic"|"keyword"|"both",
--     "semantic":         float,   -- cosine similarity score (0–1)
--     "keyword":          float,   -- text relevance score (0–~6)
--     "quality":          float,   -- quality_score boost (0–0.30)
--     "content":          float,   -- content_score boost (0–0.15)
--     "trust":            float,   -- trust ramp + identity bonus (0–0.08)
--     "freshness":        float,   -- linear freshness decay (0–0.05)
--     "ctr":              float,   -- CTR signal (0–0.40)
--     "save":             float,   -- save rate signal (0–0.15)
--     "inquiry":          float,   -- inquiry rate signal (0–0.20)
--     "geo":              float,   -- geo match boost (0–0.45)
--     "featured":         float,   -- featured boost (0 or 0.30)
--     "verified":         float,   -- verified boost (0 or 0.10)
--     "cold_start":       float,   -- cold-start boost (0–0.25)
--     "velocity":         float,   -- trending velocity (0–0.30)
--     "personalisation":  float,   -- user affinity boost (0–0.10)
--     "spam_penalty":     float,   -- spam penalty (0–1, raw value)
--     "is_duplicate":     boolean, -- from listing_authenticity
--     "duplicate_score":  float,   -- near-duplicate score (0–1)
--     "combined":         float    -- combined_score (preliminary rank)
--   }
--
-- Caching strategy (application layer):
--   search_listings_candidates is a batch operation intended for AI reranker
--   pipelines.  Results should be cached with a short TTL (30–60 seconds) at
--   the edge or server layer, keyed by (q_hash, embedding_hash, filters_hash,
--   p_profile_id, p_limit).  Embedding_hash can be computed from the first
--   4 floats of query_embedding (sufficient for cache key uniqueness).
--
-- AI reranker integration:
--   1. Call search_listings_candidates(q, embedding, filters, limit=100)
--   2. Deserialise ranking_breakdown jsonb per row as feature vector
--   3. Pass feature vectors to reranker model (XGBoost / LightGBM / NN)
--   4. Reranker returns top-K indices; apply to candidate rows
--   5. Surface top-K to user with original listing metadata
--   Optionally log reranker decisions back as listing_events for RLHF.

CREATE OR REPLACE FUNCTION public.search_listings_candidates(
  q                    text             DEFAULT '',
  query_embedding      vector(384)      DEFAULT NULL,
  p_type               text             DEFAULT NULL,
  p_province_id        integer          DEFAULT NULL,
  p_district_id        integer          DEFAULT NULL,
  p_category_id        integer          DEFAULT NULL,
  p_price_min          numeric          DEFAULT NULL,
  p_price_max          numeric          DEFAULT NULL,
  p_limit              integer          DEFAULT 100,
  p_profile_id         uuid             DEFAULT NULL
)
RETURNS TABLE (
  listing_id        uuid,
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
  updated_at        timestamptz,
  retrieval_source  text,
  semantic_score    double precision,
  keyword_score     double precision,
  quality_score     double precision,
  content_score     double precision,
  trust_score       double precision,
  freshness_score   double precision,
  ctr_signal        double precision,
  save_signal       double precision,
  inquiry_signal    double precision,
  spam_penalty      double precision,
  combined_score    double precision,
  ranking_breakdown jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q_norm       text;
  tsq          tsquery;
  k_candidates integer;
BEGIN
  PERFORM set_config('pg_trgm.similarity_threshold', '0.30', true);

  q_norm := normalize_vietnamese_text(q);

  -- Both inputs empty: undefined use case — caller should use get_browse_feed().
  IF q_norm = '' AND query_embedding IS NULL THEN
    RETURN;
  END IF;

  IF q_norm <> '' THEN
    BEGIN
      tsq := websearch_to_tsquery('simple', q_norm);
    EXCEPTION WHEN others THEN
      tsq := NULL;
    END;
  END IF;

  -- ── Path A: semantic + optional keyword hybrid ───────────────────────────

  IF query_embedding IS NOT NULL THEN

    PERFORM set_config('hnsw.ef_search', '200', true);

    k_candidates := CASE
      WHEN p_province_id IS NOT NULL THEN GREATEST(300, p_limit * 20)
      ELSE                                GREATEST(100, p_limit * 5)
    END;

    RETURN QUERY
    WITH
      semantic_cands AS (
        -- ANN scan: returns k_candidates nearest neighbours by cosine distance.
        -- Metadata filters applied downstream to preserve recall.
        SELECT
          le.listing_id,
          (1.0 - (le.embedding <=> query_embedding))::double precision AS cosine_sim
        FROM public.listing_embeddings le
        ORDER BY le.embedding <=> query_embedding
        LIMIT k_candidates
      ),
      keyword_cands AS (
        -- Keyword candidates: FTS + prefix + GIN trigram gate.
        -- q_norm = '' guard ensures this CTE is empty for pure-semantic calls,
        -- making the FULL OUTER JOIN degenerate to semantic_cands only.
        SELECT
          l.id AS listing_id,
          (
            CASE WHEN l.title_normalized = q_norm THEN 2.0 ELSE 0.0 END::double precision
            + CASE WHEN tsq IS NOT NULL
                THEN ts_rank(l.search_vector, tsq, 1)::double precision * 2.0
                ELSE 0.0
              END
            + GREATEST(0.0, similarity(l.title_normalized, q_norm)::double precision * 0.8)
            + GREATEST(0.0,
                COALESCE(similarity(l.short_description_normalized, q_norm), 0.0)::double precision * 0.2)
          ) AS kw_score
        FROM public.listings l
        WHERE l.is_public = true AND l.moderation_status = 'approved' AND l.status = 'published'
          AND q_norm <> ''
          AND (
            (tsq IS NOT NULL AND l.search_vector @@ tsq)
            OR (length(q_norm) >= 3 AND l.title_normalized LIKE (q_norm || '%'))
            OR l.title_normalized % q_norm
          )
          AND (p_type        IS NULL OR l.type::text   = p_type)
          AND (p_province_id IS NULL OR l.province_id  = p_province_id)
          AND (p_district_id IS NULL OR l.district_id  = p_district_id)
          AND (p_category_id IS NULL OR l.category_id  = p_category_id)
        LIMIT k_candidates * 2
      ),
      merged AS (
        -- FULL OUTER JOIN: a candidate appears if found by either or both paths.
        -- retrieval_source marks which retrieval path(s) found this listing.
        SELECT
          COALESCE(s.listing_id, k.listing_id)  AS listing_id,
          COALESCE(s.cosine_sim,  0.0)           AS _semantic_score,
          COALESCE(k.kw_score,    0.0)           AS _keyword_score,
          CASE
            WHEN s.listing_id IS NOT NULL AND k.listing_id IS NOT NULL THEN 'both'
            WHEN s.listing_id IS NOT NULL                               THEN 'semantic'
            ELSE 'keyword'
          END AS _retrieval_source
        FROM semantic_cands s
        FULL OUTER JOIN keyword_cands k ON k.listing_id = s.listing_id
      ),
      signals AS (
        -- Join all signal tables; compute each ranking component as a named column.
        -- All expressions are null-safe (COALESCE guards).
        SELECT
          m.listing_id,
          m._semantic_score,
          m._keyword_score,
          m._retrieval_source,
          l.type, l.slug, l.title, l.short_description, l.cover_url,
          l.location_text, l.price_text, l.price_amount, l.is_featured, l.is_verified,
          l.province_id, l.district_id, l.category_id, l.updated_at,

          -- Quality boost (0–0.30)
          COALESCE(LEAST(0.30, qs.quality_score::double precision * 0.30), 0.0)      AS _sig_quality,
          -- Content boost (0–0.15)
          COALESCE(LEAST(0.15, qs.content_score::double precision * 0.15), 0.0)      AS _sig_content,
          -- Raw trust score (0–100) for downstream reranker and trust_boost calc
          COALESCE(mts.trust_score, 0)::double precision                             AS _sig_trust_raw,
          COALESCE(mts.identity_verified, false)                                     AS _sig_identity,
          -- Freshness (0–0.05)
          GREATEST(0.0, 0.05 * (
            1.0 - LEAST(EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0, 1.0)
          ))::double precision                                                        AS _sig_freshness,
          -- CTR signal (0–0.40, gate: impressions_7d ≥ 50)
          CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
            THEN LEAST(0.40, GREATEST(0.0,
                   COALESCE(cs.ctr_7d::double precision, 0.0) - 0.03) * 5.0)
            ELSE 0.0
          END                                                                         AS _sig_ctr,
          -- Save signal (0–0.15)
          COALESCE(LEAST(0.15, qs.save_rate::double precision * 1.0), 0.0)           AS _sig_save,
          -- Inquiry signal (0–0.20)
          COALESCE(LEAST(0.20, qs.inquiry_rate::double precision * 4.0), 0.0)        AS _sig_inquiry,
          -- Geo relevance (0–0.45)
          (
            CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id THEN 0.20 ELSE 0.0 END
            + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id THEN 0.15 ELSE 0.0 END
            + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id THEN 0.10 ELSE 0.0 END
          )::double precision                                                         AS _sig_geo,
          -- Featured (0 or 0.30)
          CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END::double precision           AS _sig_featured,
          -- Verified (0 or 0.10)
          CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END::double precision           AS _sig_verified,
          -- Cold-start: two-phase decay, CTR-aware (0–0.25)
          CASE
            WHEN COALESCE(cs.impressions_7d, 0) < 50 THEN
              GREATEST(0.0,
                CASE
                  WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 259200.0 THEN
                    0.25 * (1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 259200.0)
                  WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0 THEN
                    0.15 * (1.0 - (
                      EXTRACT(epoch FROM (now() - l.updated_at)) - 259200.0
                    ) / 345600.0)
                  ELSE 0.0
                END
              ) * CASE WHEN COALESCE(cs.ctr_7d, 0) > 0.05 THEN 0.5 ELSE 1.0 END
            ELSE 0.0
          END::double precision                                                       AS _sig_cold_start,
          -- Velocity boost (0–0.30)
          COALESCE(
            CASE WHEN ls.trending_score > 1.0
              THEN LEAST(0.30, (ls.trending_score::double precision - 1.0) * 0.20)
              ELSE 0.0 END,
            0.0
          )                                                                           AS _sig_velocity,
          -- Personalisation (0–0.10)
          (
            COALESCE(LEAST(0.04, ua_prov.score::double precision * 0.04), 0.0)
            + COALESCE(LEAST(0.03, ua_dist.score::double precision * 0.03), 0.0)
            + COALESCE(LEAST(0.03, ua_cat.score::double precision  * 0.03), 0.0)
          )                                                                           AS _sig_personalisation,
          -- Spam penalty (raw 0–1 from listing_quality_scores)
          COALESCE(qs.spam_penalty, 0.0)::double precision                           AS _sig_spam,
          -- Authenticity signals (from listing_authenticity, not in quality_scores)
          COALESCE(la.is_duplicate, false)                                           AS _sig_is_duplicate,
          COALESCE(la.duplicate_score, 0.0)::double precision                        AS _sig_duplicate_score

        FROM merged m
        JOIN public.listings l ON l.id = m.listing_id
        LEFT JOIN public.listing_ctr_stats      cs      ON cs.listing_id   = l.id
        LEFT JOIN public.listing_quality_scores qs      ON qs.listing_id   = l.id
        LEFT JOIN public.listing_scores         ls      ON ls.listing_id   = l.id
        LEFT JOIN public.merchant_trust_scores  mts     ON mts.profile_id  = l.owner_id
        LEFT JOIN public.listing_authenticity   la      ON la.listing_id   = l.id
        LEFT JOIN public.user_affinities        ua_prov
              ON  ua_prov.profile_id    = p_profile_id
              AND ua_prov.affinity_type = 'province'
              AND ua_prov.affinity_key  = l.province_id::text
        LEFT JOIN public.user_affinities        ua_dist
              ON  ua_dist.profile_id    = p_profile_id
              AND ua_dist.affinity_type = 'district'
              AND ua_dist.affinity_key  = l.district_id::text
        LEFT JOIN public.user_affinities        ua_cat
              ON  ua_cat.profile_id     = p_profile_id
              AND ua_cat.affinity_type  = 'category'
              AND ua_cat.affinity_key   = l.category_id::text
        WHERE l.is_public = true AND l.moderation_status = 'approved' AND l.status = 'published'
          AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
          AND COALESCE(qs.spam_penalty, 0) < 0.80
          AND (p_type        IS NULL OR l.type::text   = p_type)
          AND (p_province_id IS NULL OR l.province_id  = p_province_id)
          AND (p_district_id IS NULL OR l.district_id  = p_district_id)
          AND (p_category_id IS NULL OR l.category_id  = p_category_id)
          AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
          AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
      ),
      ranked AS (
        -- Compute derived columns that depend on other signal columns.
        -- Separating into a CTE avoids repeating the CASE expressions in both
        -- combined_score and ranking_breakdown.
        SELECT
          s.*,
          -- Trust boost computed from raw trust_score + identity flag
          (
            CASE WHEN s._sig_trust_raw >= 80.0
              THEN 0.05 * LEAST(1.0, (s._sig_trust_raw - 80.0) / 20.0)
              ELSE 0.0 END
            + CASE WHEN s._sig_identity THEN 0.03 ELSE 0.0 END
          )::double precision AS _sig_trust_boost,
          -- Combined score: preliminary rank for output ordering
          (
            s._semantic_score  * 0.70
            + s._keyword_score
            + s._sig_quality
            + s._sig_content
            + CASE WHEN s._sig_trust_raw >= 80.0
                THEN 0.05 * LEAST(1.0, (s._sig_trust_raw - 80.0) / 20.0)
                ELSE 0.0 END
            + CASE WHEN s._sig_identity THEN 0.03 ELSE 0.0 END
            + s._sig_freshness
            + s._sig_ctr
            + s._sig_save
            + s._sig_inquiry
            + s._sig_geo
            + s._sig_featured
            + s._sig_verified
            + s._sig_cold_start
            + s._sig_velocity
            + s._sig_personalisation
            - s._sig_spam * 0.40
          )::double precision AS _combined
        FROM signals s
      )
    SELECT
      r.listing_id,
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
      r.updated_at,
      r._retrieval_source                  AS retrieval_source,
      r._semantic_score                    AS semantic_score,
      r._keyword_score                     AS keyword_score,
      r._sig_quality                       AS quality_score,
      r._sig_content                       AS content_score,
      r._sig_trust_raw                     AS trust_score,
      r._sig_freshness                     AS freshness_score,
      r._sig_ctr                           AS ctr_signal,
      r._sig_save                          AS save_signal,
      r._sig_inquiry                       AS inquiry_signal,
      r._sig_spam                          AS spam_penalty,
      r._combined                          AS combined_score,
      jsonb_build_object(
        'retrieval_source',  r._retrieval_source,
        'semantic',          round(r._semantic_score::numeric,         6),
        'keyword',           round(r._keyword_score::numeric,          6),
        'quality',           round(r._sig_quality::numeric,            6),
        'content',           round(r._sig_content::numeric,            6),
        'trust',             round(r._sig_trust_boost::numeric,        6),
        'freshness',         round(r._sig_freshness::numeric,          6),
        'ctr',               round(r._sig_ctr::numeric,                6),
        'save',              round(r._sig_save::numeric,               6),
        'inquiry',           round(r._sig_inquiry::numeric,            6),
        'geo',               round(r._sig_geo::numeric,                6),
        'featured',          round(r._sig_featured::numeric,           6),
        'verified',          round(r._sig_verified::numeric,           6),
        'cold_start',        round(r._sig_cold_start::numeric,         6),
        'velocity',          round(r._sig_velocity::numeric,           6),
        'personalisation',   round(r._sig_personalisation::numeric,    6),
        'spam_penalty',      round(r._sig_spam::numeric,               6),
        'is_duplicate',      r._sig_is_duplicate,
        'duplicate_score',   round(r._sig_duplicate_score::numeric,    6),
        'combined',          round(r._combined::numeric,               6)
      )                                    AS ranking_breakdown
    FROM ranked r
    ORDER BY r._combined DESC, r.updated_at DESC, r.listing_id DESC
    LIMIT p_limit;

    RETURN;
  END IF;

  -- ── Path B: keyword-only (no embedding) ──────────────────────────────────

  RETURN QUERY
  WITH
    keyword_cands AS (
      SELECT
        l.id AS listing_id,
        (
          CASE WHEN l.title_normalized = q_norm THEN 2.0 ELSE 0.0 END::double precision
          + CASE WHEN tsq IS NOT NULL
              THEN ts_rank(l.search_vector, tsq, 1)::double precision * 2.0
              ELSE 0.0
            END
          + GREATEST(0.0, similarity(l.title_normalized, q_norm)::double precision * 0.8)
          + GREATEST(0.0,
              COALESCE(similarity(l.short_description_normalized, q_norm), 0.0)::double precision * 0.2)
        ) AS kw_score
      FROM public.listings l
      WHERE l.is_public = true AND l.moderation_status = 'approved' AND l.status = 'published'
        AND (
          (tsq IS NOT NULL AND l.search_vector @@ tsq)
          OR (length(q_norm) >= 3 AND l.title_normalized LIKE (q_norm || '%'))
          OR l.title_normalized % q_norm
        )
        AND (p_type        IS NULL OR l.type::text   = p_type)
        AND (p_province_id IS NULL OR l.province_id  = p_province_id)
        AND (p_district_id IS NULL OR l.district_id  = p_district_id)
        AND (p_category_id IS NULL OR l.category_id  = p_category_id)
      LIMIT p_limit * 10
    ),
    signals AS (
      SELECT
        k.listing_id,
        0.0::double precision                      AS _semantic_score,
        k.kw_score                                 AS _keyword_score,
        'keyword'::text                            AS _retrieval_source,
        l.type, l.slug, l.title, l.short_description, l.cover_url,
        l.location_text, l.price_text, l.price_amount, l.is_featured, l.is_verified,
        l.province_id, l.district_id, l.category_id, l.updated_at,

        COALESCE(LEAST(0.30, qs.quality_score::double precision * 0.30), 0.0)      AS _sig_quality,
        COALESCE(LEAST(0.15, qs.content_score::double precision * 0.15), 0.0)      AS _sig_content,
        COALESCE(mts.trust_score, 0)::double precision                             AS _sig_trust_raw,
        COALESCE(mts.identity_verified, false)                                     AS _sig_identity,
        GREATEST(0.0, 0.05 * (
          1.0 - LEAST(EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0, 1.0)
        ))::double precision                                                        AS _sig_freshness,
        CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
          THEN LEAST(0.40, GREATEST(0.0,
                 COALESCE(cs.ctr_7d::double precision, 0.0) - 0.03) * 5.0)
          ELSE 0.0
        END                                                                         AS _sig_ctr,
        COALESCE(LEAST(0.15, qs.save_rate::double precision * 1.0), 0.0)           AS _sig_save,
        COALESCE(LEAST(0.20, qs.inquiry_rate::double precision * 4.0), 0.0)        AS _sig_inquiry,
        (
          CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id THEN 0.20 ELSE 0.0 END
          + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id THEN 0.15 ELSE 0.0 END
          + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id THEN 0.10 ELSE 0.0 END
        )::double precision                                                         AS _sig_geo,
        CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END::double precision           AS _sig_featured,
        CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END::double precision           AS _sig_verified,
        CASE
          WHEN COALESCE(cs.impressions_7d, 0) < 50 THEN
            GREATEST(0.0,
              CASE
                WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 259200.0 THEN
                  0.25 * (1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 259200.0)
                WHEN EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0 THEN
                  0.15 * (1.0 - (
                    EXTRACT(epoch FROM (now() - l.updated_at)) - 259200.0
                  ) / 345600.0)
                ELSE 0.0
              END
            ) * CASE WHEN COALESCE(cs.ctr_7d, 0) > 0.05 THEN 0.5 ELSE 1.0 END
          ELSE 0.0
        END::double precision                                                       AS _sig_cold_start,
        COALESCE(
          CASE WHEN ls.trending_score > 1.0
            THEN LEAST(0.30, (ls.trending_score::double precision - 1.0) * 0.20)
            ELSE 0.0 END,
          0.0
        )                                                                           AS _sig_velocity,
        (
          COALESCE(LEAST(0.04, ua_prov.score::double precision * 0.04), 0.0)
          + COALESCE(LEAST(0.03, ua_dist.score::double precision * 0.03), 0.0)
          + COALESCE(LEAST(0.03, ua_cat.score::double precision  * 0.03), 0.0)
        )                                                                           AS _sig_personalisation,
        COALESCE(qs.spam_penalty, 0.0)::double precision                           AS _sig_spam,
        COALESCE(la.is_duplicate, false)                                           AS _sig_is_duplicate,
        COALESCE(la.duplicate_score, 0.0)::double precision                        AS _sig_duplicate_score

      FROM keyword_cands k
      JOIN public.listings l ON l.id = k.listing_id
      LEFT JOIN public.listing_ctr_stats      cs      ON cs.listing_id   = l.id
      LEFT JOIN public.listing_quality_scores qs      ON qs.listing_id   = l.id
      LEFT JOIN public.listing_scores         ls      ON ls.listing_id   = l.id
      LEFT JOIN public.merchant_trust_scores  mts     ON mts.profile_id  = l.owner_id
      LEFT JOIN public.listing_authenticity   la      ON la.listing_id   = l.id
      LEFT JOIN public.user_affinities        ua_prov
            ON  ua_prov.profile_id    = p_profile_id
            AND ua_prov.affinity_type = 'province'
            AND ua_prov.affinity_key  = l.province_id::text
      LEFT JOIN public.user_affinities        ua_dist
            ON  ua_dist.profile_id    = p_profile_id
            AND ua_dist.affinity_type = 'district'
            AND ua_dist.affinity_key  = l.district_id::text
      LEFT JOIN public.user_affinities        ua_cat
            ON  ua_cat.profile_id     = p_profile_id
            AND ua_cat.affinity_type  = 'category'
            AND ua_cat.affinity_key   = l.category_id::text
      WHERE l.is_public = true AND l.moderation_status = 'approved' AND l.status = 'published'
        AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
        AND COALESCE(qs.spam_penalty, 0) < 0.80
        AND (p_type        IS NULL OR l.type::text   = p_type)
        AND (p_province_id IS NULL OR l.province_id  = p_province_id)
        AND (p_district_id IS NULL OR l.district_id  = p_district_id)
        AND (p_category_id IS NULL OR l.category_id  = p_category_id)
        AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
        AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
    ),
    ranked AS (
      SELECT
        s.*,
        (
          CASE WHEN s._sig_trust_raw >= 80.0
            THEN 0.05 * LEAST(1.0, (s._sig_trust_raw - 80.0) / 20.0)
            ELSE 0.0 END
          + CASE WHEN s._sig_identity THEN 0.03 ELSE 0.0 END
        )::double precision AS _sig_trust_boost,
        (
          s._keyword_score
          + s._sig_quality
          + s._sig_content
          + CASE WHEN s._sig_trust_raw >= 80.0
              THEN 0.05 * LEAST(1.0, (s._sig_trust_raw - 80.0) / 20.0)
              ELSE 0.0 END
          + CASE WHEN s._sig_identity THEN 0.03 ELSE 0.0 END
          + s._sig_freshness
          + s._sig_ctr
          + s._sig_save
          + s._sig_inquiry
          + s._sig_geo
          + s._sig_featured
          + s._sig_verified
          + s._sig_cold_start
          + s._sig_velocity
          + s._sig_personalisation
          - s._sig_spam * 0.40
        )::double precision AS _combined
      FROM signals s
    )
  SELECT
    r.listing_id,
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
    r.updated_at,
    r._retrieval_source                  AS retrieval_source,
    r._semantic_score                    AS semantic_score,
    r._keyword_score                     AS keyword_score,
    r._sig_quality                       AS quality_score,
    r._sig_content                       AS content_score,
    r._sig_trust_raw                     AS trust_score,
    r._sig_freshness                     AS freshness_score,
    r._sig_ctr                           AS ctr_signal,
    r._sig_save                          AS save_signal,
    r._sig_inquiry                       AS inquiry_signal,
    r._sig_spam                          AS spam_penalty,
    r._combined                          AS combined_score,
    jsonb_build_object(
      'retrieval_source',  r._retrieval_source,
      'semantic',          0.0,
      'keyword',           round(r._keyword_score::numeric,          6),
      'quality',           round(r._sig_quality::numeric,            6),
      'content',           round(r._sig_content::numeric,            6),
      'trust',             round(r._sig_trust_boost::numeric,        6),
      'freshness',         round(r._sig_freshness::numeric,          6),
      'ctr',               round(r._sig_ctr::numeric,                6),
      'save',              round(r._sig_save::numeric,               6),
      'inquiry',           round(r._sig_inquiry::numeric,            6),
      'geo',               round(r._sig_geo::numeric,                6),
      'featured',          round(r._sig_featured::numeric,           6),
      'verified',          round(r._sig_verified::numeric,           6),
      'cold_start',        round(r._sig_cold_start::numeric,         6),
      'velocity',          round(r._sig_velocity::numeric,           6),
      'personalisation',   round(r._sig_personalisation::numeric,    6),
      'spam_penalty',      round(r._sig_spam::numeric,               6),
      'is_duplicate',      r._sig_is_duplicate,
      'duplicate_score',   round(r._sig_duplicate_score::numeric,    6),
      'combined',          round(r._combined::numeric,               6)
    )                                    AS ranking_breakdown
  FROM ranked r
  ORDER BY r._combined DESC, r.updated_at DESC, r.listing_id DESC
  LIMIT p_limit;

END;
$$;

GRANT EXECUTE ON FUNCTION public.search_listings_candidates TO anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- §4.  Grants and operational notes
-- ══════════════════════════════════════════════════════════════════════════════

-- ── TypeScript regeneration ───────────────────────────────────────────────
-- After applying this migration to local Supabase, regenerate types:
--   npx supabase gen types typescript --local > lib/supabase/types.ts
--
-- New RPC signatures to add to features/search/api/search.server.ts:
--   supabase.rpc('get_browse_feed', { p_province_id, p_category_id, ... })
--   supabase.rpc('search_listings_candidates', { q, query_embedding, ... })
--
-- The ranking_breakdown column is jsonb; the Supabase client will deserialise
-- it as a plain object.  TypeScript type for ranking_breakdown:
--
--   interface RankingBreakdown {
--     retrieval_source: 'semantic' | 'keyword' | 'both'
--     semantic:         number
--     keyword:          number
--     quality:          number
--     content:          number
--     trust:            number
--     freshness:        number
--     ctr:              number
--     save:             number
--     inquiry:          number
--     geo:              number
--     featured:         number
--     verified:         number
--     cold_start:       number
--     velocity:         number
--     personalisation:  number
--     spam_penalty:     number
--     is_duplicate:     boolean
--     duplicate_score:  number
--     combined:         number
--   }

-- ── Caching strategy summary ──────────────────────────────────────────────
-- search_listings_hybrid (keyword, p_limit=20):
--   Cache at edge (Vercel/Cloudflare).  TTL: 60 s.
--   Cache key: sha256(q_norm + filters + cursor_triple + profile_id).
--   Invalidation: on listing INSERT/UPDATE for the matching province/category.
--
-- get_browse_feed (p_limit=20):
--   Cache at edge.  TTL: 120 s (diversity factor stable for ~1 hour).
--   Cache key: sha256(province_id + district_id + category_id + type +
--                     price_range + cursor_triple + profile_id).
--   Profile-specific pages (p_profile_id IS NOT NULL): TTL 30 s.
--
-- search_listings_candidates (K=100, AI reranking pipeline):
--   Cache at server (Redis).  TTL: 30 s.
--   Cache key: sha256(q_norm + embedding_fingerprint + filters + profile_id).
--   embedding_fingerprint: hex of first 8 float bytes (sufficient uniqueness).
--   Do NOT cache at edge — response size is large (100 rows × ranking_breakdown).
--
-- search_listings_semantic (p_limit=20):
--   Cache at server.  TTL: 60 s.
--   Embedding cache: store query embedding per q_norm in Redis with TTL 5 min.
--   Key: 'emb:' + sha256(q_norm).  Avoids re-encoding identical queries.

-- ── Planner validation queries (run EXPLAIN ANALYZE in staging) ────────────
-- Browse feed, province + category:
--   EXPLAIN (ANALYZE, BUFFERS)
--   SELECT * FROM get_browse_feed(p_province_id := 1, p_category_id := 5,
--                                  p_limit := 20);
--   Expected: Index Scan on listings_province_category_updated_idx
--
-- Keyword search, trgm gate:
--   EXPLAIN (ANALYZE, BUFFERS)
--   SELECT * FROM search_listings_hybrid('đất nền', p_limit := 20);
--   Expected: Bitmap Index Scan on listings_title_normalized_trgm_idx
--
-- Candidates, semantic hybrid:
--   EXPLAIN (ANALYZE, BUFFERS)
--   SELECT * FROM search_listings_candidates(
--     'đất nông nghiệp', '[0.1,0.2,...]'::vector(384),
--     p_province_id := 50, p_limit := 100);
--   Expected: Index Scan on listing_embeddings_hnsw_idx, then Hash Join

-- ══════════════════════════════════════════════════════════════════════════════
-- END 024_search_engine_refactor.sql
-- ══════════════════════════════════════════════════════════════════════════════
