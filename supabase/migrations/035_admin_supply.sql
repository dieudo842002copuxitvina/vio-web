-- ══════════════════════════════════════════════════════════════════════════════
-- 035  ADMIN & SUPPLY ACQUISITION
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Adds infrastructure for Phase 18–19:
--   1. profiles.is_admin         — admin role flag
--   2. audit_logs                — immutable event log for admin actions
--   3. fraud_signals             — detected fraud/abuse signals with status
--   4. detect_listing_duplicates() — pg_trgm-based duplicate finder
--
-- Depends on: 001 (listings, profiles), 031 (listing_completeness)
-- Safe to re-run: IF NOT EXISTS / OR REPLACE guards throughout
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- §1.  profiles.is_admin
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON public.profiles (is_admin)
  WHERE is_admin = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- §2.  audit_logs
-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only event log.  No UPDATE or DELETE policies.
-- action format: '<entity>.<verb>'  e.g. 'listing.approve', 'seller.verify'

CREATE TABLE IF NOT EXISTS audit_logs (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action      text        NOT NULL,
  entity_type text,
  entity_id   text,
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx    ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx   ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx   ON audit_logs (action, created_at DESC);

-- RLS: admins can read; service role writes
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_logs" ON audit_logs;
CREATE POLICY "admin_read_audit_logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.  fraud_signals
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fraud_signals (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  signal_type  text        NOT NULL,  -- 'duplicate_phone' | 'price_outlier' | 'velocity_abuse'
  entity_type  text        NOT NULL,  -- 'listing' | 'seller'
  entity_id    text        NOT NULL,
  metadata     jsonb,
  status       text        NOT NULL DEFAULT 'open',  -- 'open' | 'dismissed' | 'actioned'
  dismissed_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  dismissed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fraud_signals_status_idx ON fraud_signals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS fraud_signals_entity_idx ON fraud_signals (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS fraud_signals_type_idx   ON fraud_signals (signal_type, status);

ALTER TABLE fraud_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_fraud_signals" ON fraud_signals;
CREATE POLICY "admin_read_fraud_signals" ON fraud_signals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- §4.  detect_listing_duplicates()
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns existing listings by the same owner in the same province that are
-- likely duplicates of a candidate row (title similarity + area proximity).
-- Requires pg_trgm (enabled in Supabase by default via 006_trigram_normalized_columns.sql).

CREATE OR REPLACE FUNCTION detect_listing_duplicates(
  p_owner_id    uuid,
  p_title       text,
  p_province_id integer,
  p_area_m2     numeric
)
RETURNS TABLE (
  listing_id       uuid,
  title            text,
  slug             text,
  similarity_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id                                AS listing_id,
    l.title                             AS title,
    l.slug                              AS slug,
    ROUND(similarity(p_title, l.title)::numeric, 3) AS similarity_score
  FROM listings l
  WHERE
    l.owner_id    = p_owner_id
    AND l.province_id = p_province_id
    AND l.status  <> 'archived'
    AND (
      -- Title similarity above threshold
      similarity(p_title, l.title) > 0.40
      OR (
        -- Area match within 10% (when area is provided and stored as attribute)
        p_area_m2 IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM listing_attribute_values av
          WHERE av.listing_id = l.id
            AND av.key = 'area_m2'
            AND av.value_number IS NOT NULL
            AND av.value_number BETWEEN p_area_m2 * 0.90 AND p_area_m2 * 1.10
        )
      )
    )
  ORDER BY similarity_score DESC
  LIMIT 5;
$$;

-- Allow authenticated users to call for their own listings (duplicate check during import)
GRANT EXECUTE ON FUNCTION detect_listing_duplicates(uuid, text, integer, numeric)
  TO authenticated;
