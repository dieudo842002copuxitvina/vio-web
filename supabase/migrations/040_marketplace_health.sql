-- Marketplace Health Dashboard: daily snapshots + alert system.
-- Founder opens /admin/health every morning to see platform pulse.

-- ── Daily metrics snapshot ────────────────────────────────────────────────────

CREATE TABLE marketplace_daily_metrics (
  id                    bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date                  date        NOT NULL UNIQUE,
  -- Supply
  active_listings       integer     NOT NULL DEFAULT 0,
  new_listings          integer     NOT NULL DEFAULT 0,
  active_sellers        integer     NOT NULL DEFAULT 0,
  active_agencies       integer     NOT NULL DEFAULT 0,
  -- Demand
  new_leads             integer     NOT NULL DEFAULT 0,
  visit_requests        integer     NOT NULL DEFAULT 0,
  legal_review_requests integer     NOT NULL DEFAULT 0,
  saved_searches        integer     NOT NULL DEFAULT 0,
  -- Revenue
  pro_subscribers       integer     NOT NULL DEFAULT 0,
  revenue_vnd           bigint      NOT NULL DEFAULT 0,
  pending_payments      integer     NOT NULL DEFAULT 0,
  -- Computed
  leads_per_listing     numeric(6,2) NOT NULL DEFAULT 0,
  computed_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON marketplace_daily_metrics(date DESC);

-- ── Alert system ──────────────────────────────────────────────────────────────

CREATE TABLE marketplace_alerts (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_type   text        NOT NULL,
  -- 'lead_drop_30pct' | 'listing_drop_20pct' | 'revenue_drop' | 'seller_churn'
  severity     text        NOT NULL DEFAULT 'warning',
  -- 'info' | 'warning' | 'critical'
  message_vi   text        NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  resolved_by  uuid,
  metadata     jsonb       NOT NULL DEFAULT '{}'
);

CREATE INDEX ON marketplace_alerts(resolved_at) WHERE resolved_at IS NULL;

-- ── snapshot_marketplace_metrics ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION snapshot_marketplace_metrics(p_date date DEFAULT CURRENT_DATE)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_active_listings       integer;
  v_new_listings          integer;
  v_active_sellers        integer;
  v_active_agencies       integer;
  v_new_leads             integer;
  v_visit_requests        integer;
  v_legal_reviews         integer;
  v_saved_searches        integer;
  v_pro_subs              integer;
  v_revenue               bigint;
  v_pending               integer;
  v_prev_leads            integer;
  v_prev_listings         integer;
BEGIN
  -- Supply
  SELECT COUNT(*) INTO v_active_listings
  FROM listings WHERE is_public AND moderation_status = 'approved';

  SELECT COUNT(*) INTO v_new_listings
  FROM listings WHERE DATE(published_at) = p_date;

  SELECT COUNT(DISTINCT owner_id) INTO v_active_sellers
  FROM listings WHERE is_public AND moderation_status = 'approved' AND owner_id IS NOT NULL;

  SELECT COUNT(DISTINCT agency_id) INTO v_active_agencies
  FROM listings WHERE is_public AND moderation_status = 'approved' AND agency_id IS NOT NULL;

  -- Demand (today)
  SELECT COUNT(*) INTO v_new_leads
  FROM crm_leads WHERE DATE(created_at) = p_date;

  SELECT COUNT(*) INTO v_visit_requests
  FROM visit_requests WHERE DATE(created_at) = p_date;

  SELECT COUNT(*) INTO v_legal_reviews
  FROM legal_review_requests WHERE DATE(created_at) = p_date;

  SELECT COUNT(*) INTO v_saved_searches
  FROM saved_searches;

  -- Revenue
  SELECT COUNT(*) INTO v_pro_subs
  FROM subscriptions WHERE status = 'active';

  SELECT COALESCE(SUM(amount_vnd), 0) INTO v_revenue
  FROM payment_requests
  WHERE DATE(completed_at) = p_date AND status = 'completed';

  SELECT COUNT(*) INTO v_pending
  FROM payment_requests WHERE status IN ('pending', 'pending_confirm');

  -- Upsert snapshot
  INSERT INTO marketplace_daily_metrics
    (date, active_listings, new_listings, active_sellers, active_agencies,
     new_leads, visit_requests, legal_review_requests, saved_searches,
     pro_subscribers, revenue_vnd, pending_payments, leads_per_listing, computed_at)
  VALUES
    (p_date, v_active_listings, v_new_listings, v_active_sellers, v_active_agencies,
     v_new_leads, v_visit_requests, v_legal_reviews, v_saved_searches,
     v_pro_subs, v_revenue, v_pending,
     CASE WHEN v_active_listings > 0 THEN ROUND(v_new_leads::numeric / v_active_listings, 2) ELSE 0 END,
     now())
  ON CONFLICT (date) DO UPDATE SET
    active_listings       = EXCLUDED.active_listings,
    new_listings          = EXCLUDED.new_listings,
    active_sellers        = EXCLUDED.active_sellers,
    active_agencies       = EXCLUDED.active_agencies,
    new_leads             = EXCLUDED.new_leads,
    visit_requests        = EXCLUDED.visit_requests,
    legal_review_requests = EXCLUDED.legal_review_requests,
    saved_searches        = EXCLUDED.saved_searches,
    pro_subscribers       = EXCLUDED.pro_subscribers,
    revenue_vnd           = EXCLUDED.revenue_vnd,
    pending_payments      = EXCLUDED.pending_payments,
    leads_per_listing     = EXCLUDED.leads_per_listing,
    computed_at           = now();

  -- ── Alert detection: compare to yesterday ──────────────────────────────────

  SELECT new_leads, active_listings
  INTO v_prev_leads, v_prev_listings
  FROM marketplace_daily_metrics WHERE date = p_date - 1;

  -- Lead volume drops 30%+
  IF v_prev_leads IS NOT NULL AND v_prev_leads > 5 AND v_new_leads < v_prev_leads * 0.70 THEN
    INSERT INTO marketplace_alerts (alert_type, severity, message_vi, metadata)
    VALUES ('lead_drop_30pct', 'warning',
      'Lượng khách hàng mới giảm 30%+ so với hôm qua',
      jsonb_build_object('today', v_new_leads, 'yesterday', v_prev_leads, 'date', p_date));
  END IF;

  -- Listing volume drops 20%+
  IF v_prev_listings IS NOT NULL AND v_prev_listings > 10 AND v_active_listings < v_prev_listings * 0.80 THEN
    INSERT INTO marketplace_alerts (alert_type, severity, message_vi, metadata)
    VALUES ('listing_drop_20pct', 'critical',
      'Số tin đăng active giảm 20%+ — kiểm tra moderation hoặc lỗi hệ thống',
      jsonb_build_object('today', v_active_listings, 'yesterday', v_prev_listings, 'date', p_date));
  END IF;
END;
$$;

-- ── pg_cron: run daily at 17:00 UTC = midnight Vietnam ───────────────────────
-- Uncomment after pg_cron is enabled:
-- SELECT cron.schedule('marketplace-daily-snapshot', '0 17 * * *',
--   $$SELECT snapshot_marketplace_metrics()$$);

-- ── Admin-only access (no RLS needed — service role reads) ───────────────────
ALTER TABLE marketplace_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_alerts        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_metrics" ON marketplace_daily_metrics
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "admin_only_alerts" ON marketplace_alerts
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
