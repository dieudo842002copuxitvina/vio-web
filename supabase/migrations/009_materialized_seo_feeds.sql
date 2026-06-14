-- ── 009_materialized_seo_feeds.sql ──────────────────────────────────────────
-- Week 2.2: Materialized SEO feeds for browse + sitemap pages.
--
-- Problem: every SEO crawler hit runs a runtime sort + filter scan on
-- public.listings (500k–1M rows). At scale this saturates connection slots and
-- raises p99 latency on browse pages.
--
-- Solution: pre-materialise the filtered, pre-sorted rows into
-- listings_featured_by_province, refreshed concurrently every 5 minutes via
-- pg_cron. Browse/sitemap pages read the MV; the base table is untouched.
--
-- What this migration adds:
--   • public.listings_featured_by_province — MV (pre-filtered + pre-sorted)
--   • listings_featured_by_province_id_idx — UNIQUE (required for CONCURRENT refresh)
--   • listings_featured_by_province_province_type_rn_idx — province browse
--   • listings_featured_by_province_type_featured_updated_idx — national browse + sitemap
--   • pg_cron job: CONCURRENT refresh every 5 minutes
--
-- Prerequisites:
--   • pg_cron extension enabled:
--     Dashboard → Database → Extensions → pg_cron
--   • Depends on migrations 001–008 (listings table, moderation columns)
--
-- Safe to re-run: DROP IF EXISTS guards the MV; cron.schedule() is idempotent
-- (replaces an existing job with the same name).
--
-- To remove the cron job manually:
--   SELECT cron.unschedule('refresh-listings-featured-by-province');

-- ── 1. Materialized view ──────────────────────────────────────────────────────

DROP MATERIALIZED VIEW IF EXISTS public.listings_featured_by_province;

CREATE MATERIALIZED VIEW public.listings_featured_by_province AS
SELECT
  l.id,
  l.type::text             AS type,
  l.slug,
  l.title,
  l.short_description,
  l.cover_url,
  l.price_text,
  l.price_amount,
  l.province_id,
  l.district_id,
  l.category_id,
  l.location_text,
  l.is_featured,
  l.is_verified,
  l.updated_at,
  ROW_NUMBER() OVER (
    PARTITION BY l.province_id, l.type
    ORDER BY l.is_featured DESC, l.updated_at DESC
  ) AS rn
FROM public.listings l
WHERE l.is_public         = true
  AND l.moderation_status = 'approved'
  AND l.status            = 'published'
WITH DATA;

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

-- UNIQUE required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX listings_featured_by_province_id_idx
  ON public.listings_featured_by_province (id);

-- Province browse: WHERE province_id = ? AND type = ? ORDER BY rn
-- Index scan only — no heap access needed for covered columns via index-only scan
CREATE INDEX listings_featured_by_province_province_type_rn_idx
  ON public.listings_featured_by_province (province_id, type, rn);

-- National browse + sitemap: WHERE type = ? ORDER BY is_featured DESC, updated_at DESC
CREATE INDEX listings_featured_by_province_type_featured_updated_idx
  ON public.listings_featured_by_province (type, is_featured DESC, updated_at DESC);

-- ── 3. Grants ─────────────────────────────────────────────────────────────────

GRANT SELECT ON public.listings_featured_by_province TO anon, authenticated;

-- ── 4. pg_cron refresh schedule ───────────────────────────────────────────────
-- CONCURRENT refresh takes a full snapshot diff; at ~500k rows this typically
-- completes in under 10 s on a standard Supabase instance, with no read blocking.
-- At 1M rows budget ~20 s. Monitor via: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- If pg_cron is not yet enabled the DO block below emits a WARNING and
-- continues rather than aborting the migration.

DO $$
BEGIN
  PERFORM cron.schedule(
    'refresh-listings-featured-by-province',
    '*/5 * * * *',
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.listings_featured_by_province$$
  );
EXCEPTION WHEN undefined_function OR undefined_schema THEN
  RAISE WARNING
    '[009] pg_cron not enabled — MV will not auto-refresh. '
    'Enable via: Dashboard → Database → Extensions → pg_cron, '
    'then run: SELECT cron.schedule(''refresh-listings-featured-by-province'', ''*/5 * * * *'', '
    '''REFRESH MATERIALIZED VIEW CONCURRENTLY public.listings_featured_by_province'');';
END;
$$;
