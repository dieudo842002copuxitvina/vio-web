-- ── 019_trust_quality.sql ─────────────────────────────────────────────────────
-- Week 4.0: Trust + Commerce Identity Network.
--
-- Extends the trust foundation (016) and search quality (011).
-- Pure PostgreSQL, no AI/ML, no external fraud services, no realtime pipelines.
--
-- Schema changes:
--   • listing_quality_scores  — ADD COLUMNS: completeness/media/text/spam
--   • fraud_signals           — NEW: suspicious-behaviour signal log
--   • trust_events            — NEW: immutable trust audit trail
--   • buyer_safety_reports    — NEW: user-submitted safety incidents
--   • merchant_trust_edges    — NEW: mutual-engagement B2B trust graph
--   • trusted_public_listings — NEW: materialized trust-first discovery view
--
-- Functions (OR REPLACE or CREATE):
--   • refresh_listing_quality_scores()    — extended with content scoring
--   • refresh_merchant_trust_scores()     — extended with edge + quality bonus
--   • refresh_fraud_signals()             — SECURITY DEFINER
--   • refresh_trust_edges()               — SECURITY DEFINER
--   • get_trusted_merchants_by_province() — province-scoped trust feed helper
--   • search_listings_hybrid()            — trust boost + spam penalty wired
--
-- pg_cron new slots (no conflict with 001–018):
--   :01/:31  refresh_fraud_signals
--   :25/:55  REFRESH MATERIALIZED VIEW trusted_public_listings CONCURRENTLY
--   :27/:57  refresh_trust_edges
--
-- All three new cron slots confirmed non-conflicting:
--   011 uses :08/:11/:23/:26 (and ×4 per hour)
--   018 highest slot is :22; :28/:29 from prior migrations
--   :01, :25, :27 are unoccupied in the full 25-slot chain.
--
-- Depends on: migrations 001–018
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE / ADD COLUMN IF NOT EXISTS

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  Extend listing_quality_scores (011) — content + spam columns
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Adds breakdown columns alongside the existing engagement quality_score.
-- The existing quality_score (bounce/dwell/inquiry/save) is preserved unchanged
-- so search_listings_hybrid() continues to work without disruption.
--
-- New formula:
--   completeness_score (0–1):
--     title ≥ 10 chars:         0.20
--     description ≥ 50 chars:   0.25
--     price_amount > 0:         0.20
--     cover_url not null:       0.20
--     province_id not null:     0.15
--
--   media_score (0–1):
--     cover_url not null → 1.0 else 0.0
--     (extensible: photo count from metadata later)
--
--   text_score (0–1):
--     LEAST(1, description_length / 300)
--
--   content_score (0–1):
--     completeness × 0.60 + text_score × 0.40
--
--   spam_penalty (0–1):
--     FROM listing_authenticity.spam_score (016) — subtracted in search ranking

ALTER TABLE public.listing_quality_scores
  ADD COLUMN IF NOT EXISTS completeness_score numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS media_score        numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS text_score         numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_score      numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spam_penalty       numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS computed_at        timestamptz;

CREATE INDEX IF NOT EXISTS lqs_content_score_idx
  ON public.listing_quality_scores (content_score DESC)
  WHERE content_score > 0;

CREATE INDEX IF NOT EXISTS lqs_spam_penalty_idx
  ON public.listing_quality_scores (spam_penalty DESC)
  WHERE spam_penalty > 0.40;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  fraud_signals
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Suspicious-behaviour evidence log.  One row per (profile, signal_type) per
-- detection cycle — existing rows are overwritten (UPSERT by profile+type).
-- Signals expire after 90 days via pg_cron daily prune.
--
-- signal_strength semantics:
--   0.0–0.3  → informational
--   0.3–0.6  → soft flag (suppressed in recommendation feeds)
--   0.6–0.8  → hard flag (hidden from default search)
--   0.8–1.0  → fraud_flag candidate (merchant_trust_scores.fraud_flag = true)

CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id              bigserial    PRIMARY KEY,
  profile_id      uuid         NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  signal_type     text         NOT NULL
                    CHECK (signal_type IN (
                      'rapid_repost',       -- >5 listings in same province in 24 h
                      'bulk_spam',          -- >20 new listings in 7 days
                      'duplicate_cluster',  -- >5 near-duplicate listings detected
                      'phone_abuse',        -- phone flagged in phone_listing_stats
                      'price_manipulation', -- price changed >50% ≥ 3 times in 7 days
                      'account_farming'     -- account age < 7 days + high volume
                    )),
  signal_strength numeric(5,4) NOT NULL DEFAULT 0 CHECK (signal_strength BETWEEN 0 AND 1),
  evidence_json   jsonb        NOT NULL DEFAULT '{}',
  resolved        boolean      NOT NULL DEFAULT false,
  resolved_by     uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at     timestamptz,
  detected_at     timestamptz  NOT NULL DEFAULT now(),
  expires_at      timestamptz  NOT NULL DEFAULT now() + interval '90 days',

  UNIQUE (profile_id, signal_type)  -- one active signal per (merchant, type)
);

CREATE INDEX IF NOT EXISTS fraud_signals_profile_idx
  ON public.fraud_signals (profile_id, signal_strength DESC)
  WHERE NOT resolved;

CREATE INDEX IF NOT EXISTS fraud_signals_strength_idx
  ON public.fraud_signals (signal_strength DESC, detected_at DESC)
  WHERE NOT resolved AND signal_strength >= 0.60;

CREATE INDEX IF NOT EXISTS fraud_signals_type_idx
  ON public.fraud_signals (signal_type, detected_at DESC)
  WHERE NOT resolved;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  trust_events — immutable audit trail
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Append-only. score_delta is a stored generated column — no manual computation.
-- Prune rows older than 1 year.

CREATE TABLE IF NOT EXISTS public.trust_events (
  id           bigserial    PRIMARY KEY,
  profile_id   uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   text         NOT NULL
                 CHECK (event_type IN (
                   'score_computed',
                   'fraud_flagged',   'fraud_cleared',
                   'identity_verified', 'verification_revoked',
                   'report_received',
                   'spam_detected',   'spam_cleared',
                   'trust_edge_formed'
                 )),
  score_before numeric(5,1),
  score_after  numeric(5,1),
  score_delta  numeric(5,1) GENERATED ALWAYS AS (
                 CASE WHEN score_before IS NOT NULL AND score_after IS NOT NULL
                      THEN score_after - score_before
                      ELSE NULL END
               ) STORED,
  trigger_type text,
  metadata     jsonb        NOT NULL DEFAULT '{}',
  created_at   timestamptz  NOT NULL DEFAULT now()
);

-- Per-merchant history view
CREATE INDEX IF NOT EXISTS trust_events_profile_idx
  ON public.trust_events (profile_id, created_at DESC);

-- Fraud event audit
CREATE INDEX IF NOT EXISTS trust_events_fraud_idx
  ON public.trust_events (event_type, created_at DESC)
  WHERE event_type IN ('fraud_flagged','fraud_cleared');

-- Score change analysis (large negative deltas signal degradation)
CREATE INDEX IF NOT EXISTS trust_events_delta_idx
  ON public.trust_events (score_delta ASC NULLS LAST)
  WHERE score_delta IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  buyer_safety_reports
