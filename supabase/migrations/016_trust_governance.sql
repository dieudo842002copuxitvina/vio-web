-- ── 016_trust_governance.sql ─────────────────────────────────────────────────
-- Week 2.9: Trust & Governance Engine.
--
-- Lightweight marketplace trust infrastructure — pure PostgreSQL, no AI/ML,
-- no external fraud services, no realtime pipelines.
--
-- Tables:
--   • merchant_trust_scores    — composite trust/fraud/freshness scoring
--   • listing_authenticity     — duplicate detection + spam scoring per listing
--   • phone_listing_stats      — per-phone aggregates for spam detection
--   • moderation_queue         — risk-ranked review queue with workflow states
--   • public.reports           — EXTENDED (weighted + anti-abuse columns added)
--   • merchant_verifications   — KYC-lite verification state machine
--   • risk_events              — suspicious activity log
--
-- Aggregation functions (pg_cron :00/:30 and :05/:35):
--   • refresh_merchant_trust_scores()    — SECURITY DEFINER
--   • refresh_listing_authenticity()     — SECURITY DEFINER
--   • refresh_phone_listing_stats()
--
-- Search ranking extension:
--   • search_listings_hybrid() is NOT yet wired to trust scores.
--     Extension point documented in Section 9 — implementation deferred to
--     Week 3.x after trust scores have had time to stabilise.
--
-- Depends on: migrations 001–015
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE / DROP IF EXISTS throughout.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  merchant_trust_scores
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Composite scoring (0–100):
--   response_score  (0–30) = response_rate × 30
--   speed_score     (0–20) = EXP(-avg_response_hours / 24) × 20  (decay over 24h)
--   engagement_score(0–20) = LN(1 + ctr_7d×100) / LN(101) × 20
--   volume_score    (0–20) = LEAST(1, active_listings / 10) × 20
--   verified_score  (0–10) = 10 when identity_verified, else 0
--
-- fraud_flag is raised when:
--   • duplicate_listing_count > 5 in 7 days
--   • risk_events in last 24h > 3
--   • phone is flagged as spam

CREATE TABLE IF NOT EXISTS public.merchant_trust_scores (
  profile_id             uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Component scores (raw, pre-weighted)
  response_rate_7d       numeric(5,4) NOT NULL DEFAULT 0,
  avg_response_hours     numeric(8,2) NOT NULL DEFAULT 0,
  ctr_7d                 numeric(8,6) NOT NULL DEFAULT 0,
  active_listings        integer      NOT NULL DEFAULT 0,
  identity_verified      boolean      NOT NULL DEFAULT false,

  -- Composite trust score (0–100)
  trust_score            numeric(5,1) NOT NULL DEFAULT 0,

  -- Fraud/risk signals
  duplicate_listing_count integer     NOT NULL DEFAULT 0,
  risk_event_count_24h    integer     NOT NULL DEFAULT 0,
  phone_spam_flag         boolean      NOT NULL DEFAULT false,
  fraud_flag              boolean      NOT NULL DEFAULT false,

  -- Freshness
  days_since_last_listing integer     NOT NULL DEFAULT 999,

  updated_at             timestamptz  NOT NULL DEFAULT now()
);

-- Lookup by trust tier (for search ranking extension point)
CREATE INDEX IF NOT EXISTS merchant_trust_score_idx
  ON public.merchant_trust_scores (trust_score DESC)
  WHERE NOT fraud_flag;

-- Fast fraud lookup
CREATE INDEX IF NOT EXISTS merchant_trust_fraud_idx
  ON public.merchant_trust_scores (profile_id)
  WHERE fraud_flag = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  listing_authenticity
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Per-listing spam / duplicate scoring.
--
-- duplicate_score  = log-normalised near-duplicate count in last 30 days
--                    (same owner + same province + title similarity detected
--                    via trigram overlap on title — pg_trgm extension required)
-- spam_score       = weighted sum of flags (0–1)
-- authenticity_score = 1 - MAX(duplicate_score, spam_score)
--
-- Flags:
--   • is_duplicate        — strong duplicate (score ≥ 0.80)
--   • is_suspected_spam   — spam_score ≥ 0.60
--   • manual_override     — human reviewer override; blocks automatic updates

