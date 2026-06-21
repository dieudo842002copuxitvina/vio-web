-- Sitemap helper functions for Phase 22 programmatic SEO.
-- These aggregate listing counts by district and by province×land_type
-- to produce URL sets for sitemap.ts without expensive app-side joins.

-- ── get_district_sitemap_combos ───────────────────────────────────────────────
-- Returns districts that have >= min_count approved public listings.
-- Used for: /dat-nong-nghiep/{province}/{district} sitemap entries.

CREATE OR REPLACE FUNCTION get_district_sitemap_combos(min_count int DEFAULT 3)
RETURNS TABLE(
  province_slug text,
  district_slug text,
  listing_count bigint,
  updated_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.slug          AS province_slug,
    d.slug          AS district_slug,
    COUNT(l.id)     AS listing_count,
    MAX(l.updated_at) AS updated_at
  FROM listings l
  JOIN districts d  ON d.id  = l.district_id
  JOIN provinces p  ON p.id  = l.province_id
  WHERE
    l.is_public          = true
    AND l.moderation_status = 'approved'
    AND l.district_id    IS NOT NULL
  GROUP BY p.slug, d.slug
  HAVING COUNT(l.id) >= min_count
  ORDER BY listing_count DESC;
$$;

-- ── get_province_type_sitemap_combos ─────────────────────────────────────────
-- Returns province × land_type combos with >= min_count approved public listings.
-- Used for: /dat-nong-nghiep/{province}/loai/{type} sitemap entries.

CREATE OR REPLACE FUNCTION get_province_type_sitemap_combos(min_count int DEFAULT 3)
RETURNS TABLE(
  province_slug text,
  land_type     text,
  listing_count bigint,
  updated_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.slug           AS province_slug,
    l.land_type      AS land_type,
    COUNT(l.id)      AS listing_count,
    MAX(l.updated_at) AS updated_at
  FROM listings l
  JOIN provinces p ON p.id = l.province_id
  WHERE
    l.is_public          = true
    AND l.moderation_status = 'approved'
    AND l.land_type      IS NOT NULL
    AND l.land_type      != ''
  GROUP BY p.slug, l.land_type
  HAVING COUNT(l.id) >= min_count
  ORDER BY listing_count DESC;
$$;
