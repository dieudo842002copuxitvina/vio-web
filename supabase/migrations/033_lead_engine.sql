-- 033_lead_engine.sql
-- Phase 16: Lead Engine
--
-- New tables:
--   • visit_requests          — structured visit scheduling (replaces free-text inquiries)
--   • legal_review_requests   — legal due-diligence requests
--   • lead_events             — buyer-side funnel signal log (per authenticated session)
--
-- Enhancements to crm_leads:
--   • score        smallint   — aggregated buyer signal score (0–200+)
--   • temperature  text       — cold | warm | hot | very_hot
--   • buyer_profile_id uuid   — links to the authenticated buyer who sent the inquiry
--
-- Functions:
--   • record_lead_event(p_listing_id, p_profile_id, p_event_type, p_session_id, p_metadata)
--       → Inserts into lead_events; upserts crm_leads with updated score/temperature
--   • compute_lead_score(p_listing_id, p_profile_id) → smallint
--       → Aggregates weighted lead_events for a (listing, buyer) pair

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Extend crm_leads
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS score           smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temperature     text
    CHECK (temperature IN ('cold', 'warm', 'hot', 'very_hot')),
  ADD COLUMN IF NOT EXISTS buyer_profile_id uuid;

CREATE INDEX IF NOT EXISTS idx_crm_leads_buyer
  ON crm_leads(buyer_profile_id)
  WHERE buyer_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_score
  ON crm_leads(owner_id, score DESC)
  WHERE score IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. visit_requests
