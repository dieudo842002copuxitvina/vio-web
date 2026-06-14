-- Liquidity Metrics Engine: measure marketplace health, not page views.
-- Province Liquidity Score (0–100) = supply + demand + activity + conversion.

CREATE TABLE province_liquidity_scores (
  province_id      integer     PRIMARY KEY,
  province_slug    text        NOT NULL,
  province_name    text        NOT NULL,
  score            smallint    NOT NULL DEFAULT 0,    -- 0–100
  grade            text        NOT NULL DEFAULT 'D',  -- A/B/C/D
  -- Components (each 0–25)
  supply_score     smallint    NOT NULL DEFAULT 0,
  demand_score     smallint    NOT NULL DEFAULT 0,
  activity_score   smallint    NOT NULL DEFAULT 0,
  conversion_score smallint    NOT NULL DEFAULT 0,
  -- Raw inputs for transparency
  active_listings  integer     NOT NULL DEFAULT 0,
  active_sellers   integer     NOT NULL DEFAULT 0,
  leads_30d        integer     NOT NULL DEFAULT 0,
  saved_searches   integer     NOT NULL DEFAULT 0,
  visits_30d       integer     NOT NULL DEFAULT 0,
  total_leads      integer     NOT NULL DEFAULT 0,
  won_30d          integer     NOT NULL DEFAULT 0,
  computed_at      timestamptz NOT NULL DEFAULT now()
);

-- ── compute_province_liquidity_score ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_province_liquidity_score(p_province_id integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_active_listings integer;
  v_active_sellers  integer;
  v_leads_30d       integer;
  v_saved_searches  integer;
  v_visits_30d      integer;
  v_total_leads     integer;
  v_won_30d         integer;
  v_supply          smallint;
  v_demand          smallint;
  v_activity        smallint;
  v_conversion      smallint;
  v_total           smallint;
  v_grade           text;
  v_slug            text;
  v_name            text;
BEGIN
  SELECT slug, name INTO v_slug, v_name FROM provinces WHERE id = p_province_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Supply: active listings + seller diversity
  SELECT
    COUNT(*),
    COUNT(DISTINCT owner_id)
  INTO v_active_listings, v_active_sellers
  FROM listings
  WHERE province_id = p_province_id
    AND is_public
    AND moderation_status = 'approved';

  -- Demand: leads + saved searches this month
  SELECT COUNT(*) INTO v_leads_30d
  FROM crm_leads cl
  JOIN listings l ON l.id = cl.listing_id
  WHERE l.province_id = p_province_id
    AND cl.created_at > now() - interval '30 days';

  SELECT COUNT(*) INTO v_saved_searches
  FROM saved_searches
  WHERE (filters ->> 'province_id')::integer = p_province_id;

  -- Activity: visit requests 30d
  SELECT COUNT(*) INTO v_visits_30d
  FROM visit_requests vr
  JOIN listings l ON l.id = vr.listing_id
  WHERE l.province_id = p_province_id
    AND vr.created_at > now() - interval '30 days';

  -- Conversion: won leads ratio
  SELECT COUNT(*) INTO v_total_leads
  FROM crm_leads cl
  JOIN listings l ON l.id = cl.listing_id
  WHERE l.province_id = p_province_id;

  SELECT COUNT(*) INTO v_won_30d
  FROM crm_leads cl
  JOIN listings l ON l.id = cl.listing_id
  WHERE l.province_id = p_province_id
    AND cl.stage = 'won'
    AND cl.updated_at > now() - interval '30 days';

  -- ── Score components ─────────────────────────────────────────────────────

  -- Supply (0–25): listings (up to 50 = 20pts) + seller diversity (up to 5pts)
  v_supply := LEAST(20, v_active_listings / 2)::smallint
            + LEAST(5,  v_active_sellers)::smallint;

  -- Demand (0–25): leads (up to 20pts) + saved searches (up to 5pts)
  v_demand := LEAST(20, v_leads_30d)::smallint
            + LEAST(5,  v_saved_searches / 2)::smallint;

  -- Activity (0–25): visit requests velocity
  v_activity := LEAST(25, v_visits_30d * 2)::smallint;

  -- Conversion (0–25): won / total ratio (%)
  v_conversion := CASE
    WHEN v_total_leads > 0
      THEN LEAST(25, (v_won_30d * 100 / v_total_leads))::smallint
    ELSE 0
  END;

  v_total := v_supply + v_demand + v_activity + v_conversion;
  v_grade := CASE
    WHEN v_total >= 80 THEN 'A'
    WHEN v_total >= 60 THEN 'B'
    WHEN v_total >= 40 THEN 'C'
    ELSE 'D'
  END;

  INSERT INTO province_liquidity_scores
    (province_id, province_slug, province_name, score, grade,
     supply_score, demand_score, activity_score, conversion_score,
     active_listings, active_sellers, leads_30d, saved_searches,
     visits_30d, total_leads, won_30d, computed_at)
  VALUES
    (p_province_id, v_slug, v_name, v_total, v_grade,
     v_supply, v_demand, v_activity, v_conversion,
     v_active_listings, v_active_sellers, v_leads_30d, v_saved_searches,
     v_visits_30d, v_total_leads, v_won_30d, now())
  ON CONFLICT (province_id) DO UPDATE SET
    score            = EXCLUDED.score,
    grade            = EXCLUDED.grade,
    supply_score     = EXCLUDED.supply_score,
    demand_score     = EXCLUDED.demand_score,
    activity_score   = EXCLUDED.activity_score,
    conversion_score = EXCLUDED.conversion_score,
    active_listings  = EXCLUDED.active_listings,
    active_sellers   = EXCLUDED.active_sellers,
    leads_30d        = EXCLUDED.leads_30d,
    saved_searches   = EXCLUDED.saved_searches,
    visits_30d       = EXCLUDED.visits_30d,
    total_leads      = EXCLUDED.total_leads,
    won_30d          = EXCLUDED.won_30d,
    computed_at      = now();
END;
$$;

-- ── refresh_all_liquidity_scores ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_all_liquidity_scores()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT province_id
    FROM listings
    WHERE province_id IS NOT NULL AND is_public
  LOOP
    PERFORM compute_province_liquidity_score(r.province_id);
  END LOOP;
END;
$$;

-- ── pg_cron: hourly refresh ───────────────────────────────────────────────────
-- SELECT cron.schedule('liquidity-scores-hourly', '0 * * * *',
--   $$SELECT refresh_all_liquidity_scores()$$);

ALTER TABLE province_liquidity_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_liquidity" ON province_liquidity_scores
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
