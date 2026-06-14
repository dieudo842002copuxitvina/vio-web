-- 032_saved_searches_v2.sql
-- Extends saved_searches (from 029) with notification infrastructure.
-- Also adds saved_search_matches — the notification queue table that
-- gets populated when a new listing matches a saved search's filters.
--
-- Notification pipeline (future):
--   1. On listing publish: pg_notify('listing.published', listing_id)
--   2. Worker reads saved_searches WHERE notification_enabled = true
--   3. For each saved_search, evaluate filters JSONB against listing
--   4. INSERT INTO saved_search_matches (unsent)
--   5. Delivery worker reads unsent matches, sends push/email/zalo
--   6. Mark sent_at = now()

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend saved_searches
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE saved_searches
  ADD COLUMN IF NOT EXISTS notification_enabled   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_frequency text        NOT NULL DEFAULT 'daily'
    CHECK (notification_frequency IN ('instant', 'daily', 'weekly')),
  ADD COLUMN IF NOT EXISTS last_notified_at        timestamptz,
  ADD COLUMN IF NOT EXISTS match_count             integer     NOT NULL DEFAULT 0;

-- Index: workers query by notification_enabled + last_notified_at
CREATE INDEX IF NOT EXISTS idx_saved_searches_notify
  ON saved_searches(notification_enabled, last_notified_at)
  WHERE notification_enabled = true;

COMMENT ON COLUMN saved_searches.filters IS
  'SavedSearchFilters JSONB: province_id, district_id, land_type, '
  'price_min, price_max, area_min, area_max, soil_type[], water_source[], '
  'has_road_access, has_electricity, flood_risk_max, certifications[], '
  'has_gps, tier_min. See features/saved-searches/types.ts for the TypeScript type.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. saved_search_matches — notification queue
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_search_matches (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id  uuid        NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  listing_id       uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  matched_at       timestamptz NOT NULL DEFAULT now(),
  -- Delivery state
  sent_at          timestamptz,                              -- NULL = queued
  channel          text CHECK (channel IN ('push', 'email', 'zalo')),
  -- Dedup: one match record per (search, listing)
  UNIQUE (saved_search_id, listing_id)
);

-- Workers: fetch unsent matches ordered by creation
CREATE INDEX IF NOT EXISTS idx_ssm_unsent
  ON saved_search_matches(matched_at)
  WHERE sent_at IS NULL;

-- Owner dashboard: show new matches for a user's searches
CREATE INDEX IF NOT EXISTS idx_ssm_by_search
  ON saved_search_matches(saved_search_id, matched_at DESC);

-- Dedup check when publishing a new listing
CREATE INDEX IF NOT EXISTS idx_ssm_by_listing
  ON saved_search_matches(listing_id);

ALTER TABLE saved_search_matches ENABLE ROW LEVEL SECURITY;

-- Users can only see matches for their own saved searches
CREATE POLICY "ssm_owner_read"
  ON saved_search_matches FOR SELECT USING (
    saved_search_id IN (
      SELECT id FROM saved_searches WHERE user_id = auth.uid()
    )
  );

-- Only service role inserts (notification worker runs as service_role)
CREATE POLICY "ssm_service_write"
  ON saved_search_matches FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
