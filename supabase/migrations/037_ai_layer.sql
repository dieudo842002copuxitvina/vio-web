-- ══════════════════════════════════════════════════════════════════════════════
-- 037  AI ARCHITECTURE LAYER
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Persistence tables for Phase 21 AI features:
--   1. ai_listing_summaries   — cached AI-generated Vietnamese marketing summaries
--
-- AI computation happens in the application layer (Anthropic SDK).
-- DB is cache-only: read-through via server action, invalidated on listing update.
--
-- Depends on: 001 (listings)
-- Safe to re-run: IF NOT EXISTS guards throughout
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- §1.  ai_listing_summaries
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_listing_summaries (
  listing_id      uuid        PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  summary_vi      text        NOT NULL,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  model           text        NOT NULL DEFAULT 'claude-sonnet-4-6',
  prompt_version  integer     NOT NULL DEFAULT 1
);

-- Public read (summaries are part of the public listing detail)
ALTER TABLE ai_listing_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_ai_summaries" ON ai_listing_summaries;
CREATE POLICY "public_read_ai_summaries" ON ai_listing_summaries
  FOR SELECT USING (true);
