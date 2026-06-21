-- ══════════════════════════════════════════════════════════════════════════════
-- 043  BLOG / CMS
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Adds structured blog/news content management:
--   1. blogs — article storage with draft/published workflow
--   2. RLS: public read for published, admin full-access via service key
--
-- Depends on: 001 (profiles table)
-- Safe to re-run: IF NOT EXISTS guards throughout
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- §1.  blogs
-- ─────────────────────────────────────────────────────────────────────────────
-- status values:
--   'draft'      — visible only to admins
--   'published'  — visible to everyone

CREATE TABLE IF NOT EXISTS blogs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL,
  slug          text        NOT NULL,
  excerpt       text,
  content       text,                              -- HTML or Markdown
  thumbnail_url text,
  author_id     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  status        text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'published')),
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blogs_slug_unique         ON blogs (slug);
CREATE INDEX        IF NOT EXISTS blogs_status_published_at ON blogs (status, published_at DESC);
CREATE INDEX        IF NOT EXISTS blogs_author_idx          ON blogs (author_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- §2.  Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can SELECT published posts
DROP POLICY IF EXISTS "blogs_public_read_published" ON blogs;
CREATE POLICY "blogs_public_read_published" ON blogs
  FOR SELECT USING (status = 'published');

-- Admin reads (drafts + published) are handled via service-role
-- createAdminClient() bypasses RLS — no extra policy needed.

-- ─────────────────────────────────────────────────────────────────────────────
-- §3.  Auto-bump updated_at on every UPDATE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_blog_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blogs_touch_updated_at ON blogs;
CREATE TRIGGER blogs_touch_updated_at
  BEFORE UPDATE ON blogs
  FOR EACH ROW EXECUTE FUNCTION touch_blog_updated_at();