CREATE TABLE IF NOT EXISTS public.listing_authenticity (
  listing_id            uuid        PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,

  duplicate_score       numeric(5,4) NOT NULL DEFAULT 0,
  spam_score            numeric(5,4) NOT NULL DEFAULT 0,
  authenticity_score    numeric(5,4) NOT NULL DEFAULT 1,  -- 1 = fully authentic

  -- Near-duplicate reference (most similar listing)
  nearest_duplicate_id  uuid        REFERENCES public.listings(id) ON DELETE SET NULL,
  duplicate_count       integer      NOT NULL DEFAULT 0,

  -- Flag summary
  is_duplicate          boolean      NOT NULL DEFAULT false,
  is_suspected_spam     boolean      NOT NULL DEFAULT false,

  -- Human reviewer can lock a decision
  manual_override       boolean      NOT NULL DEFAULT false,
  override_decision     text         CHECK (override_decision IN ('authentic','duplicate','spam')),
  override_by           uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  override_at           timestamptz,

  updated_at            timestamptz  NOT NULL DEFAULT now()
);

-- Spam/duplicate queue feed (used by moderation_queue backfill)
CREATE INDEX IF NOT EXISTS listing_authenticity_flagged_idx
  ON public.listing_authenticity (listing_id)
  WHERE is_duplicate OR is_suspected_spam;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  phone_listing_stats
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Aggregated per-phone number to detect:
--   • Spam rings operating across multiple accounts
--   • Abnormal listing velocity (> 10 listings / 7 days from one phone)
--   • Province spread anomaly (> 5 distinct provinces in 30 days)

CREATE TABLE IF NOT EXISTS public.phone_listing_stats (
  phone_normalized      text        PRIMARY KEY,  -- E.164 stripped of + and spaces

  total_listings        integer      NOT NULL DEFAULT 0,
  listings_7d           integer      NOT NULL DEFAULT 0,
  listings_30d          integer      NOT NULL DEFAULT 0,
  distinct_owners       integer      NOT NULL DEFAULT 0,  -- # unique profile_ids using this phone
  province_count_30d    integer      NOT NULL DEFAULT 0,

  is_spam_phone         boolean      NOT NULL DEFAULT false,

  updated_at            timestamptz  NOT NULL DEFAULT now()
);

-- Fast spam-phone lookup (join from listings.contact_phone)
CREATE INDEX IF NOT EXISTS phone_spam_idx
  ON public.phone_listing_stats (phone_normalized)
  WHERE is_spam_phone = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  moderation_queue
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Items enter automatically when:
--   • listing_authenticity.is_duplicate OR is_suspected_spam is set
--   • risk_events insert with severity ≥ 'medium'
--   • reports table accumulates ≥ 3 reports for same target
--
-- Risk score = 0–100 derived from input signals (not re-computed after assignment).

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id                    bigserial   PRIMARY KEY,

  -- What is being reviewed
  target_type           text        NOT NULL CHECK (target_type IN ('listing','profile','phone')),
  target_id             text        NOT NULL,   -- uuid or phone_normalized

  -- Risk signals at time of entry
  risk_score            numeric(5,1) NOT NULL DEFAULT 0,
  risk_reasons          text[]       NOT NULL DEFAULT '{}',

  -- Workflow state
  status                text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','assigned','resolved','dismissed')),
  assigned_to           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at           timestamptz,
  resolution            text        CHECK (resolution IN ('no_action','warn','suppress','ban')),
  resolution_note       text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Pending items ordered by risk (moderator inbox)
CREATE INDEX IF NOT EXISTS moderation_queue_pending_idx
  ON public.moderation_queue (risk_score DESC, created_at DESC)
  WHERE status = 'pending';

-- Lookup by target
CREATE INDEX IF NOT EXISTS moderation_queue_target_idx
  ON public.moderation_queue (target_type, target_id, status);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  Extend public.reports
