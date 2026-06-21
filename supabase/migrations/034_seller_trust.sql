-- 034_seller_trust.sql
-- Phase 17: Seller Trust Score
--
-- Introduces a dedicated seller_trust_scores table with a persisted,
-- multi-factor trust score (0–100) distinct from the existing merchant_metrics.trust_score
-- (which is a simple engagement proxy).
--
-- Score factors (total: 100 pts):
--   verification_score  0–30   is_verified=30, id_uploaded=20, phone_confirmed=15
--   response_score      0–25   response_rate * 0.25, capped at 25
--   quality_score       0–20   avg completeness tier of active listings
--   completion_score    0–15   completed_sales / max(active_listings,1) * 15, capped 15
--   tenure_score        0–10   years on platform * 2, capped at 10
--
-- Tiers:
--   verified_pro  80–100
--   trusted       60–79
--   standard      35–59
--   new            0–34
--
-- compute_seller_trust_score(user_id) — call after:
--   • Profile verification change
--   • Listing published/archived
--   • Completeness refresh
--   • Response event logged

-- ─────────────────────────────────────────────────────────────────────────────
-- Table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seller_trust_scores (
  user_id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Composite score
  total_score           smallint    NOT NULL DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),

  -- Sub-scores
  verification_score    smallint    NOT NULL DEFAULT 0,   -- 0–30
  response_score        smallint    NOT NULL DEFAULT 0,   -- 0–25
  quality_score         smallint    NOT NULL DEFAULT 0,   -- 0–20
  completion_score      smallint    NOT NULL DEFAULT 0,   -- 0–15
  tenure_score          smallint    NOT NULL DEFAULT 0,   -- 0–10

  -- Tier (for badge display + search boost)
  tier                  text        NOT NULL DEFAULT 'new'
    CHECK (tier IN ('new', 'standard', 'trusted', 'verified_pro')),

  -- Derived stats (cached for dashboard display)
  active_listing_count  integer     NOT NULL DEFAULT 0,
  completed_sales       integer     NOT NULL DEFAULT 0,
  response_rate_pct     integer,                           -- 0–100
  avg_response_hours    integer,                           -- null if no responses yet
  avg_completeness_score integer,                          -- avg of listing completeness

  computed_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_trust_tier
  ON seller_trust_scores(tier, total_score DESC);

CREATE INDEX IF NOT EXISTS idx_seller_trust_score
  ON seller_trust_scores(total_score DESC);

ALTER TABLE seller_trust_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can read trust scores (shown to buyers on listing detail)
CREATE POLICY "sts_public_read"
  ON seller_trust_scores FOR SELECT USING (true);

-- Only service role (server functions) write
CREATE POLICY "sts_service_write"
  ON seller_trust_scores FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────────────────────