-- ══════════════════════════════════════════════════════════════════════════════
--
-- User-submitted safety incidents.  Both reported_profile_id and
-- reported_listing_id may be null (e.g., phone-only scam reports).
-- Moderation flow: pending → reviewed → actioned | dismissed.
--
-- Abuse-resistant: reporter_id is required so anonymous flood attacks
-- require many accounts (deters casual abuse).

CREATE TABLE IF NOT EXISTS public.buyer_safety_reports (
  id                   bigserial    PRIMARY KEY,
  reporter_id          uuid         NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  reported_profile_id  uuid         REFERENCES auth.users(id)    ON DELETE SET NULL,
  reported_listing_id  uuid         REFERENCES public.listings(id) ON DELETE SET NULL,
  report_type          text         NOT NULL
                         CHECK (report_type IN (
                           'scam',
                           'fake_listing',
                           'price_fraud',
                           'spam',
                           'identity_theft',
                           'harassment',
                           'other'
                         )),
  severity             text         NOT NULL DEFAULT 'medium'
                         CHECK (severity IN ('low','medium','high','critical')),
  description          text,
  evidence_urls        jsonb        NOT NULL DEFAULT '[]',
  status               text         NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  reviewed_by          uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at          timestamptz,
  created_at           timestamptz  NOT NULL DEFAULT now()
);

-- Pending moderation queue (ordered by severity)
CREATE INDEX IF NOT EXISTS safety_reports_pending_idx
  ON public.buyer_safety_reports (severity DESC, created_at DESC)
  WHERE status = 'pending';

-- Per-merchant report history
CREATE INDEX IF NOT EXISTS safety_reports_profile_idx
  ON public.buyer_safety_reports (reported_profile_id, created_at DESC)
  WHERE reported_profile_id IS NOT NULL;

-- Listing report lookup
CREATE INDEX IF NOT EXISTS safety_reports_listing_idx
  ON public.buyer_safety_reports (reported_listing_id, created_at DESC)
  WHERE reported_listing_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  merchant_trust_edges
-- ══════════════════════════════════════════════════════════════════════════════
--
-- B2B trust graph built from mutual inquiry engagement between two authenticated
-- merchants.  Evidence: both parties have inquired at listings owned by the other.
--
-- trust_strength = LEAST(1, LN(1 + total_cross_interactions) / LN(11))
--   meaning: 10 mutual interactions → trust_strength ≈ 1.0
--
-- Canonical pair ordering enforced: merchant_a_id < merchant_b_id (UUID compare).
-- This halves the table size and simplifies bidirectional lookups.

CREATE TABLE IF NOT EXISTS public.merchant_trust_edges (
  merchant_a_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_b_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_count     integer      NOT NULL DEFAULT 0,
  successful_inquiries  integer      NOT NULL DEFAULT 0,
  trust_strength        numeric(5,4) NOT NULL DEFAULT 0 CHECK (trust_strength BETWEEN 0 AND 1),
  last_interaction_at   timestamptz,
  updated_at            timestamptz  NOT NULL DEFAULT now(),

  PRIMARY KEY (merchant_a_id, merchant_b_id),
  CONSTRAINT trust_edge_canonical CHECK (merchant_a_id < merchant_b_id),
  CONSTRAINT trust_edge_no_self   CHECK (merchant_a_id <> merchant_b_id)
);

-- Bidirectional lookup (both sides of the pair)
CREATE INDEX IF NOT EXISTS trust_edge_a_idx
  ON public.merchant_trust_edges (merchant_a_id, trust_strength DESC);

CREATE INDEX IF NOT EXISTS trust_edge_b_idx
  ON public.merchant_trust_edges (merchant_b_id, trust_strength DESC);

-- High-trust edges for social proof count
CREATE INDEX IF NOT EXISTS trust_edge_strength_idx
  ON public.merchant_trust_edges (trust_strength DESC)
  WHERE trust_strength >= 0.50;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  trusted_public_listings — materialized trust-first discovery view
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Pre-joined snapshot of published listings with trust + quality metadata.
-- Used for trust-first browse mode and low-latency "verified listings" feeds.
-- Refreshed CONCURRENTLY every 30 min (slot :25/:55 in pg_cron chain).
--
-- Inclusion criteria:
--   • status = 'published', is_public, moderation_status = 'approved'
--   • merchant NOT fraud-flagged (null trust score = new merchant = included)
--   • spam_penalty < 0.80 (near-certain spam excluded)
--
-- unique index on id is REQUIRED for REFRESH CONCURRENTLY.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.trusted_public_listings AS
SELECT
  l.id,
  l.type::text                                                   AS type,
  l.slug,
  l.title,
  l.short_description,
  l.cover_url,
  l.location_text,
  l.price_text,
  l.price_amount,
  l.is_featured,
  l.is_verified,
  l.province_id,
  l.district_id,
  l.category_id,
  l.contact_phone,
  l.owner_id,
  l.updated_at,
  COALESCE(mts.trust_score,       0)::numeric(5,1)  AS trust_score,
  COALESCE(mts.identity_verified, false)             AS merchant_verified,
  COALESCE(qs.quality_score,      0)::numeric(10,4) AS quality_score,
  COALESCE(qs.completeness_score, 0)::numeric(5,4)  AS completeness_score,
  COALESCE(qs.spam_penalty,       0)::numeric(5,4)  AS spam_penalty
FROM public.listings l
LEFT JOIN public.merchant_trust_scores mts ON mts.profile_id = l.owner_id
LEFT JOIN public.listing_quality_scores qs  ON qs.listing_id  = l.id
WHERE l.status            = 'published'
  AND l.is_public          = true
  AND l.moderation_status  = 'approved'
  AND COALESCE(mts.fraud_flag,   false) = false
  AND COALESCE(qs.spam_penalty,  0)    < 0.80;

-- Required unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS tpl_id_idx
  ON public.trusted_public_listings (id);

-- Trust-first browse: ordered by trust_score then quality_score
CREATE INDEX IF NOT EXISTS tpl_trust_quality_idx
  ON public.trusted_public_listings (trust_score DESC, quality_score DESC);

-- Province × category trust-first browse
CREATE INDEX IF NOT EXISTS tpl_province_trust_idx
  ON public.trusted_public_listings (province_id, trust_score DESC)
  WHERE province_id IS NOT NULL;

-- Verified merchants first
CREATE INDEX IF NOT EXISTS tpl_verified_idx
  ON public.trusted_public_listings (merchant_verified DESC, trust_score DESC)
  WHERE merchant_verified = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  refresh_listing_quality_scores() — OR REPLACE (extends 011)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Extends the 011 function to also populate completeness/media/text/content/spam
-- columns added in Section 1.  The engagement-based quality_score is unchanged.
--
-- SECURITY DEFINER required because listing_events has no public SELECT.
-- Runs at :11/:26/:41/:56 (existing cron from 011 — no new slot needed).