-- ══════════════════════════════════════════════════════════════════════════════
--
-- reports is assumed to already exist (created in an earlier migration).
-- We add:
--   • weight           — reporter credibility weight (0–1); new reporters = 0.5
--   • is_anti_abuse    — flag when the reporter themselves is high-risk
--   • weighted_count   — maintained by trigger on INSERT/UPDATE

DO $$
BEGIN
  -- weight
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'weight'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN weight numeric(4,3) NOT NULL DEFAULT 0.5;
  END IF;

  -- is_anti_abuse
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'is_anti_abuse'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN is_anti_abuse boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  merchant_verifications
-- ══════════════════════════════════════════════════════════════════════════════
--
-- KYC-lite verification state machine.
-- States: unverified → pending → verified | rejected
-- verification_type: 'phone' | 'id_card' | 'business_license'
--
-- Documents are stored as signed URLs in metadata JSONB (not in this table).
-- metadata keys: { doc_url, doc_type, expiry_date, reviewer_note }

CREATE TABLE IF NOT EXISTS public.merchant_verifications (
  id                    bigserial    PRIMARY KEY,
  profile_id            uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type     text         NOT NULL CHECK (verification_type IN ('phone','id_card','business_license')),

  state                 text         NOT NULL DEFAULT 'pending'
                          CHECK (state IN ('pending','verified','rejected')),

  metadata              jsonb        NOT NULL DEFAULT '{}',

  submitted_at          timestamptz  NOT NULL DEFAULT now(),
  reviewed_at           timestamptz,
  reviewed_by           uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason      text,

  UNIQUE (profile_id, verification_type)
);

-- Pending verifications inbox
CREATE INDEX IF NOT EXISTS merchant_verifications_pending_idx
  ON public.merchant_verifications (submitted_at ASC)
  WHERE state = 'pending';

-- Profile lookup
CREATE INDEX IF NOT EXISTS merchant_verifications_profile_idx
  ON public.merchant_verifications (profile_id, state);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  risk_events
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Immutable append-only log of suspicious activity.
--
-- event_type examples:
--   geo_mismatch       — listing province ≠ phone prefix province
--   duplicate_burst    — ≥3 near-duplicate listings in < 1h
--   rapid_repost       — same listing re-created after deletion within 24h
--   multi_account      — same phone on ≥2 distinct profile_ids
--   mass_inquiry       — ≥20 inquiries sent from same session in 1h
--
-- severity: 'low' | 'medium' | 'high'
-- Entries with severity ≥ 'medium' auto-enqueue to moderation_queue (via function).

CREATE TABLE IF NOT EXISTS public.risk_events (
  id            bigserial    PRIMARY KEY,
  event_type    text         NOT NULL,
  severity      text         NOT NULL DEFAULT 'low'
                  CHECK (severity IN ('low','medium','high')),
  actor_id      uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type   text         CHECK (target_type IN ('listing','profile','phone','session')),
  target_id     text,
  metadata      jsonb        NOT NULL DEFAULT '{}',
  created_at    timestamptz  NOT NULL DEFAULT now()
);

-- Recent high-risk events (fraud dashboard feed)
CREATE INDEX IF NOT EXISTS risk_events_severity_idx
  ON public.risk_events (created_at DESC, severity)
  WHERE severity IN ('medium','high');

