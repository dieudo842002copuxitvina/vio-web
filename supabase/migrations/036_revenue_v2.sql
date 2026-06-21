-- ══════════════════════════════════════════════════════════════════════════════
-- 036  REVENUE ENGINE V2
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Adds structured payment tracking for Phase 20:
--   1. payment_requests            — structured payment record replacing contact forms
--   2. legal_review_requests.amount_vnd — monetise legal reviews
--   3. verification_requests       — seller & document verification requests
--
-- Depends on: 001, 028 (revenue_engine), 033 (legal_review_requests)
-- Safe to re-run: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- §1.  payment_requests
-- ─────────────────────────────────────────────────────────────────────────────
-- product_type values:
--   'boost_7d'             — 99,000 VND / 7 days
--   'boost_30d'            — 299,000 VND / 30 days
--   'spotlight'            — 599,000 VND / 30 days
--   'pro_monthly'          — 299,000 VND / month
--   'seller_verification'  — 500,000 VND one-time
--   'legal_review'         — 200,000 VND per review
--
-- status flow: pending → pending_confirm → completed | failed | cancelled

CREATE TABLE IF NOT EXISTS payment_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_type     text        NOT NULL,
  product_id       text,                    -- listing_id or null
  amount_vnd       integer     NOT NULL,
  reference_code   text        UNIQUE,      -- 'VIO' + 8-char uppercase hash
  status           text        NOT NULL DEFAULT 'pending',
  metadata         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  confirmed_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS payment_requests_user_idx    ON payment_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_requests_status_idx  ON payment_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_requests_type_idx    ON payment_requests (product_type, status);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Users read their own requests
DROP POLICY IF EXISTS "users_read_own_payment_requests" ON payment_requests;
CREATE POLICY "users_read_own_payment_requests" ON payment_requests
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own
DROP POLICY IF EXISTS "users_insert_payment_requests" ON payment_requests;
CREATE POLICY "users_insert_payment_requests" ON payment_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins read all (via service role in server actions — no RLS needed there)

-- ─────────────────────────────────────────────────────────────────────────────
-- §2.  legal_review_requests.amount_vnd
-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: existing rows get the default 200,000 VND price.

ALTER TABLE legal_review_requests
  ADD COLUMN IF NOT EXISTS amount_vnd integer NOT NULL DEFAULT 200000;

ALTER TABLE legal_review_requests
  ADD COLUMN IF NOT EXISTS payment_request_id uuid REFERENCES payment_requests(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.  verification_requests
-- ─────────────────────────────────────────────────────────────────────────────
-- Seller identity/document verification.
-- request_type: 'seller' | 'legal_doc'
-- status: pending → in_review → approved | rejected

CREATE TABLE IF NOT EXISTS verification_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type        text        NOT NULL DEFAULT 'seller',
  documents           jsonb,               -- [{url, doc_type, uploaded_at}]
  status              text        NOT NULL DEFAULT 'pending',
  amount_vnd          integer     NOT NULL DEFAULT 500000,
  payment_request_id  uuid        REFERENCES payment_requests(id) ON DELETE SET NULL,
  reviewer_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  reviewed_at         timestamptz
);

CREATE INDEX IF NOT EXISTS verification_requests_user_idx   ON verification_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON verification_requests (status, created_at DESC);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_verification_requests" ON verification_requests;
CREATE POLICY "users_read_own_verification_requests" ON verification_requests
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_verification_requests" ON verification_requests;
CREATE POLICY "users_insert_verification_requests" ON verification_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
