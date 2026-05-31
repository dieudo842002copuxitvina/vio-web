-- ── 005_deprecate_products_services.sql ──────────────────────────────────────
-- Migrate products and services into the universal listings table.
-- SAFE: additive. Existing tables are NOT dropped until Step 3 is confirmed.
--
-- Run order:
--   Step 1: this file  — backfill + index
--   Step 2: verify in prod: SELECT COUNT(*) FROM listings WHERE type IN ('product','service');
--   Step 3: after confirmation, run the DROP section at the bottom (manual approval)

-- ── Step 1A: Backfill products → listings ────────────────────────────────────
-- Assumptions: products(id, slug, title, short_description, description,
--   cover_url, price_text, price_amount, category_id, storefront_id, owner_id,
--   is_featured, is_available, created_at, updated_at)

INSERT INTO listings (
  id, type, slug, title, short_description, description,
  cover_url, price_text, price_amount,
  category_id, storefront_id, owner_id,
  is_featured, is_public, status, moderation_status,
  created_at, updated_at
)
SELECT
  p.id,
  'product'::listing_type,
  p.slug,
  p.title,
  p.short_description,
  p.description,
  p.cover_url,
  p.price_text,
  p.price_amount,
  p.category_id,
  p.storefront_id,
  p.owner_id,
  COALESCE(p.is_featured, false),
  p.is_available,          -- maps to is_public
  CASE WHEN p.is_available THEN 'published' ELSE 'paused' END,
  'approved',
  p.created_at,
  p.updated_at
FROM products p
ON CONFLICT (id) DO NOTHING;

-- ── Step 1B: Backfill services → listings ────────────────────────────────────
-- Assumptions: services(id, slug, title, description, service_area_text,
--   price_text, category_id, storefront_id, owner_id, is_available,
--   created_at, updated_at)

INSERT INTO listings (
  id, type, slug, title, description,
  location_text,           -- service_area_text maps here
  price_text,
  category_id, storefront_id, owner_id,
  is_featured, is_public, status, moderation_status,
  created_at, updated_at
)
SELECT
  s.id,
  'service'::listing_type,
  s.slug,
  s.title,
  s.description,
  s.service_area_text,
  s.price_text,
  s.category_id,
  s.storefront_id,
  s.owner_id,
  false,
  s.is_available,
  CASE WHEN s.is_available THEN 'published' ELSE 'paused' END,
  'approved',
  s.created_at,
  s.updated_at
FROM services s
ON CONFLICT (id) DO NOTHING;

-- ── Step 1C: Rebuild search_vector for new rows ───────────────────────────────
-- Trigger fires on INSERT, so search_vector is populated automatically.
-- If trigger was not active during the INSERT above, run:
-- UPDATE listings SET updated_at = updated_at WHERE type IN ('product', 'service');

-- ── Step 2: Verify counts (run manually before Step 3) ───────────────────────
-- SELECT type, COUNT(*) FROM listings WHERE type IN ('product','service') GROUP BY type;
-- SELECT COUNT(*) FROM products;
-- SELECT COUNT(*) FROM services;

-- ── Step 3: Drop legacy tables (run MANUALLY after prod verification) ─────────
-- These are intentionally commented out. Run only after verifying backfill.
--
-- DROP TABLE IF EXISTS products  CASCADE;
-- DROP TABLE IF EXISTS services  CASCADE;

-- ── Step 4: Update RLS policies on listings to cover product/service ──────────
-- The existing "public can read approved listings" policy on listings
-- already covers type='product' and type='service' since it uses
-- (is_public = true AND moderation_status = 'approved') without type filter.
-- No additional policy changes needed.

-- ── Listing-media bucket note ─────────────────────────────────────────────────
-- Create 'listing-media' bucket in Supabase Storage dashboard:
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('listing-media', 'listing-media', true)
--   ON CONFLICT DO NOTHING;
--
-- Storage RLS for listing-media:
CREATE POLICY IF NOT EXISTS "public read listing-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-media');

CREATE POLICY IF NOT EXISTS "authenticated upload listing-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-media' AND (storage.foldername(name))[1] = auth.uid()::text);