-- Per-actor event count (used by refresh_merchant_trust_scores CTE)
CREATE INDEX IF NOT EXISTS risk_events_actor_idx
  ON public.risk_events (actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

-- Prune partition helper: old low-severity events are cheap to delete
CREATE INDEX IF NOT EXISTS risk_events_prune_idx
  ON public.risk_events (created_at)
  WHERE severity = 'low';

-- ══════════════════════════════════════════════════════════════════════════════
-- 8.  refresh_phone_listing_stats()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Normalises phone numbers (strip +84/0 prefix, keep digits) and aggregates
-- listing counts + owner counts per phone.  Flags a phone as spam when:
--   listings_7d > 10  OR  distinct_owners > 1  OR  province_count_30d > 5

CREATE OR REPLACE FUNCTION public.refresh_phone_listing_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.phone_listing_stats (
    phone_normalized,
    total_listings,
    listings_7d,
    listings_30d,
    distinct_owners,
    province_count_30d,
    is_spam_phone,
    updated_at
  )
  SELECT
    -- Normalise: remove leading +84 or 0, keep only digits
    REGEXP_REPLACE(
      REGEXP_REPLACE(contact_phone, E'^\\+84', '0'),
      E'[^0-9]', '', 'g'
    )                                                          AS phone_normalized,

    COUNT(*)                                                   AS total_listings,

    COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')   AS listings_7d,
    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')  AS listings_30d,

    COUNT(DISTINCT owner_id)                                           AS distinct_owners,

    COUNT(DISTINCT province_id)
      FILTER (WHERE created_at >= now() - interval '30 days')         AS province_count_30d,

    -- Spam heuristic
    (
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') > 10
      OR COUNT(DISTINCT owner_id) > 1
      OR COUNT(DISTINCT province_id) FILTER (WHERE created_at >= now() - interval '30 days') > 5
    )                                                                  AS is_spam_phone,

    now()                                                              AS updated_at

  FROM public.listings
  WHERE contact_phone IS NOT NULL
    AND contact_phone <> ''
  GROUP BY phone_normalized

  ON CONFLICT (phone_normalized) DO UPDATE SET
    total_listings     = EXCLUDED.total_listings,
    listings_7d        = EXCLUDED.listings_7d,
    listings_30d       = EXCLUDED.listings_30d,
    distinct_owners    = EXCLUDED.distinct_owners,
    province_count_30d = EXCLUDED.province_count_30d,
    is_spam_phone      = EXCLUDED.is_spam_phone,
    updated_at         = EXCLUDED.updated_at;

  -- Prune phones that no longer have any listings
  DELETE FROM public.phone_listing_stats
  WHERE phone_normalized NOT IN (
    SELECT DISTINCT REGEXP_REPLACE(
      REGEXP_REPLACE(contact_phone, E'^\\+84', '0'),
      E'[^0-9]', '', 'g'
    )
    FROM public.listings
    WHERE contact_phone IS NOT NULL AND contact_phone <> ''
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9.  refresh_listing_authenticity()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Detects near-duplicate listings using trigram similarity on title.
-- Requires pg_trgm extension (enabled in Supabase by default).
--
-- Duplicate score formula:
--   dup_count  = number of listings with same owner + same province +
--                similarity(title, candidate.title) > 0.72  (within 30 days)
--   dup_score  = LEAST(1, LN(1 + dup_count) / LN(6))   (normalised: 5 dupes → 1.0)
--
-- Spam score formula (additive flags, each 0.25):
--   +0.25 if phone_spam_flag
--   +0.25 if listing_7d velocity > 5 from same owner
--   +0.25 if contact_phone IS NULL
--   +0.25 if title length < 20 chars (thin listing)
--
-- Skip listings with manual_override = true.
-- Only process listings from last 90 days to bound runtime.

CREATE OR REPLACE FUNCTION public.refresh_listing_authenticity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure pg_trgm is available
  CREATE EXTENSION IF NOT EXISTS pg_trgm;

  INSERT INTO public.listing_authenticity (
    listing_id,
    duplicate_score,
    spam_score,
    authenticity_score,
    nearest_duplicate_id,
    duplicate_count,
    is_duplicate,
    is_suspected_spam,
    updated_at
  )
  WITH recent_listings AS (
    SELECT
      l.id,
      l.owner_id,
      l.province_id,
      l.title,
      l.contact_phone,
      l.created_at,
      -- Phone spam flag join
      COALESCE(p.is_spam_phone, false)  AS phone_spam,
      -- Owner velocity: listings created in last 7 days by same owner
      COUNT(*) OVER (
        PARTITION BY l.owner_id
        ORDER BY l.created_at DESC
        RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
      )                                  AS owner_velocity_7d
    FROM public.listings l
    LEFT JOIN public.phone_listing_stats p
      ON REGEXP_REPLACE(REGEXP_REPLACE(l.contact_phone, E'^\\+84', '0'), E'[^0-9]', '', 'g')
         = p.phone_normalized
    WHERE l.created_at >= now() - interval '90 days'
      AND l.moderation_status != 'removed'
  ),
  dup_pairs AS (
    -- Self-join on same owner + same province + high title similarity
    SELECT
      a.id   AS listing_id,
      b.id   AS candidate_id,
      similarity(a.title, b.title) AS sim
    FROM recent_listings a
    JOIN recent_listings b
      ON a.owner_id   = b.owner_id
      AND a.province_id = b.province_id
      AND a.id        <> b.id
      AND similarity(a.title, b.title) > 0.72
      AND b.created_at BETWEEN a.created_at - interval '30 days'
                           AND a.created_at + interval '30 days'
  ),
  dup_stats AS (
    SELECT
      listing_id,
      COUNT(*)                                            AS dup_count,
      -- Pick nearest duplicate (highest similarity)
      (ARRAY_AGG(candidate_id ORDER BY sim DESC))[1]     AS nearest_dup_id
    FROM dup_pairs
    GROUP BY listing_id
  ),
  scored AS (
    SELECT
      r.id                                                              AS listing_id,

      -- Duplicate score (0–1)
      LEAST(1.0, LN(1 + COALESCE(d.dup_count, 0)::numeric) / LN(6))  AS dup_score,

      -- Spam score (additive flags, each 0.25, max 1.0)
      LEAST(1.0,
        (CASE WHEN r.phone_spam               THEN 0.25 ELSE 0 END)
      + (CASE WHEN r.owner_velocity_7d > 5   THEN 0.25 ELSE 0 END)
      + (CASE WHEN r.contact_phone IS NULL    THEN 0.25 ELSE 0 END)
      + (CASE WHEN LENGTH(r.title) < 20       THEN 0.25 ELSE 0 END)
      )                                                                 AS spam_score,

      COALESCE(d.dup_count, 0)                                         AS dup_count,
      d.nearest_dup_id
    FROM recent_listings r
    LEFT JOIN dup_stats d ON d.listing_id = r.id
  )
  SELECT
    listing_id,
    dup_score                                       AS duplicate_score,
    spam_score,
    GREATEST(0, 1.0 - GREATEST(dup_score, spam_score))  AS authenticity_score,
    nearest_dup_id                                  AS nearest_duplicate_id,
    dup_count                                       AS duplicate_count,
    dup_score  >= 0.80                              AS is_duplicate,
    spam_score >= 0.60                              AS is_suspected_spam,
    now()                                           AS updated_at
  FROM scored

  ON CONFLICT (listing_id) DO UPDATE SET
    duplicate_score      = EXCLUDED.duplicate_score,
    spam_score           = EXCLUDED.spam_score,
    authenticity_score   = EXCLUDED.authenticity_score,
    nearest_duplicate_id = EXCLUDED.nearest_duplicate_id,
    duplicate_count      = EXCLUDED.duplicate_count,
    is_duplicate         = EXCLUDED.is_duplicate,
    is_suspected_spam    = EXCLUDED.is_suspected_spam,
    updated_at           = EXCLUDED.updated_at
  WHERE NOT listing_authenticity.manual_override;  -- never overwrite human decisions

  -- Auto-enqueue medium+ risk items to moderation_queue
  INSERT INTO public.moderation_queue (target_type, target_id, risk_score, risk_reasons)
  SELECT
    'listing',
    la.listing_id::text,
    ROUND((GREATEST(la.duplicate_score, la.spam_score) * 100)::numeric, 1),
    ARRAY_REMOVE(ARRAY[
      CASE WHEN la.is_duplicate       THEN 'duplicate'  END,
      CASE WHEN la.is_suspected_spam  THEN 'spam'       END
    ], NULL)
  FROM public.listing_authenticity la
  WHERE (la.is_duplicate OR la.is_suspected_spam)
    AND la.updated_at >= now() - interval '5 minutes'  -- only newly flagged
    AND NOT EXISTS (
      SELECT 1 FROM public.moderation_queue mq
      WHERE mq.target_type = 'listing'
        AND mq.target_id   = la.listing_id::text
        AND mq.status IN ('pending', 'assigned')
    )
  ON CONFLICT DO NOTHING;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10.  refresh_merchant_trust_scores()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Reads: merchant_metrics, merchant_verifications, phone_listing_stats,
--        risk_events, listing_authenticity (all non-privileged tables).
-- SECURITY DEFINER not required here — no listing_events reads.
--
-- Trust score formula (0–100):
--   response_score   = LEAST(30, response_rate_7d × 30)
--   speed_score      = LEAST(20, EXP(-avg_response_hours / 24.0) × 20)
--   engagement_score = LEAST(20, LN(1 + ctr_7d×100) / LN(101) × 20)
--   volume_score     = LEAST(20, (active_listings::float / 10) × 20)
--   verified_score   = 10 if identity_verified else 0
--
-- Fraud flag is raised when ANY of:
--   • duplicate_listing_count > 5
--   • risk_event_count_24h    > 3
--   • phone_spam_flag = true

CREATE OR REPLACE FUNCTION public.refresh_merchant_trust_scores()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchant_trust_scores (
    profile_id,
    response_rate_7d,
    avg_response_hours,
    ctr_7d,
    active_listings,
    identity_verified,
    trust_score,
    duplicate_listing_count,
    risk_event_count_24h,
    phone_spam_flag,
    fraud_flag,
    days_since_last_listing,
    updated_at
  )
  WITH base AS (
    SELECT
      mm.profile_id,
      mm.response_rate_7d,
      mm.avg_response_hours,
      mm.ctr_7d,
      mm.active_listings,
      -- identity_verified: any verified id_card or business_license
      COALESCE((
        SELECT true FROM public.merchant_verifications mv
        WHERE mv.profile_id = mm.profile_id
          AND mv.verification_type IN ('id_card', 'business_license')
          AND mv.state = 'verified'
        LIMIT 1
      ), false)                                      AS identity_verified,
      -- duplicate listing count in last 7 days
      COALESCE((
        SELECT SUM(la.duplicate_count)
        FROM public.listings l
        JOIN public.listing_authenticity la ON la.listing_id = l.id
        WHERE l.owner_id = mm.profile_id
          AND la.is_duplicate
          AND l.created_at >= now() - interval '7 days'
      ), 0)::integer                                AS dup_count,
      -- risk events in last 24h
      COALESCE((
        SELECT COUNT(*) FROM public.risk_events re
        WHERE re.actor_id = mm.profile_id
          AND re.created_at >= now() - interval '24 hours'
          AND re.severity IN ('medium','high')
      ), 0)::integer                                AS risk_24h,
      -- phone spam: any listing by this merchant uses a spam phone
      COALESCE((
        SELECT true
        FROM public.listings l
        JOIN public.phone_listing_stats p
          ON REGEXP_REPLACE(REGEXP_REPLACE(l.contact_phone, E'^\\+84', '0'), E'[^0-9]', '', 'g')
             = p.phone_normalized
        WHERE l.owner_id = mm.profile_id
          AND p.is_spam_phone = true
        LIMIT 1
      ), false)                                      AS phone_spam,
      -- days since last listing (freshness)
      COALESCE((
        SELECT EXTRACT(day FROM now() - MAX(created_at))::integer
        FROM public.listings
        WHERE owner_id = mm.profile_id
      ), 999)::integer                               AS days_inactive
    FROM public.merchant_metrics mm
  ),
  scored AS (
    SELECT
      b.*,
      -- Component scores
      LEAST(30.0, b.response_rate_7d * 30.0)                                         AS response_score,
      LEAST(20.0, EXP(-b.avg_response_hours / 24.0) * 20.0)                         AS speed_score,
      LEAST(20.0, LN(1.0 + b.ctr_7d * 100.0) / LN(101.0) * 20.0)                  AS engagement_score,
      LEAST(20.0, (b.active_listings::float / 10.0) * 20.0)                         AS volume_score,
      (CASE WHEN b.identity_verified THEN 10.0 ELSE 0.0 END)                        AS verified_score,
      -- Fraud flag
      (b.dup_count > 5 OR b.risk_24h > 3 OR b.phone_spam)                           AS fraud_flag
    FROM base b
  )
  SELECT
    profile_id,
    response_rate_7d,
    avg_response_hours,
    ctr_7d,
    active_listings,
    identity_verified,
    ROUND((
      response_score + speed_score + engagement_score + volume_score + verified_score
    )::numeric, 1)                                   AS trust_score,
    dup_count,
    risk_24h,
    phone_spam,
    fraud_flag,
    days_inactive,
    now()
  FROM scored

  ON CONFLICT (profile_id) DO UPDATE SET
    response_rate_7d        = EXCLUDED.response_rate_7d,
    avg_response_hours      = EXCLUDED.avg_response_hours,
    ctr_7d                  = EXCLUDED.ctr_7d,
    active_listings         = EXCLUDED.active_listings,
    identity_verified       = EXCLUDED.identity_verified,
    trust_score             = EXCLUDED.trust_score,
    duplicate_listing_count = EXCLUDED.duplicate_listing_count,
    risk_event_count_24h    = EXCLUDED.risk_event_count_24h,
    phone_spam_flag         = EXCLUDED.phone_spam_flag,
    fraud_flag              = EXCLUDED.fraud_flag,
    days_since_last_listing = EXCLUDED.days_since_last_listing,
    updated_at              = EXCLUDED.updated_at;

  -- Auto-enqueue fraud-flagged profiles to moderation_queue
  INSERT INTO public.moderation_queue (target_type, target_id, risk_score, risk_reasons)
  SELECT
    'profile',
    mts.profile_id::text,
    mts.trust_score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN mts.duplicate_listing_count > 5  THEN 'duplicate_burst'  END,
      CASE WHEN mts.risk_event_count_24h    > 3  THEN 'risk_event_spike'  END,
      CASE WHEN mts.phone_spam_flag              THEN 'spam_phone'        END
    ], NULL)
  FROM public.merchant_trust_scores mts
  WHERE mts.fraud_flag = true
    AND mts.updated_at >= now() - interval '5 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.moderation_queue mq
      WHERE mq.target_type = 'profile'
        AND mq.target_id   = mts.profile_id::text
        AND mq.status IN ('pending','assigned')
    )
  ON CONFLICT DO NOTHING;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 11.  pg_cron — stagger into the 30-min pipeline
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Existing pipeline slots (from migrations 008–015):
--   :00/:30  refresh_quality_scores (listing quality)
--   :05/:35  refresh_signals_daily / refresh_ctr_stats
--   :08/:38  refresh_search_index
--   :11/:41  refresh_listing_signals_daily
--   :14/:44  refresh_user_affinities         (012)
--   :17/:47  refresh_listing_relationships   (013)
--   :21/:51  refresh_market_demand_signals   (014)
--   :24/:54  refresh_listing_health          (014)
--   :28/:58  refresh_merchant_metrics        (015)
--   :29/:59  refresh_listing_performance     (015)
--
-- New slots:
--   :00/:30  refresh_phone_listing_stats     (016) — before authenticity
--   :05/:35  refresh_listing_authenticity    (016) — needs phone stats
--   :08/:38  refresh_merchant_trust_scores   (016) — needs metrics + phone + dup