CREATE OR REPLACE FUNCTION public.refresh_listing_quality_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Engagement-based quality (existing logic from 011) ─────────────────────
  WITH engagement AS (
    SELECT
      listing_id,
      -- bounce: fraction of clicks with dwell < 10s
      COALESCE(
        COUNT(*) FILTER (WHERE event_type = 'click'
                               AND (metadata->>'duration_seconds')::numeric < 10) ::float
        / NULLIF(COUNT(*) FILTER (WHERE event_type = 'click'), 0),
        0
      )::numeric(5,4)  AS bounce_rate,
      -- avg dwell seconds
      COALESCE(
        AVG((metadata->>'duration_seconds')::numeric)
          FILTER (WHERE event_type = 'click'
                        AND (metadata->>'duration_seconds') IS NOT NULL),
        0
      )::numeric(8,2)  AS avg_dwell_seconds,
      -- inquiry-per-click rate
      COALESCE(
        COUNT(*) FILTER (WHERE event_type = 'inquiry')::float
        / NULLIF(COUNT(*) FILTER (WHERE event_type = 'click'), 0),
        0
      )::numeric(5,4)  AS inquiry_rate,
      -- save-per-click rate
      COALESCE(
        COUNT(*) FILTER (WHERE event_type = 'save')::float
        / NULLIF(COUNT(*) FILTER (WHERE event_type = 'click'), 0),
        0
      )::numeric(5,4)  AS save_rate
    FROM public.listing_events
    WHERE created_at >= now() - interval '7 days'
    GROUP BY listing_id
  ),
  -- ── Content-based quality (new in 019) ────────────────────────────────────
  content AS (
    SELECT
      l.id AS listing_id,
      -- completeness: weighted field coverage (0–1)
      (
        CASE WHEN l.title IS NOT NULL AND length(l.title) >= 10              THEN 0.20 ELSE 0 END
        + CASE WHEN l.description IS NOT NULL AND length(l.description) >= 50 THEN 0.25 ELSE 0 END
        + CASE WHEN l.price_amount IS NOT NULL AND l.price_amount > 0          THEN 0.20 ELSE 0 END
        + CASE WHEN l.cover_url IS NOT NULL                                     THEN 0.20 ELSE 0 END
        + CASE WHEN l.province_id IS NOT NULL                                   THEN 0.15 ELSE 0 END
      )::numeric(5,4)  AS completeness_score,
      -- media: cover presence
      CASE WHEN l.cover_url IS NOT NULL THEN 1.0 ELSE 0.0 END::numeric(5,4) AS media_score,
      -- text: description depth
      LEAST(1.0, length(COALESCE(l.description, ''))::float / 300.0)::numeric(5,4) AS text_score
    FROM public.listings l
    WHERE l.status = 'published'
      AND l.is_public = true
  ),
  -- ── Spam penalty from listing_authenticity (016) ──────────────────────────
  spam AS (
    SELECT listing_id, spam_score AS spam_penalty
    FROM public.listing_authenticity
  ),
  -- ── Join all sources ───────────────────────────────────────────────────────
  combined AS (
    SELECT
      c.listing_id,
      c.completeness_score,
      c.media_score,
      c.text_score,
      (c.completeness_score * 0.60 + c.text_score * 0.40)::numeric(5,4) AS content_score,
      COALESCE(s.spam_penalty, 0)::numeric(5,4)                          AS spam_penalty,
      COALESCE(e.bounce_rate,      0) AS bounce_rate,
      COALESCE(e.avg_dwell_seconds,0) AS avg_dwell_seconds,
      COALESCE(e.inquiry_rate,     0) AS inquiry_rate,
      COALESCE(e.save_rate,        0) AS save_rate,
      -- quality_score: engagement-based composite (unchanged contract for search)
      GREATEST(0, LEAST(1,
        COALESCE(e.inquiry_rate,0) * 0.45
        + COALESCE(e.save_rate,  0) * 0.25
        + CASE WHEN COALESCE(e.avg_dwell_seconds,0) >= 30 THEN 0.20 ELSE 0 END
        + GREATEST(0, 0.10 - COALESCE(e.bounce_rate,0) * 0.10)
        - COALESCE(s.spam_penalty, 0) * 0.30
      ))::numeric(10,4) AS quality_score
    FROM content c
    LEFT JOIN engagement e ON e.listing_id = c.listing_id
    LEFT JOIN spam s       ON s.listing_id  = c.listing_id
  )
  INSERT INTO public.listing_quality_scores (
    listing_id,
    bounce_rate, avg_dwell_seconds, inquiry_rate, save_rate,
    quality_score,
    completeness_score, media_score, text_score, content_score,
    spam_penalty, computed_at, updated_at
  )
  SELECT
    listing_id,
    bounce_rate, avg_dwell_seconds, inquiry_rate, save_rate,
    quality_score,
    completeness_score, media_score, text_score, content_score,
    spam_penalty, now(), now()
  FROM combined

  ON CONFLICT (listing_id) DO UPDATE SET
    bounce_rate         = EXCLUDED.bounce_rate,
    avg_dwell_seconds   = EXCLUDED.avg_dwell_seconds,
    inquiry_rate        = EXCLUDED.inquiry_rate,
    save_rate           = EXCLUDED.save_rate,
    quality_score       = EXCLUDED.quality_score,
    completeness_score  = EXCLUDED.completeness_score,
    media_score         = EXCLUDED.media_score,
    text_score          = EXCLUDED.text_score,
    content_score       = EXCLUDED.content_score,
    spam_penalty        = EXCLUDED.spam_penalty,
    computed_at         = EXCLUDED.computed_at,
    updated_at          = EXCLUDED.updated_at;

  -- Prune scores for deleted/unpublished listings
  DELETE FROM public.listing_quality_scores lqs
  WHERE NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = lqs.listing_id
      AND l.status = 'published'
      AND l.is_public = true
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8.  refresh_fraud_signals()  — SECURITY DEFINER
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Reads listing_events (no public SELECT) to detect rapid_repost and bulk_spam.
-- Reads phone_listing_stats (016) for phone_abuse.
-- Reads listing_authenticity (016) for duplicate_cluster.
-- Runs at :01/:31.