-- Structured visit scheduling. Replaces the free-text [ĐẶT LỊCH XEM ĐẤT]
-- prefix in the inquiries table for new submissions.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visit_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_id        uuid,                                        -- listings.owner_id at insert time
  requester_id     uuid,                                        -- auth.uid() if authenticated
  -- Contact
  contact_name     text        NOT NULL CHECK (length(contact_name) BETWEEN 1 AND 100),
  contact_phone    text        NOT NULL CHECK (length(contact_phone) BETWEEN 9 AND 15),
  -- Scheduling
  preferred_date   date,
  preferred_time   text CHECK (preferred_time IN ('morning', 'afternoon', 'evening')),
  -- Status
  status           text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  -- Content
  notes            text,
  seller_notes     text,
  -- Timestamps
  confirmed_at     timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_requests_seller
  ON visit_requests(seller_id, status, created_at DESC)
  WHERE seller_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visit_requests_listing
  ON visit_requests(listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visit_requests_requester
  ON visit_requests(requester_id)
  WHERE requester_id IS NOT NULL;

ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vr_public_insert"
  ON visit_requests FOR INSERT WITH CHECK (true);   -- anyone can request a visit

CREATE POLICY "vr_seller_read"
  ON visit_requests FOR SELECT USING (
    seller_id = auth.uid() OR requester_id = auth.uid()
  );

CREATE POLICY "vr_seller_update"
  ON visit_requests FOR UPDATE USING (
    seller_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. legal_review_requests
-- Buyers requesting formal legal document review for a listing.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS legal_review_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_id        uuid,
  requester_id     uuid,
  -- Contact
  contact_name     text        NOT NULL CHECK (length(contact_name) BETWEEN 1 AND 100),
  contact_phone    text        NOT NULL CHECK (length(contact_phone) BETWEEN 9 AND 15),
  -- Request detail
  request_type     text        NOT NULL DEFAULT 'full_review'
    CHECK (request_type IN ('verify_title', 'review_parcel', 'check_planning', 'full_review')),
  status           text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes            text,
  response_notes   text,
  -- Timestamps
  responded_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_reviews_seller
  ON legal_review_requests(seller_id, status, created_at DESC)
  WHERE seller_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legal_reviews_listing
  ON legal_review_requests(listing_id, created_at DESC);

ALTER TABLE legal_review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lr_public_insert"
  ON legal_review_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "lr_seller_read"
  ON legal_review_requests FOR SELECT USING (
    seller_id = auth.uid() OR requester_id = auth.uid()
  );

CREATE POLICY "lr_seller_update"
  ON legal_review_requests FOR UPDATE USING (
    seller_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. lead_events
-- Buyer-side funnel signal log. Separate from listing_events (page-level signals).
-- lead_events captures high-intent actions: save, contact, visit, legal.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_events (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id   uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_id    uuid,                                            -- copied from listings at insert
  profile_id   uuid,                                            -- null for anonymous
  session_id   text,                                            -- anonymous session fallback
  event_type   text        NOT NULL
    CHECK (event_type IN (
      'save', 'unsave',
      'chat_click', 'call_click', 'map_view',
      'request_visit', 'legal_review', 'share'
    )),
  event_source text,                                            -- 'listing_detail'|'search'|...
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Hot query: aggregate events for a (profile, listing) pair for scoring
CREATE INDEX IF NOT EXISTS idx_lead_events_profile_listing
  ON lead_events(profile_id, listing_id, event_type)
  WHERE profile_id IS NOT NULL;

-- Seller dashboard: "who's interested in my listings?"
CREATE INDEX IF NOT EXISTS idx_lead_events_seller
  ON lead_events(seller_id, created_at DESC)
  WHERE seller_id IS NOT NULL;

-- Session-based dedup (anonymous users)
CREATE INDEX IF NOT EXISTS idx_lead_events_session
  ON lead_events(session_id, listing_id, event_type)
  WHERE session_id IS NOT NULL AND profile_id IS NULL;

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

-- Sellers see events on their own listings
CREATE POLICY "le_seller_read"
  ON lead_events FOR SELECT USING (seller_id = auth.uid());

-- Anyone (incl. anonymous via service role) can insert
CREATE POLICY "le_public_insert"
  ON lead_events FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Function: compute_lead_score
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_lead_score(
  p_listing_id  uuid,
  p_profile_id  uuid
)
RETURNS smallint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE event_type
      WHEN 'save'          THEN 10
      WHEN 'map_view'      THEN  2
      WHEN 'chat_click'    THEN 15
      WHEN 'call_click'    THEN 25
      WHEN 'share'         THEN  8
      WHEN 'request_visit' THEN 40
      WHEN 'legal_review'  THEN 50
      ELSE 0
    END
  )::smallint, 0)
  FROM lead_events
  WHERE listing_id = p_listing_id
    AND profile_id = p_profile_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Function: record_lead_event
-- Inserts a lead_event and upserts the matching crm_lead score.
-- Called from application server actions — never directly from client.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION record_lead_event(
  p_listing_id   uuid,
  p_profile_id   uuid,        -- NULL for anonymous
  p_event_type   text,
  p_session_id   text DEFAULT NULL,
  p_source       text DEFAULT NULL,
  p_metadata     jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id  uuid;
  v_score      smallint;
  v_temp       text;
BEGIN
  -- Look up seller
  SELECT owner_id INTO v_seller_id FROM listings WHERE id = p_listing_id;

  -- Insert event
  INSERT INTO lead_events (
    listing_id, seller_id, profile_id, session_id,
    event_type, event_source, metadata
  ) VALUES (
    p_listing_id, v_seller_id, p_profile_id, p_session_id,
    p_event_type, p_source, COALESCE(p_metadata, '{}')
  );

  -- If authenticated buyer: update crm_lead score
  IF p_profile_id IS NOT NULL THEN
    v_score := compute_lead_score(p_listing_id, p_profile_id);

    v_temp := CASE
      WHEN v_score >= 50 THEN 'very_hot'
      WHEN v_score >= 30 THEN 'hot'
      WHEN v_score >= 15 THEN 'warm'
      ELSE 'cold'
    END;

    -- Auto-upsert the crm_lead if one exists for this listing+buyer pairing
    UPDATE crm_leads
    SET
      score             = v_score,
      temperature       = v_temp,
      buyer_profile_id  = p_profile_id,
      updated_at        = now()
    WHERE listing_id = p_listing_id
      AND (buyer_profile_id = p_profile_id
           OR (buyer_profile_id IS NULL AND owner_id = v_seller_id));
    -- Note: INSERT is handled by the existing auto_create_crm_lead trigger on inquiries.
    -- record_lead_event only UPDATES existing leads — it does not create new ones.
  END IF;
END;
$$;

COMMENT ON FUNCTION record_lead_event IS
  'Fire-and-forget lead signal recorder. Call from server actions after buyer interactions. '
  'Inserts into lead_events and updates crm_leads.score/temperature for authenticated buyers.';
