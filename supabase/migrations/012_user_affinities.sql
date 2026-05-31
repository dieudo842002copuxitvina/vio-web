-- ── 012_user_affinities.sql ──────────────────────────────────────────────────
-- Week 2.5: Personalized Discovery Infra.
--
-- Adds light personalisation to search ranking using historical engagement
-- signals. Everything is PostgreSQL-native: no ML pipelines, no vector stores,
-- no external services.
--
-- What this migration adds:
--   Tables:
--     • user_affinities           — per-user affinity scores by dimension
--
--   Functions:
--     • refresh_user_affinities() — aggregate events → affinity scores
--     • search_listings_hybrid()  — REPLACED: adds p_profile_id param +
--                                   personalisation boost (max +0.10)
--
--   pg_cron job:
--     • refresh-user-affinities   — every 30 min
--
-- Personalisation budget (hard-capped, preserves text + behavioral dominance):
--   Province affinity  max +0.04
--   District affinity  max +0.03
--   Category affinity  max +0.03
--   ─────────────────────────────
--   Total max          +0.10  personalisation  (text max ~6.0, behavioral max +1.25)
--
-- For anon sessions: use getSessionAffinities() in TypeScript (reads listing_events
-- for the session on the fly). Search boost only activates when p_profile_id is set.
--
-- Affinity types: 'province', 'district', 'category', 'keyword'
-- Event weights:  impression+0.2, click+1, save+4, phone_reveal+5, inquiry+8
-- Decay half-life: 30 days (exponential)
-- Score range:    [0, 1] — log-normalised, ceiling = 20 decayed weight units
--
-- Depends on: migrations 001–011
-- Safe to re-run: DROP IF EXISTS / CREATE IF NOT EXISTS / OR REPLACE throughout.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  user_affinities
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Design decisions:
--   • PK is (profile_id, affinity_type, affinity_key) — three-way composite.
--     affinity_key is text to accommodate heterogeneous types without UNION tables.
--     For province/district/category the key is the integer id cast to text.
--     For keyword the key is the normalised search term.
--   • No FK to profiles — avoids cascade churn when users deactivate.
--   • score is stored already decayed at refresh time (no runtime decay needed
--     in the search function, keeping the JOIN path simple).
--   • last_event_at tracks recency for analytics; decay is baked into score.

CREATE TABLE IF NOT EXISTS public.user_affinities (
  profile_id    uuid          NOT NULL,
  affinity_type text          NOT NULL,
  affinity_key  text          NOT NULL,
  score         numeric(10,4) NOT NULL DEFAULT 0,
  last_event_at timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, affinity_type, affinity_key),
  CONSTRAINT user_affinities_type_check
    CHECK (affinity_type IN ('province', 'district', 'category', 'keyword'))
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  Indexes
-- ══════════════════════════════════════════════════════════════════════════════

-- Used by getUserAffinities() to fetch all affinities for a profile, sorted
-- by strength (highest first, then by type for stable ordering).
CREATE INDEX IF NOT EXISTS user_affinities_profile_type_score_idx
  ON public.user_affinities (profile_id, affinity_type, score DESC);

-- Used by the search function LEFT JOINs:
--   ua_prov: profile_id = ? AND affinity_type = 'province' AND affinity_key = ?
--   ua_dist: profile_id = ? AND affinity_type = 'district' AND affinity_key = ?
--   ua_cat:  profile_id = ? AND affinity_type = 'category' AND affinity_key = ?
-- These are all covered by the PRIMARY KEY index.

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  refresh_user_affinities()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Reads listing_events (no public SELECT → SECURITY DEFINER required).
-- Joins to listings to resolve the affinity context (province, district, category).
-- Applies per-event exponential decay: weight × exp(−age_seconds / 2592000).
--   decay constant = 30 days × 86 400 s/day = 2 592 000 s
--   half-life ≈ 20.8 days: an engagement from 30 days ago contributes ~37 %.
-- Score normalisation: LEAST(1.0, LN(1 + decayed_sum) / LN(21))
--   ─ at decayed_sum =  0 → score ≈ 0.00
--   ─ at decayed_sum =  1 → score ≈ 0.23
--   ─ at decayed_sum =  5 → score ≈ 0.59
--   ─ at decayed_sum = 10 → score ≈ 0.79
--   ─ at decayed_sum = 20 → score = 1.00 (ceiling)
-- Window: last 90 days (older events are too decayed to matter).
-- Keyword affinities: derived from search_logs (top queries by profile, if
--   search_logs is extended to track profile_id). Currently skipped.