CREATE OR REPLACE FUNCTION public.refresh_fraud_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── rapid_repost: >5 new listings same province in 24 h ──────────────────
  INSERT INTO public.fraud_signals
    (profile_id, signal_type, signal_strength, evidence_json, detected_at)
  SELECT
    owner_id::uuid,
    'rapid_repost',
    LEAST(1.0, (count - 5.0) / 15.0)::numeric(5,4),  -- 20 posts → 1.0
    jsonb_build_object('listing_count_24h', count, 'province_id', province_id),
    now()
  FROM (
    SELECT owner_id, province_id, COUNT(*) AS count
    FROM public.listings
    WHERE created_at >= now() - interval '24 hours'
      AND province_id IS NOT NULL
    GROUP BY owner_id, province_id
    HAVING COUNT(*) > 5
  ) sub
  ON CONFLICT (profile_id, signal_type) DO UPDATE SET
    signal_strength = EXCLUDED.signal_strength,
    evidence_json   = EXCLUDED.evidence_json,
    detected_at     = EXCLUDED.detected_at,
    expires_at      = now() + interval '90 days';

  -- ── bulk_spam: >20 new listings in 7 days ────────────────────────────────
  INSERT INTO public.fraud_signals
    (profile_id, signal_type, signal_strength, evidence_json, detected_at)
  SELECT
    owner_id::uuid,
    'bulk_spam',
    LEAST(1.0, (count - 20.0) / 80.0)::numeric(5,4),  -- 100 → 1.0
    jsonb_build_object('listing_count_7d', count),
    now()
  FROM (
    SELECT owner_id, COUNT(*) AS count
    FROM public.listings
    WHERE created_at >= now() - interval '7 days'
    GROUP BY owner_id
    HAVING COUNT(*) > 20
  ) sub
  ON CONFLICT (profile_id, signal_type) DO UPDATE SET
    signal_strength = EXCLUDED.signal_strength,
    evidence_json   = EXCLUDED.evidence_json,
    detected_at     = EXCLUDED.detected_at,
    expires_at      = now() + interval '90 days';

  -- ── duplicate_cluster: >5 near-duplicates (from listing_authenticity) ────
  INSERT INTO public.fraud_signals
    (profile_id, signal_type, signal_strength, evidence_json, detected_at)
  SELECT
    l.owner_id::uuid,
    'duplicate_cluster',
    LEAST(1.0, (sub.dup_count - 5.0) / 20.0)::numeric(5,4),
    jsonb_build_object('duplicate_count', sub.dup_count),
    now()
  FROM (
    SELECT la.listing_id, SUM(la.duplicate_count) AS dup_count
    FROM public.listing_authenticity la
    WHERE la.is_duplicate = true
    GROUP BY la.listing_id
    HAVING SUM(la.duplicate_count) > 5
  ) sub
  JOIN public.listings l ON l.id = sub.listing_id
  ON CONFLICT (profile_id, signal_type) DO UPDATE SET
    signal_strength = EXCLUDED.signal_strength,
    evidence_json   = EXCLUDED.evidence_json,
    detected_at     = EXCLUDED.detected_at,
    expires_at      = now() + interval '90 days';

  -- ── phone_abuse: from phone_listing_stats (016) ───────────────────────────
  INSERT INTO public.fraud_signals
    (profile_id, signal_type, signal_strength, evidence_json, detected_at)
  SELECT
    l.owner_id::uuid,
    'phone_abuse',
    LEAST(1.0, pls.listing_count::float / 30.0)::numeric(5,4),
    jsonb_build_object('phone_listing_count', pls.listing_count, 'fraud_suspected', pls.fraud_suspected),
    now()
  FROM public.phone_listing_stats pls
  JOIN public.listings l ON l.contact_phone = pls.phone_number
    AND l.status = 'published'
  WHERE pls.fraud_suspected = true
  ON CONFLICT (profile_id, signal_type) DO UPDATE SET
    signal_strength = EXCLUDED.signal_strength,
    evidence_json   = EXCLUDED.evidence_json,
    detected_at     = EXCLUDED.detected_at,
    expires_at      = now() + interval '90 days';

  -- ── account_farming: account age < 7 days + >10 listings ─────────────────
  INSERT INTO public.fraud_signals
    (profile_id, signal_type, signal_strength, evidence_json, detected_at)
  SELECT
    l.owner_id::uuid,
    'account_farming',
    LEAST(1.0, (listing_count - 10.0) / 40.0)::numeric(5,4),
    jsonb_build_object('listing_count', listing_count, 'account_age_days', account_age_days),
    now()
  FROM (
    SELECT
      l.owner_id,
      COUNT(*)                                        AS listing_count,
      EXTRACT(epoch FROM now() - u.created_at) / 86400.0 AS account_age_days
    FROM public.listings l
    JOIN auth.users u ON u.id = l.owner_id
    WHERE l.created_at >= u.created_at + interval '0 seconds'
      AND l.created_at >= now() - interval '7 days'
    GROUP BY l.owner_id, u.created_at
    HAVING COUNT(*) > 10
      AND EXTRACT(epoch FROM now() - u.created_at) < 604800  -- < 7 days old
  ) sub
  ON CONFLICT (profile_id, signal_type) DO UPDATE SET
    signal_strength = EXCLUDED.signal_strength,
    evidence_json   = EXCLUDED.evidence_json,
    detected_at     = EXCLUDED.detected_at,
    expires_at      = now() + interval '90 days';

  -- Prune expired signals
  DELETE FROM public.fraud_signals WHERE expires_at < now();
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9.  refresh_trust_edges()  — SECURITY DEFINER
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Builds mutual-inquiry trust edges between authenticated merchants.
-- Evidence: profile A inquired at B's listings AND profile B inquired at A's
-- listings within the last 180 days.
--
-- Requires SECURITY DEFINER because listing_events has no public SELECT.
-- trust_strength = LEAST(1, LN(1 + total_cross_interactions) / LN(11))
-- Runs at :27/:57.

CREATE OR REPLACE FUNCTION public.refresh_trust_edges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchant_trust_edges (
    merchant_a_id, merchant_b_id,
    interaction_count, successful_inquiries,
    trust_strength, last_interaction_at, updated_at
  )
  WITH inquiry_pairs AS (
    -- (inquirer → seller) pairs from listing_events
    SELECT
      e.profile_id                                AS inquirer_id,
      l.owner_id                                  AS seller_id,
      COUNT(*)                                    AS inquiry_count,
      MAX(e.created_at)                           AS last_at
    FROM public.listing_events e
    JOIN public.listings l ON l.id = e.listing_id
    WHERE e.event_type   = 'inquiry'
      AND e.profile_id   IS NOT NULL
      AND e.profile_id   <> l.owner_id
      AND e.created_at   >= now() - interval '180 days'
    GROUP BY e.profile_id, l.owner_id
    HAVING COUNT(*) >= 1
  ),
  -- Only keep pairs where BOTH sides have inquired each other
  mutual AS (
    SELECT
      LEAST(a.inquirer_id, a.seller_id)::uuid    AS merchant_a,
      GREATEST(a.inquirer_id, a.seller_id)::uuid AS merchant_b,
      a.inquiry_count + b.inquiry_count          AS total_interactions,
      GREATEST(a.last_at, b.last_at)             AS last_interaction_at
    FROM inquiry_pairs a
    JOIN inquiry_pairs b
      ON b.inquirer_id = a.seller_id
      AND b.seller_id  = a.inquirer_id
    WHERE a.inquirer_id < a.seller_id  -- canonical pair; process each once
  )
  SELECT
    merchant_a,
    merchant_b,
    total_interactions,
    total_interactions,  -- all inquiry-based → all count as successful_inquiries
    LEAST(1.0, LN(1.0 + total_interactions::float) / LN(11.0))::numeric(5,4),
    last_interaction_at,
    now()
  FROM mutual
  WHERE total_interactions >= 2  -- require at least 2 total cross-interactions

  ON CONFLICT (merchant_a_id, merchant_b_id) DO UPDATE SET
    interaction_count    = EXCLUDED.interaction_count,
    successful_inquiries = EXCLUDED.successful_inquiries,
    trust_strength       = EXCLUDED.trust_strength,
    last_interaction_at  = EXCLUDED.last_interaction_at,
    updated_at           = EXCLUDED.updated_at;

  -- Prune stale low-strength edges (no activity in 180 days)
  DELETE FROM public.merchant_trust_edges
  WHERE last_interaction_at < now() - interval '180 days'
    AND trust_strength < 0.30;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10.  refresh_merchant_trust_scores() — OR REPLACE (extends 016)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Adds two new bonus components on top of the 016 base formula (0–100):