-- Function: compute_seller_trust_score
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_seller_trust_score(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Profile
  v_is_verified            boolean := false;
  v_member_since           timestamptz;
  v_years_tenure           numeric;

  -- Merchant metrics
  v_response_rate          numeric := 0;
  v_avg_response_hours     integer;

  -- Listings
  v_active_count           integer := 0;
  v_completed_sales        integer := 0;
  v_avg_completeness       integer := 0;

  -- Sub-scores
  v_verification_score     smallint := 0;
  v_response_score         smallint := 0;
  v_quality_score          smallint := 0;
  v_completion_score       smallint := 0;
  v_tenure_score           smallint := 0;
  v_total                  smallint := 0;
  v_tier                   text;
BEGIN
  -- ── Profile data ───────────────────────────────────────────────────────────
  SELECT is_verified, created_at
  INTO v_is_verified, v_member_since
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- ── Verification score (max 30) ────────────────────────────────────────────
  IF v_is_verified THEN
    v_verification_score := 30;
  ELSE
    v_verification_score := 0;
  END IF;

  -- ── Response score (max 25) ────────────────────────────────────────────────
  -- Source: merchant_metrics (pre-aggregated by cron)
  SELECT
    COALESCE(response_rate_7d, 0) * 100,
    avg_response_hours
  INTO v_response_rate, v_avg_response_hours
  FROM merchant_metrics
  WHERE profile_id = p_user_id
  LIMIT 1;

  v_response_score := LEAST(25, ROUND(v_response_rate * 0.25)::smallint);

  -- ── Quality score (max 20) ─────────────────────────────────────────────────
  -- Average completeness of active listings
  SELECT
    COUNT(*)::integer,
    COALESCE(AVG(lc.total_score), 0)::integer
  INTO v_active_count, v_avg_completeness
  FROM listings l
  LEFT JOIN listing_completeness lc ON lc.listing_id = l.id
  WHERE l.owner_id = p_user_id
    AND l.status   = 'published'
    AND l.is_public = true;

  v_quality_score := CASE
    WHEN v_avg_completeness >= 90 THEN 20
    WHEN v_avg_completeness >= 75 THEN 16
    WHEN v_avg_completeness >= 55 THEN 10
    WHEN v_avg_completeness >  0  THEN  5
    ELSE 0
  END;

  -- ── Completion score (max 15) ──────────────────────────────────────────────
  SELECT COUNT(*)::integer
  INTO v_completed_sales
  FROM listings
  WHERE owner_id = p_user_id
    AND status = 'archived'            -- archived = sold / completed
    AND is_public = false;

  v_completion_score := LEAST(15,
    CASE
      WHEN v_active_count > 0
        THEN ROUND((v_completed_sales::numeric / GREATEST(v_active_count, 1)) * 15)::smallint
      ELSE LEAST(15, v_completed_sales * 5)::smallint
    END
  );

  -- ── Tenure score (max 10) ──────────────────────────────────────────────────
  IF v_member_since IS NOT NULL THEN
    v_years_tenure := EXTRACT(EPOCH FROM (now() - v_member_since)) / (365.25 * 86400);
    v_tenure_score := LEAST(10, ROUND(v_years_tenure * 2)::smallint);
  END IF;

  -- ── Total + tier ───────────────────────────────────────────────────────────
  v_total := v_verification_score + v_response_score + v_quality_score
           + v_completion_score   + v_tenure_score;

  v_tier := CASE
    WHEN v_total >= 80 THEN 'verified_pro'
    WHEN v_total >= 60 THEN 'trusted'
    WHEN v_total >= 35 THEN 'standard'
    ELSE 'new'
  END;

  -- ── Upsert ─────────────────────────────────────────────────────────────────
  INSERT INTO seller_trust_scores (
    user_id, total_score,
    verification_score, response_score, quality_score,
    completion_score, tenure_score,
    tier,
    active_listing_count, completed_sales,
    response_rate_pct, avg_response_hours, avg_completeness_score,
    computed_at
  ) VALUES (
    p_user_id, v_total,
    v_verification_score, v_response_score, v_quality_score,
    v_completion_score, v_tenure_score,
    v_tier,
    v_active_count, v_completed_sales,
    ROUND(v_response_rate)::integer, v_avg_response_hours, v_avg_completeness,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_score          = EXCLUDED.total_score,
    verification_score   = EXCLUDED.verification_score,
    response_score       = EXCLUDED.response_score,
    quality_score        = EXCLUDED.quality_score,
    completion_score     = EXCLUDED.completion_score,
    tenure_score         = EXCLUDED.tenure_score,
    tier                 = EXCLUDED.tier,
    active_listing_count = EXCLUDED.active_listing_count,
    completed_sales      = EXCLUDED.completed_sales,
    response_rate_pct    = EXCLUDED.response_rate_pct,
    avg_response_hours   = EXCLUDED.avg_response_hours,
    avg_completeness_score = EXCLUDED.avg_completeness_score,
    computed_at          = now();
END;
$$;

COMMENT ON FUNCTION compute_seller_trust_score IS
  'Computes and persists a 0-100 trust score for a seller. '
  'Call after: profile verification change, listing publish/archive, '
  'completeness refresh, or merchant_metrics refresh.';
