-- Agency CRM: manage brokers, agencies and farm operators
-- with large listing inventories and shared lead pipelines.

CREATE TYPE agency_verification_status AS ENUM ('pending', 'verified', 'suspended');
CREATE TYPE agency_member_role         AS ENUM ('owner', 'manager', 'agent');

-- ── Core entity ───────────────────────────────────────────────────────────────

CREATE TABLE agency_accounts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name          text        NOT NULL,
  representative_name   text        NOT NULL,
  phone                 text        NOT NULL,
  email                 text,
  province_id           integer,
  website               text,
  verification_status   agency_verification_status NOT NULL DEFAULT 'pending',
  trust_score           smallint    NOT NULL DEFAULT 0,
  owner_user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata              jsonb       NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON agency_accounts(owner_user_id);
CREATE INDEX ON agency_accounts(verification_status);

-- ── Team membership ───────────────────────────────────────────────────────────

CREATE TABLE agency_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid        NOT NULL REFERENCES agency_accounts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  role        agency_member_role NOT NULL DEFAULT 'agent',
  invited_at  timestamptz NOT NULL DEFAULT now(),
  joined_at   timestamptz,
  UNIQUE (agency_id, user_id)
);

CREATE INDEX ON agency_members(user_id);
CREATE INDEX ON agency_members(agency_id);

-- ── Link listings to agency (personal sellers: NULL) ─────────────────────────

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agency_accounts(id) ON DELETE SET NULL;

CREATE INDEX ON listings(agency_id) WHERE agency_id IS NOT NULL;

-- ── Pre-aggregated KPI cache ──────────────────────────────────────────────────

CREATE TABLE agency_metrics (
  agency_id       uuid    PRIMARY KEY REFERENCES agency_accounts(id) ON DELETE CASCADE,
  total_listings  integer NOT NULL DEFAULT 0,
  active_listings integer NOT NULL DEFAULT 0,
  total_leads     integer NOT NULL DEFAULT 0,
  visit_requests  integer NOT NULL DEFAULT 0,
  legal_reviews   integer NOT NULL DEFAULT 0,
  leads_won_30d   integer NOT NULL DEFAULT 0,
  revenue_vnd     bigint  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── refresh_agency_metrics ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_agency_metrics(p_agency_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_listings  integer;
  v_active_listings integer;
  v_total_leads     integer;
  v_visits          integer;
  v_legal           integer;
  v_won_30d         integer;
  v_revenue         bigint;
BEGIN
  -- All listings tagged to this agency
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE l.is_public AND l.moderation_status = 'approved')
  INTO v_total_listings, v_active_listings
  FROM listings l
  WHERE l.agency_id = p_agency_id;

  -- Leads for those listings
  SELECT COUNT(DISTINCT cl.id)
  INTO v_total_leads
  FROM crm_leads cl
  JOIN listings l ON l.id = cl.listing_id
  WHERE l.agency_id = p_agency_id;

  -- Visit requests
  SELECT COUNT(DISTINCT vr.id)
  INTO v_visits
  FROM visit_requests vr
  JOIN listings l ON l.id = vr.listing_id
  WHERE l.agency_id = p_agency_id;

  -- Legal review requests
  SELECT COUNT(DISTINCT lr.id)
  INTO v_legal
  FROM legal_review_requests lr
  JOIN listings l ON l.id = lr.listing_id
  WHERE l.agency_id = p_agency_id;

  -- Won leads in last 30 days
  SELECT COUNT(DISTINCT cl.id)
  INTO v_won_30d
  FROM crm_leads cl
  JOIN listings l ON l.id = cl.listing_id
  WHERE l.agency_id = p_agency_id
    AND cl.stage = 'won'
    AND cl.updated_at > now() - interval '30 days';

  -- Revenue from completed payments by any agency member
  SELECT COALESCE(SUM(pr.amount_vnd), 0)
  INTO v_revenue
  FROM payment_requests pr
  JOIN agency_members am ON am.user_id = pr.user_id
  WHERE am.agency_id = p_agency_id
    AND pr.status = 'completed';

  INSERT INTO agency_metrics
    (agency_id, total_listings, active_listings, total_leads, visit_requests, legal_reviews, leads_won_30d, revenue_vnd, updated_at)
  VALUES
    (p_agency_id, v_total_listings, v_active_listings, v_total_leads, v_visits, v_legal, v_won_30d, v_revenue, now())
  ON CONFLICT (agency_id) DO UPDATE SET
    total_listings  = EXCLUDED.total_listings,
    active_listings = EXCLUDED.active_listings,
    total_leads     = EXCLUDED.total_leads,
    visit_requests  = EXCLUDED.visit_requests,
    legal_reviews   = EXCLUDED.legal_reviews,
    leads_won_30d   = EXCLUDED.leads_won_30d,
    revenue_vnd     = EXCLUDED.revenue_vnd,
    updated_at      = now();
END;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE agency_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_metrics  ENABLE ROW LEVEL SECURITY;

-- Agency members can see their own agency
CREATE POLICY "agency_member_read" ON agency_accounts
  FOR SELECT USING (
    id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
    OR owner_user_id = auth.uid()
  );

CREATE POLICY "agency_member_self" ON agency_members
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "agency_metrics_read" ON agency_metrics
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  );