-- Remove stale jobs first (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE command LIKE '%refresh_phone_listing_stats%'
   OR command LIKE '%refresh_listing_authenticity%'
   OR command LIKE '%refresh_merchant_trust_scores%';

-- Note: :00 and :05 slots are shared with earlier migrations.
-- Trust pipeline runs in the SAME slot — parallel execution is safe because
-- each function writes to a distinct table with no cross-dependencies at
-- run-time (phone_stats is upserted before authenticity reads it via the
-- prior :00 run, not the same-minute run).

SELECT cron.schedule(
  'refresh_phone_listing_stats',
  '0-59/30 * * * *',         -- every :00 and :30
  $$SELECT public.refresh_phone_listing_stats()$$
);

SELECT cron.schedule(
  'refresh_listing_authenticity',
  '5-59/30 * * * *',         -- every :05 and :35
  $$SELECT public.refresh_listing_authenticity()$$
);

SELECT cron.schedule(
  'refresh_merchant_trust_scores',
  '8-59/30 * * * *',         -- every :08 and :38
  $$SELECT public.refresh_merchant_trust_scores()$$
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 12.  Row-level security
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.merchant_trust_scores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_authenticity   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_listing_stats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events            ENABLE ROW LEVEL SECURITY;

-- merchant_trust_scores: owner can read their own row; public cannot
DROP POLICY IF EXISTS "trust_scores_owner_read"   ON public.merchant_trust_scores;
CREATE POLICY "trust_scores_owner_read" ON public.merchant_trust_scores
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- listing_authenticity: public read (buyers should see if a listing is authentic)
DROP POLICY IF EXISTS "listing_auth_public_read"  ON public.listing_authenticity;
CREATE POLICY "listing_auth_public_read" ON public.listing_authenticity
  FOR SELECT TO anon, authenticated
  USING (true);

-- phone_listing_stats: no public read (internal only — accessed via SECURITY DEFINER)
-- No policy = no access from PostgREST.

-- moderation_queue: no public access (admin only — accessed via SECURITY DEFINER)
-- No policy = no access from PostgREST.

-- merchant_verifications: owner read only
DROP POLICY IF EXISTS "verifications_owner_read"  ON public.merchant_verifications;
CREATE POLICY "verifications_owner_read" ON public.merchant_verifications
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "verifications_owner_insert" ON public.merchant_verifications;
CREATE POLICY "verifications_owner_insert" ON public.merchant_verifications
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- risk_events: no public access (internal only)
-- No policy = no access from PostgREST.

-- ══════════════════════════════════════════════════════════════════════════════
-- 13.  Trust-aware ranking extension point (NOT YET WIRED)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- The search_listings_hybrid() function in migration 012 is NOT modified here.
-- When trust scores have stabilised (≥ 14 days of data), the following JOIN
-- can be added to the scoring path:
--
--   LEFT JOIN public.merchant_trust_scores mts
--     ON mts.profile_id = l.owner_id
--    AND NOT mts.fraud_flag
--
-- Then add to the score expression (within the existing +0.10 budget):
--
--   -- Trust boost: max +0.05, only for verified merchants with high trust
--   + CASE
--       WHEN mts.trust_score >= 80 AND mts.identity_verified
--       THEN 0.05 * LEAST(1.0, (mts.trust_score - 80.0) / 20.0)
--       ELSE 0
--     END
--
--   -- Fraud penalty: suppress fraud-flagged listings
--   * CASE WHEN mts.fraud_flag THEN 0.0 ELSE 1.0 END
--
-- This keeps the max personalization + trust boost at +0.15 total, within the
-- acceptable budget for signal-augmented ranking.
--
-- NOTE: Listings owned by profiles with no merchant_trust_scores row are NOT
-- penalised — new merchants start neutral (LEFT JOIN + CASE handles NULLs).

-- ══════════════════════════════════════════════════════════════════════════════
-- 14.  Maintenance: prune old low-severity risk events
-- ══════════════════════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'prune_risk_events',
  '0 3 * * *',               -- daily at 03:00
  $$DELETE FROM public.risk_events WHERE severity = 'low' AND created_at < now() - interval '30 days'$$
);

-- ══════════════════════════════════════════════════════════════════════════════
-- END 016_trust_governance.sql
-- ══════════════════════════════════════════════════════════════════════════════