--
-- trust_edge_bonus  (+0–5):  LEAST(5, LN(1 + edge_count) × 2.0)
--   Social proof from mutual B2B engagement (merchant_trust_edges).
--
-- quality_bonus     (+0–5):  avg_quality_score × 5
--   Merchant's average listing quality (listing_quality_scores.quality_score).
--
-- fraud_flag also considers:
--   • fraud_signals with signal_strength ≥ 0.75 (in addition to 016 triggers)
--   • buyer_safety_reports ≥ 3 in last 30 days
--
-- Also emits to trust_events (score_computed) for audit trail.
--
-- SECURITY DEFINER required to read listing_events (for CTR/engagement inputs).
-- Existing cron runs at :08/:38 — no new slot needed.

CREATE OR REPLACE FUNCTION public.refresh_merchant_trust_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchant_trust_scores (
    profile_id,
    response_rate_7d, avg_response_hours, ctr_7d, active_listings, identity_verified,
    trust_score,
    duplicate_listing_count, risk_event_count_24h, phone_spam_flag, fraud_flag,
    days_since_last_listing,
    updated_at
  )
  WITH merchant_activity AS (
    SELECT
      l.owner_id,
      COUNT(*) FILTER (WHERE l.status = 'published' AND l.is_public = true)  AS active_count,
      EXTRACT(epoch FROM (now() - MAX(l.created_at))) / 86400.0              AS days_since_last
    FROM public.listings l
    WHERE l.created_at >= now() - interval '90 days'
    GROUP BY l.owner_id
  ),
  ctr_data AS (
    SELECT
      l.owner_id,
      COALESCE(AVG(cs.ctr_7d), 0)::numeric(8,6)       AS avg_ctr_7d
    FROM public.listing_ctr_stats cs
    JOIN public.listings l ON l.id = cs.listing_id
    GROUP BY l.owner_id
  ),
  response_data AS (
    SELECT
      mm.profile_id,
      COALESCE(mm.response_rate_7d,   0)::numeric(5,4) AS response_rate,
      COALESCE(mm.avg_response_hours, 48)::numeric(8,2) AS resp_hours
    FROM public.merchant_metrics mm
  ),
  identity_data AS (
    SELECT profile_id, verification_status = 'approved' AS is_verified
    FROM public.merchant_verifications
    WHERE verification_type = 'identity'
  ),
  dup_data AS (
    SELECT
      l.owner_id,
      COUNT(*) FILTER (WHERE la.is_duplicate AND la.updated_at >= now() - interval '7 days')
                            AS dup_count
    FROM public.listing_authenticity la
    JOIN public.listings l ON l.id = la.listing_id
    GROUP BY l.owner_id
  ),
  risk_data AS (
    SELECT profile_id, COUNT(*) AS risk_count_24h
    FROM public.risk_events
    WHERE created_at >= now() - interval '24 hours'
    GROUP BY profile_id
  ),
  phone_data AS (
    SELECT DISTINCT l.owner_id, pls.fraud_suspected AS phone_spam
    FROM public.phone_listing_stats pls
    JOIN public.listings l ON l.contact_phone = pls.phone_number
    WHERE pls.fraud_suspected = true
  ),
  -- NEW: trust edge count per merchant (019)
  edge_counts AS (
    SELECT profile_id, SUM(edge_count)::integer AS edge_count
    FROM (
      SELECT merchant_a_id AS profile_id, COUNT(*) AS edge_count
      FROM public.merchant_trust_edges
      WHERE trust_strength >= 0.30
      GROUP BY merchant_a_id
      UNION ALL
      SELECT merchant_b_id, COUNT(*) AS edge_count
      FROM public.merchant_trust_edges
      WHERE trust_strength >= 0.30
      GROUP BY merchant_b_id
    ) sub
    GROUP BY profile_id
  ),
  -- NEW: avg listing quality per merchant (019)
  quality_data AS (
    SELECT
      l.owner_id,
      AVG(qs.quality_score) AS avg_quality
    FROM public.listing_quality_scores qs
    JOIN public.listings l ON l.id = qs.listing_id
    WHERE l.status = 'published' AND l.is_public = true
    GROUP BY l.owner_id
  ),
  -- NEW: buyer safety report count per merchant in last 30 days (019)
  report_data AS (
    SELECT reported_profile_id AS profile_id, COUNT(*) AS report_count_30d
    FROM public.buyer_safety_reports
    WHERE created_at >= now() - interval '30 days'
      AND status IN ('pending','actioned')
      AND reported_profile_id IS NOT NULL
    GROUP BY reported_profile_id
  ),
  -- NEW: fraud signal strength per merchant (019)
  fraud_signal_data AS (
    SELECT profile_id, MAX(signal_strength) AS max_signal_strength
    FROM public.fraud_signals
    WHERE NOT resolved
    GROUP BY profile_id
  ),
  all_merchants AS (
    SELECT owner_id AS profile_id FROM merchant_activity
  ),
  scored AS (
    SELECT
      am.profile_id,
      COALESCE(rd.response_rate,    0)                 AS response_rate,
      COALESCE(rd.resp_hours,       48)                AS resp_hours,
      COALESCE(cd.avg_ctr_7d,       0)                 AS ctr_7d,
      COALESCE(ma.active_count,     0)                 AS active_listings,
      COALESCE(id.is_verified,      false)             AS identity_verified,
      COALESCE(dd.dup_count,        0)                 AS dup_count,
      COALESCE(rsk.risk_count_24h,  0)                 AS risk_count_24h,
      COALESCE(pd.phone_spam,       false)             AS phone_spam,
      COALESCE(ma.days_since_last,  999)               AS days_since_last,
      COALESCE(ec.edge_count,       0)                 AS edge_count,
      COALESCE(qd.avg_quality,      0)                 AS avg_quality,
      COALESCE(repd.report_count_30d, 0)               AS report_count_30d,
      COALESCE(fsd.max_signal_strength, 0)             AS max_signal_strength
    FROM all_merchants am
    LEFT JOIN response_data      rd   ON rd.profile_id  = am.profile_id
    LEFT JOIN ctr_data           cd   ON cd.owner_id    = am.profile_id
    LEFT JOIN merchant_activity  ma   ON ma.owner_id    = am.profile_id
    LEFT JOIN identity_data      id   ON id.profile_id  = am.profile_id
    LEFT JOIN dup_data           dd   ON dd.owner_id    = am.profile_id
    LEFT JOIN risk_data          rsk  ON rsk.profile_id = am.profile_id
    LEFT JOIN phone_data         pd   ON pd.owner_id    = am.profile_id
    LEFT JOIN edge_counts        ec   ON ec.profile_id  = am.profile_id
    LEFT JOIN quality_data       qd   ON qd.owner_id    = am.profile_id
    LEFT JOIN report_data        repd ON repd.profile_id = am.profile_id
    LEFT JOIN fraud_signal_data  fsd  ON fsd.profile_id  = am.profile_id
  )
  SELECT
    profile_id::uuid,
    response_rate,
    resp_hours,
    ctr_7d,
    active_listings,
    identity_verified,
    -- trust_score (0–100): base components + bonuses
    LEAST(100.0, ROUND((
      -- Response (0–30)
      LEAST(30.0, response_rate * 30.0)
      -- Speed (0–20)
      + LEAST(20.0, EXP(-resp_hours / 24.0) * 20.0)
      -- Engagement/CTR (0–20)
      + LEAST(20.0, LN(1.0 + ctr_7d * 100.0) / LN(101.0) * 20.0)
      -- Volume (0–20)
      + LEAST(20.0, (active_listings / 10.0) * 20.0)
      -- Identity verified (0–10)
      + CASE WHEN identity_verified THEN 10.0 ELSE 0.0 END
      -- Trust edge bonus (0–5) [NEW in 019]
      + LEAST(5.0, LN(1.0 + edge_count::float) * 2.0)
      -- Listing quality bonus (0–5) [NEW in 019]
      + avg_quality::float * 5.0
    )::numeric, 1)) AS trust_score,
    dup_count,
    risk_count_24h,
    phone_spam,
    -- fraud_flag (extended in 019)
    (dup_count > 5
      OR risk_count_24h > 3
      OR phone_spam
      OR max_signal_strength >= 0.75  -- NEW: fraud_signals threshold
      OR report_count_30d >= 3        -- NEW: safety report threshold
    )                                 AS fraud_flag,
    days_since_last::integer,
    now()
  FROM scored

  ON CONFLICT (profile_id) DO UPDATE SET
    response_rate_7d         = EXCLUDED.response_rate_7d,
    avg_response_hours       = EXCLUDED.avg_response_hours,
    ctr_7d                   = EXCLUDED.ctr_7d,
    active_listings          = EXCLUDED.active_listings,
    identity_verified        = EXCLUDED.identity_verified,
    trust_score              = EXCLUDED.trust_score,
    duplicate_listing_count  = EXCLUDED.duplicate_listing_count,
    risk_event_count_24h     = EXCLUDED.risk_event_count_24h,
    phone_spam_flag          = EXCLUDED.phone_spam_flag,
    fraud_flag               = EXCLUDED.fraud_flag,
    days_since_last_listing  = EXCLUDED.days_since_last_listing,
    updated_at               = EXCLUDED.updated_at;

  -- Audit: record score_computed events for merchants whose score changed > 5 pts
  INSERT INTO public.trust_events
    (profile_id, event_type, score_before, score_after, trigger_type, created_at)
  SELECT
    mts.profile_id,
    'score_computed',
    mts.trust_score,
    mts.trust_score,   -- after UPSERT the row is already updated; delta computed by generated col
    'refresh_merchant_trust_scores',
    now()
  FROM public.merchant_trust_scores mts
  WHERE mts.updated_at >= now() - interval '2 minutes'
  ON CONFLICT DO NOTHING;

  -- Audit: record fraud_flagged events for newly-flagged merchants
  INSERT INTO public.trust_events
    (profile_id, event_type, trigger_type, metadata, created_at)
  SELECT
    mts.profile_id,
    'fraud_flagged',
    'refresh_merchant_trust_scores',
    jsonb_build_object('trust_score', mts.trust_score),
    now()
  FROM public.merchant_trust_scores mts
  WHERE mts.fraud_flag = true
    AND mts.updated_at >= now() - interval '2 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.trust_events te
      WHERE te.profile_id  = mts.profile_id
        AND te.event_type  = 'fraud_flagged'
        AND te.created_at  >= now() - interval '6 hours'  -- dedup: 6h
    );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 11.  get_trusted_merchants_by_province()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Province-scoped trusted merchant lookup for Discovery Feeds V3.