CREATE OR REPLACE FUNCTION public.refresh_user_affinities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  decay_constant  constant numeric := 2592000.0;  -- 30 days in seconds
  score_ceiling   constant numeric := 20.0;        -- decayed weight at score = 1.0
BEGIN
  WITH events_decayed AS (
    -- Assign time-decayed weight to every qualifying event
    SELECT
      e.profile_id,
      e.listing_id,
      e.created_at,
      CASE e.event_type
        WHEN 'impression'   THEN 0.2
        WHEN 'click'        THEN 1.0
        WHEN 'save'         THEN 4.0
        WHEN 'phone_reveal' THEN 5.0
        WHEN 'inquiry'      THEN 8.0
        ELSE 0.0
      END
      * EXP(
          -EXTRACT(epoch FROM (now() - e.created_at))::numeric
          / decay_constant
        )                                               AS decayed_weight
    FROM public.listing_events e
    WHERE e.profile_id IS NOT NULL
      AND e.created_at >= now() - interval '90 days'
  ),

  -- Join to listings to get geo / category context per event
  events_with_context AS (
    SELECT
      ed.profile_id,
      ed.decayed_weight,
      ed.created_at,
      l.province_id,
      l.district_id,
      l.category_id
    FROM events_decayed ed
    JOIN public.listings l ON l.id = ed.listing_id
  ),

  -- Aggregate province affinities
  province_aff AS (
    SELECT
      profile_id,
      'province'::text        AS affinity_type,
      province_id::text       AS affinity_key,
      SUM(decayed_weight)     AS raw_score,
      MAX(created_at)         AS last_event_at
    FROM events_with_context
    WHERE province_id IS NOT NULL
    GROUP BY profile_id, province_id
  ),

  -- Aggregate district affinities
  district_aff AS (
    SELECT
      profile_id,
      'district'::text        AS affinity_type,
      district_id::text       AS affinity_key,
      SUM(decayed_weight)     AS raw_score,
      MAX(created_at)         AS last_event_at
    FROM events_with_context
    WHERE district_id IS NOT NULL
    GROUP BY profile_id, district_id
  ),

  -- Aggregate category affinities
  category_aff AS (
    SELECT
      profile_id,
      'category'::text        AS affinity_type,
      category_id::text       AS affinity_key,
      SUM(decayed_weight)     AS raw_score,
      MAX(created_at)         AS last_event_at
    FROM events_with_context
    WHERE category_id IS NOT NULL
    GROUP BY profile_id, category_id
  ),

  all_affinities AS (
    SELECT * FROM province_aff
    UNION ALL
    SELECT * FROM district_aff
    UNION ALL
    SELECT * FROM category_aff
  )

  INSERT INTO public.user_affinities (
    profile_id,
    affinity_type,
    affinity_key,
    score,
    last_event_at,
    updated_at
  )
  SELECT
    profile_id,
    affinity_type,
    affinity_key,

    -- Log-normalised score in [0, 1]
    LEAST(1.0,
      LN(1.0 + raw_score)
      / LN(1.0 + score_ceiling)
    )::numeric(10,4)          AS score,

    last_event_at,
    now()

  FROM all_affinities

  ON CONFLICT (profile_id, affinity_type, affinity_key) DO UPDATE SET
    score         = EXCLUDED.score,
    last_event_at = EXCLUDED.last_event_at,
    updated_at    = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  search_listings_hybrid() — REPLACED with personalisation boost
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Adds one new parameter:
--   p_profile_id uuid DEFAULT NULL
--
-- When p_profile_id is set, three LEFT JOINs to user_affinities are added to
-- both the browse and scored CTEs.  Each join is a single PK lookup:
--   (profile_id, affinity_type='province', affinity_key=province_id::text)
--   (profile_id, affinity_type='district', affinity_key=district_id::text)
--   (profile_id, affinity_type='category', affinity_key=category_id::text)
--
-- When p_profile_id IS NULL, join conditions evaluate to (profile_id = NULL)
-- which is always false — PostgreSQL skips the join entirely.  Zero-cost for
-- anon users.
--
-- Personalisation boost (max +0.10 total):
--   Province match:  LEAST(0.04, ua_prov.score * 0.04)  — max +0.04
--   District match:  LEAST(0.03, ua_dist.score * 0.03)  — max +0.03
--   Category match:  LEAST(0.03, ua_cat.score  * 0.03)  — max +0.03
-- A score of 1.0 yields the maximum boost; sub-1 scales linearly.

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
  p_cursor_id          uuid        DEFAULT NULL,
  p_profile_id         uuid        DEFAULT NULL
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
          + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
              THEN LEAST(0.40, GREATEST(0.0,
                     COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
              ELSE 0.0
            END

          -- ── Quality boost (max +0.30) ──────────────────────────────────────
          + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

          -- ── Velocity boost: trending burst ratio (max +0.30) ──────────────
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

          -- ── Personalisation boost (max +0.10 total) ───────────────────────
          -- Active only when p_profile_id is set; zero-cost when NULL.
          + COALESCE(LEAST(0.04, ua_prov.score::numeric * 0.04), 0.0)
          + COALESCE(LEAST(0.03, ua_dist.score::numeric * 0.03), 0.0)
          + COALESCE(LEAST(0.03, ua_cat.score::numeric  * 0.03), 0.0)
        )::float4 AS _rank

      FROM listings l
      LEFT JOIN public.listing_ctr_stats       cs      ON cs.listing_id      = l.id
      LEFT JOIN public.listing_quality_scores  qs      ON qs.listing_id      = l.id
      LEFT JOIN public.listing_scores          ls      ON ls.listing_id      = l.id
      LEFT JOIN public.user_affinities         ua_prov
            ON  ua_prov.profile_id    = p_profile_id
            AND ua_prov.affinity_type = 'province'
            AND ua_prov.affinity_key  = l.province_id::text
      LEFT JOIN public.user_affinities         ua_dist
            ON  ua_dist.profile_id    = p_profile_id
            AND ua_dist.affinity_type = 'district'
            AND ua_dist.affinity_key  = l.district_id::text
      LEFT JOIN public.user_affinities         ua_cat
            ON  ua_cat.profile_id     = p_profile_id
            AND ua_cat.affinity_type  = 'category'
            AND ua_cat.affinity_key   = l.category_id::text

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
        CASE
          WHEN l.title_normalized = q_norm                         THEN 2.0
          WHEN length(q_norm) >= 3
               AND l.title_normalized LIKE (q_norm || '%')         THEN 1.0
          ELSE 0.0
        END
        + CASE WHEN tsq IS NOT NULL
            THEN ts_rank(l.search_vector, tsq, 1) * 2.0
            ELSE 0.0
          END
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

        -- ── Personalisation boost (max +0.10 total) ───────────────────────
        + COALESCE(LEAST(0.04, ua_prov.score::numeric * 0.04), 0.0)
        + COALESCE(LEAST(0.03, ua_dist.score::numeric * 0.03), 0.0)
        + COALESCE(LEAST(0.03, ua_cat.score::numeric  * 0.03), 0.0)
      )::float4 AS _rank

    FROM listings l
    LEFT JOIN public.listing_ctr_stats       cs      ON cs.listing_id      = l.id
    LEFT JOIN public.listing_quality_scores  qs      ON qs.listing_id      = l.id
    LEFT JOIN public.listing_scores          ls      ON ls.listing_id      = l.id
    LEFT JOIN public.user_affinities         ua_prov
          ON  ua_prov.profile_id    = p_profile_id
          AND ua_prov.affinity_type = 'province'
          AND ua_prov.affinity_key  = l.province_id::text
    LEFT JOIN public.user_affinities         ua_dist
          ON  ua_dist.profile_id    = p_profile_id
          AND ua_dist.affinity_type = 'district'
          AND ua_dist.affinity_key  = l.district_id::text
    LEFT JOIN public.user_affinities         ua_cat
          ON  ua_cat.profile_id     = p_profile_id
          AND ua_cat.affinity_type  = 'category'
          AND ua_cat.affinity_key   = l.category_id::text

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
-- 5.  pg_cron job
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Every 30 minutes, staggered 14 min after the signals pipeline to ensure
-- listing_events has been freshly aggregated before we derive affinities.
-- Cron expression: 14-59/30 = runs at :14 and :44 of every hour.

DO $$
BEGIN
  PERFORM cron.schedule(
    'refresh-user-affinities',
    '14-59/30 * * * *',
    $$SELECT public.refresh_user_affinities()$$
  );
EXCEPTION WHEN undefined_function OR undefined_schema THEN
  RAISE WARNING
    '[012] pg_cron not enabled — user affinities will not auto-refresh. '
    'Enable pg_cron, then run cron.schedule() manually.';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  RLS
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Users can only read their own affinities (no cross-user leakage).
-- The search function (SECURITY DEFINER) bypasses RLS when joining affinities.

ALTER TABLE public.user_affinities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_affinities_owner_select"
  ON public.user_affinities FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  Grants
-- ══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON public.user_affinities TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_user_affinities TO postgres;
