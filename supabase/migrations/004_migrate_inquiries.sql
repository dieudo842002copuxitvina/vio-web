-- ── 004_migrate_inquiries.sql ────────────────────────────────────────────────
-- Migrate the inquiries table from land_listings FK to universal listings FK.
-- SAFE to run while app is live: adds new column, backfills, updates policies.
-- The old land_listing_id column is kept until backfill is verified in prod.
-- Drop it with: ALTER TABLE inquiries DROP COLUMN land_listing_id;

-- ── Step 1: Add listing_id column ─────────────────────────────────────────────

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inquiries_listing_id_idx ON inquiries (listing_id);

-- ── Step 2: Backfill listing_id from land_listings via slug match ─────────────
-- Assumes land_listings rows were already imported into listings with type='land'
-- and matching slugs. Safe to run multiple times (WHERE listing_id IS NULL guard).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'land_listings'
  ) THEN
    UPDATE inquiries i
    SET listing_id = l.id
    FROM listings l
    JOIN land_listings ll ON ll.slug = l.slug AND l.type = 'land'
    WHERE ll.id = i.land_listing_id
      AND i.land_listing_id IS NOT NULL
      AND i.listing_id IS NULL;
  END IF;
END $$;

-- ── Step 3: Update RLS policies ───────────────────────────────────────────────
-- Drop old policies that reference land_listings; create equivalents using listings.

DROP POLICY IF EXISTS "owner can read own inquiry"    ON inquiries;
DROP POLICY IF EXISTS "owner can update inquiry status" ON inquiries;

-- Listing owners can see their own inquiries
CREATE POLICY "owner can read own inquiry"
ON inquiries FOR SELECT
USING (
  -- Legacy path: inquiry still linked via land_listing_id
  EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_id AND l.owner_id = auth.uid()
  )
);

-- Listing owners can update inquiry status
CREATE POLICY "owner can update inquiry status"
ON inquiries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_id AND l.owner_id = auth.uid()
  )
);

-- ── Step 4: Buyer insert policy ───────────────────────────────────────────────
-- Anyone can insert an inquiry (buyer submitting a lead form).
-- The listing_id must reference a publicly visible listing.

DROP POLICY IF EXISTS "anyone can insert inquiry" ON inquiries;

CREATE POLICY "anyone can insert inquiry"
ON inquiries FOR INSERT
WITH CHECK (
  listing_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_id
      AND l.is_public = true
      AND l.moderation_status = 'approved'
  )
);

-- ── After verifying backfill in production: ───────────────────────────────────
-- ALTER TABLE inquiries DROP COLUMN land_listing_id;
-- DROP INDEX IF EXISTS inquiries_land_listing_id_idx;