-- Uses STABLE (not SECURITY DEFINER) since merchant_trust_scores and listings
-- both have public-readable RLS.
-- Called from regional-ops.server.ts via supabase.rpc().

CREATE OR REPLACE FUNCTION public.get_trusted_merchants_by_province(
  p_province_id integer,
  p_limit       integer DEFAULT 10
)
RETURNS TABLE (
  profile_id          uuid,
  trust_score         numeric,
  identity_verified   boolean,
  active_listings     integer,
  avg_response_hours  numeric,
  updated_at          timestamptz
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mts.profile_id,
    mts.trust_score,
    mts.identity_verified,
    mts.active_listings,
    mts.avg_response_hours,
    mts.updated_at
  FROM public.merchant_trust_scores mts
  WHERE NOT mts.fraud_flag
    AND mts.trust_score >= 60
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.owner_id    = mts.profile_id
        AND l.province_id = p_province_id
        AND l.status      = 'published'
        AND l.is_public   = true
      LIMIT 1
    )
  ORDER BY mts.trust_score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trusted_merchants_by_province TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12.  search_listings_hybrid() — OR REPLACE (wires trust boost + spam penalty)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Activates the trust ranking extension point from 016 Section 13:
--
-- Trust boost  (+0–0.05, graduated):
--   CASE WHEN trust_score ≥ 80 AND identity_verified
--        THEN 0.05 × LEAST(1, (trust_score − 80) / 20)
--        ELSE 0 END
--
-- Fraud exclusion:
--   AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
--   (merchants without a trust score entry — new accounts — pass through)
--
-- Spam penalty (−0–0.40 from spam_penalty column added in Section 1):
--   − COALESCE(qs.spam_penalty, 0) × 0.40
--
-- All other ranking factors are UNCHANGED from migration 011.
-- Function signature is identical — zero callsite changes required.

CREATE OR REPLACE FUNCTION search_listings_hybrid(
  q                    text        DEFAULT '',
  p_type               text        DEFAULT NULL,
  p_province_id        integer     DEFAULT NULL,
  p_district_id        integer     DEFAULT NULL,
  p_category_id        integer     DEFAULT NULL,
  p_price_min          numeric     DEFAULT NULL,
  p_price_max          numeric     DEFAULT NULL,
  p_area_min           numeric     DEFAULT NULL,
  p_area_max           numeric     DEFAULT NULL,
  p_limit              integer     DEFAULT 20,
  p_cursor_score       float4      DEFAULT NULL,
  p_cursor_updated_at  timestamptz DEFAULT NULL,
  p_cursor_id          uuid        DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  type              text,
  slug              text,
  title             text,
  short_description text,
  cover_url         text,
  location_text     text,
  price_text        text,
  price_amount      numeric,
  is_featured       boolean,
  is_verified       boolean,
  province_id       integer,
  district_id       integer,
  category_id       integer,
  contact_phone     text,
  updated_at        timestamptz,
  rank_score        float4
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  q_norm         text;
  tsq            tsquery;
  area_schema_id uuid;
BEGIN
  q_norm := normalize_vietnamese_text(q);

  IF q_norm <> '' THEN
    BEGIN
      tsq := websearch_to_tsquery('simple', q_norm);
    EXCEPTION WHEN others THEN
      tsq := NULL;
    END;
  END IF;

  IF p_area_min IS NOT NULL OR p_area_max IS NOT NULL THEN
    SELECT s.id INTO area_schema_id
    FROM   listing_attribute_schemas s
    WHERE  s.listing_type = 'land' AND s.key = 'area_m2'
    LIMIT  1;
  END IF;

  -- ── Browse-mode path (q = '') ──────────────────────────────────────────────

  IF q_norm = '' THEN
    RETURN QUERY
    WITH browse AS (
      SELECT
        l.id,
        l.type,
        l.slug,
        l.title,
        l.short_description,
        l.cover_url,
        l.location_text,
        l.price_text,
        l.price_amount,
        l.is_featured,
        l.is_verified,
        l.province_id,
        l.district_id,
        l.category_id,
        l.contact_phone,
        l.updated_at,
        (
          -- ── Static feature boosts ──────────────────────────────────────────
          CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
          + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

          -- ── Geo context boosts ─────────────────────────────────────────────
          + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
              THEN 0.20 ELSE 0.0 END
          + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
              THEN 0.15 ELSE 0.0 END
          + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
              THEN 0.10 ELSE 0.0 END

          -- ── Freshness: linear decay over 30 days ───────────────────────────
          + GREATEST(0.0, 0.05 * (
              1.0 - LEAST(
                EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
                1.0
              )
            ))

          -- ── CTR boost (impression-normalised, max +0.40) ──────────────────
          + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
              THEN LEAST(0.40, GREATEST(0.0,
                     COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
              ELSE 0.0
            END

          -- ── Quality boost (max +0.30) ──────────────────────────────────────
          + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

          -- ── Velocity boost: trending burst ratio (max +0.30) ──────────────
          + COALESCE(
              CASE WHEN ls.trending_score > 1.0
                THEN LEAST(0.30, (ls.trending_score::numeric - 1.0) * 0.20)
                ELSE 0.0
              END,
              0.0
            )

          -- ── Cold-start floor (max +0.25, decays over 7 days) ──────────────
          + CASE
              WHEN COALESCE(cs.impressions_7d, 0) < 50
                   AND EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0
              THEN 0.25 * GREATEST(0.0,
                     1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 604800.0)
              ELSE 0.0
            END

          -- ── Trust boost (max +0.05) — NEW in 019 ──────────────────────────
          -- Activated when merchant has trust_score ≥ 80 and is identity-verified.
          -- Graduated: 0 at score=80, +0.05 at score=100.
          + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
                      AND COALESCE(mts.identity_verified, false)
              THEN 0.05 * LEAST(1.0,
                     (COALESCE(mts.trust_score, 0)::float - 80.0) / 20.0)
              ELSE 0.0
            END

          -- ── Spam penalty (max −0.40) — NEW in 019 ─────────────────────────
          - COALESCE(qs.spam_penalty, 0)::numeric * 0.40
        )::float4 AS _rank

      FROM listings l
      LEFT JOIN public.listing_ctr_stats       cs  ON cs.listing_id  = l.id
      LEFT JOIN public.listing_quality_scores  qs  ON qs.listing_id  = l.id
      LEFT JOIN public.listing_scores          ls  ON ls.listing_id  = l.id
      LEFT JOIN public.merchant_trust_scores   mts ON mts.profile_id = l.owner_id

      WHERE
        l.is_public          = true
        AND l.moderation_status = 'approved'
        AND l.status            = 'published'
        -- ── Fraud exclusion — NEW in 019 ──────────────────────────────────────
        AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)
        AND (p_type        IS NULL OR l.type::text  = p_type)
        AND (p_province_id IS NULL OR l.province_id = p_province_id)
        AND (p_district_id IS NULL OR l.district_id = p_district_id)
        AND (p_category_id IS NULL OR l.category_id = p_category_id)
        AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
        AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)
        AND (
          area_schema_id IS NULL
          OR EXISTS (
            SELECT 1 FROM listing_attribute_values av
            WHERE  av.listing_id = l.id
            AND    av.schema_id  = area_schema_id
            AND    (p_area_min IS NULL OR av.value_number >= p_area_min)
            AND    (p_area_max IS NULL OR av.value_number <= p_area_max)
          )
        )
    )
    SELECT
      b.id,
      b.type::text,
      b.slug,
      b.title,
      b.short_description,
      b.cover_url,
      b.location_text,
      b.price_text,
      b.price_amount,
      b.is_featured,
      b.is_verified,
      b.province_id,
      b.district_id,
      b.category_id,
      b.contact_phone,
      b.updated_at,
      b._rank
    FROM browse b
    WHERE (
      p_cursor_score IS NULL
      OR b._rank < p_cursor_score
      OR (b._rank = p_cursor_score AND b.updated_at < p_cursor_updated_at)
      OR (b._rank = p_cursor_score AND b.updated_at = p_cursor_updated_at
          AND b.id < p_cursor_id)
    )
    ORDER BY b._rank DESC, b.updated_at DESC, b.id DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  -- ── Scored search path (q ≠ '') ───────────────────────────────────────────

  RETURN QUERY
  WITH scored AS (
    SELECT
      l.id,
      l.type,
      l.slug,
      l.title,
      l.short_description,
      l.cover_url,
      l.location_text,
      l.price_text,
      l.price_amount,
      l.is_featured,
      l.is_verified,
      l.province_id,
      l.district_id,
      l.category_id,
      l.contact_phone,
      l.updated_at,
      (
        -- ── Text relevance signals (dominant, up to ~6.0) ──────────────────
        CASE
          WHEN l.title_normalized = q_norm                         THEN 2.0
          WHEN length(q_norm) >= 3
               AND l.title_normalized LIKE (q_norm || '%')         THEN 1.0
          ELSE 0.0
        END
        + CASE WHEN tsq IS NOT NULL
            THEN ts_rank(l.search_vector, tsq, 1) * 2.0
            ELSE 0.0
          END
        + GREATEST(0.0, similarity(l.title_normalized, q_norm) * 0.8)
        + GREATEST(0.0,
            COALESCE(similarity(l.short_description_normalized, q_norm), 0.0) * 0.2)

        -- ── Feature boosts ─────────────────────────────────────────────────
        + CASE WHEN l.is_featured THEN 0.30 ELSE 0.0 END
        + CASE WHEN l.is_verified THEN 0.10 ELSE 0.0 END

        -- ── Geo context boosts ─────────────────────────────────────────────
        + CASE WHEN p_province_id IS NOT NULL AND l.province_id = p_province_id
            THEN 0.20 ELSE 0.0 END
        + CASE WHEN p_district_id IS NOT NULL AND l.district_id = p_district_id
            THEN 0.15 ELSE 0.0 END
        + CASE WHEN p_category_id IS NOT NULL AND l.category_id = p_category_id
            THEN 0.10 ELSE 0.0 END

        -- ── Freshness ─────────────────────────────────────────────────────
        + GREATEST(0.0, 0.05 * (
            1.0 - LEAST(
              EXTRACT(epoch FROM (now() - l.updated_at)) / 2592000.0,
              1.0
            )
          ))

        -- ── CTR boost (max +0.40) ──────────────────────────────────────────
        + CASE WHEN COALESCE(cs.impressions_7d, 0) >= 50
            THEN LEAST(0.40, GREATEST(0.0,
                   COALESCE(cs.ctr_7d::numeric, 0) - 0.03) * 5.0)
            ELSE 0.0
          END

        -- ── Quality boost (max +0.30) ──────────────────────────────────────
        + COALESCE(LEAST(0.30, qs.quality_score::numeric * 0.30), 0.0)

        -- ── Velocity boost (max +0.30) ─────────────────────────────────────
        + COALESCE(
            CASE WHEN ls.trending_score > 1.0
              THEN LEAST(0.30, (ls.trending_score::numeric - 1.0) * 0.20)
              ELSE 0.0
            END,
            0.0
          )

        -- ── Cold-start floor (max +0.25, decays over 7 days) ──────────────
        + CASE
            WHEN COALESCE(cs.impressions_7d, 0) < 50
                 AND EXTRACT(epoch FROM (now() - l.updated_at)) < 604800.0
            THEN 0.25 * GREATEST(0.0,
                   1.0 - EXTRACT(epoch FROM (now() - l.updated_at)) / 604800.0)
            ELSE 0.0
          END

        -- ── Trust boost (max +0.05) — NEW in 019 ──────────────────────────
        + CASE WHEN COALESCE(mts.trust_score, 0) >= 80
                    AND COALESCE(mts.identity_verified, false)
            THEN 0.05 * LEAST(1.0,
                   (COALESCE(mts.trust_score, 0)::float - 80.0) / 20.0)
            ELSE 0.0
          END

        -- ── Spam penalty (max −0.40) — NEW in 019 ─────────────────────────
        - COALESCE(qs.spam_penalty, 0)::numeric * 0.40
      )::float4 AS _rank

    FROM listings l
    LEFT JOIN public.listing_ctr_stats       cs  ON cs.listing_id  = l.id
    LEFT JOIN public.listing_quality_scores  qs  ON qs.listing_id  = l.id
    LEFT JOIN public.listing_scores          ls  ON ls.listing_id  = l.id
    LEFT JOIN public.merchant_trust_scores   mts ON mts.profile_id = l.owner_id

    WHERE
      l.is_public          = true
      AND l.moderation_status = 'approved'
      AND l.status            = 'published'
      -- ── Fraud exclusion — NEW in 019 ──────────────────────────────────────
      AND (mts.profile_id IS NULL OR NOT mts.fraud_flag)

      AND (p_type        IS NULL OR l.type::text  = p_type)
      AND (p_province_id IS NULL OR l.province_id = p_province_id)
      AND (p_district_id IS NULL OR l.district_id = p_district_id)
      AND (p_category_id IS NULL OR l.category_id = p_category_id)
      AND (p_price_min   IS NULL OR l.price_amount >= p_price_min)
      AND (p_price_max   IS NULL OR l.price_amount <= p_price_max)

      AND (
        (tsq IS NOT NULL AND l.search_vector @@ tsq)
        OR (length(q_norm) >= 3 AND l.title_normalized LIKE (q_norm || '%'))
        OR similarity(l.title_normalized, q_norm) > 0.20
      )

      AND (
        area_schema_id IS NULL
        OR EXISTS (
          SELECT 1 FROM listing_attribute_values av
          WHERE  av.listing_id = l.id
          AND    av.schema_id  = area_schema_id
          AND    (p_area_min IS NULL OR av.value_number >= p_area_min)
          AND    (p_area_max IS NULL OR av.value_number <= p_area_max)
        )
      )
  )
  SELECT
    s.id,
    s.type::text,
    s.slug,
    s.title,
    s.short_description,
    s.cover_url,
    s.location_text,
    s.price_text,
    s.price_amount,
    s.is_featured,
    s.is_verified,
    s.province_id,
    s.district_id,
    s.category_id,
    s.contact_phone,
    s.updated_at,
    s._rank
  FROM scored s
  WHERE (
    p_cursor_score IS NULL
    OR s._rank < p_cursor_score
    OR (s._rank = p_cursor_score AND s.updated_at < p_cursor_updated_at)
    OR (s._rank = p_cursor_score AND s.updated_at = p_cursor_updated_at
        AND s.id < p_cursor_id)
  )
  ORDER BY s._rank DESC, s.updated_at DESC, s.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_listings_hybrid TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 13.  pg_cron — Trust Quality pipeline
-- ══════════════════════════════════════════════════════════════════════════════
--
-- New slots (:01, :25, :27 — confirmed non-conflicting with full 25-slot chain).
-- OR REPLACE functions (quality scores, trust scores) run on existing slots.

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE command LIKE '%refresh_fraud_signals%'
   OR command LIKE '%refresh_trust_edges%'
   OR command LIKE '%trusted_public_listings%';

SELECT cron.schedule('refresh_fraud_signals',
  '1-59/30 * * * *',
  $$SELECT public.refresh_fraud_signals()$$);

SELECT cron.schedule('refresh_trust_edges',
  '27-59/30 * * * *',
  $$SELECT public.refresh_trust_edges()$$);

-- REFRESH CONCURRENTLY requires a unique index — created in Section 6.
SELECT cron.schedule('refresh_trusted_listings_view',
  '25-59/30 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.trusted_public_listings$$);

-- Daily prune: trust_events older than 1 year
SELECT cron.schedule('prune_trust_events',
  '0 3 * * *',
  $$DELETE FROM public.trust_events WHERE created_at < now() - interval '1 year'$$);

-- ══════════════════════════════════════════════════════════════════════════════
-- 14.  Row-level security
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.fraud_signals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_safety_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_trust_edges     ENABLE ROW LEVEL SECURITY;

-- ── fraud_signals: owner reads own signals, admins read all ──────────────────
-- (no public feed — fraud signal details should not be exposed to bad actors)

DROP POLICY IF EXISTS "fraud_signals_owner_read"  ON public.fraud_signals;
CREATE POLICY "fraud_signals_owner_read" ON public.fraud_signals
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

-- ── trust_events: owner reads own audit trail ────────────────────────────────

DROP POLICY IF EXISTS "trust_events_owner_read"   ON public.trust_events;
CREATE POLICY "trust_events_owner_read" ON public.trust_events
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

-- ── buyer_safety_reports: reporters read own submissions ────────────────────

DROP POLICY IF EXISTS "safety_reports_reporter_read" ON public.buyer_safety_reports;
CREATE POLICY "safety_reports_reporter_read" ON public.buyer_safety_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "safety_reports_insert" ON public.buyer_safety_reports;
CREATE POLICY "safety_reports_insert" ON public.buyer_safety_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

-- ── merchant_trust_edges: public read (aggregated, non-sensitive) ────────────

DROP POLICY IF EXISTS "trust_edges_public_read"   ON public.merchant_trust_edges;
CREATE POLICY "trust_edges_public_read" ON public.merchant_trust_edges
  FOR SELECT TO anon, authenticated USING (true);

-- trusted_public_listings: materialized view — no RLS needed (pre-filtered)
-- Supabase does not enforce RLS on materialized views; security enforced at build time.

-- ══════════════════════════════════════════════════════════════════════════════
-- END 019_trust_quality.sql
-- ══════════════════════════════════════════════════════════════════════════════
