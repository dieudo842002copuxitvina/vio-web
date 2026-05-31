-- ── 015_merchant_os.sql ──────────────────────────────────────────────────────
-- Week 2.8: Merchant Operating System.
--
-- Lightweight merchant workflow infrastructure — pure PostgreSQL, no external
-- dependencies, no WebSockets, no complex workflow engines.
--
-- Tables:
--   • crm_leads                  — deal pipeline with stage tracking
--   • crm_lead_events            — timeline audit log per lead
--   • merchant_metrics           — pre-aggregated merchant KPIs
--   • listing_performance        — per-listing analytics + tier
--   • merchant_response_events   — response speed / quality signals
--   • merchant_notifications     — lightweight notification inbox
--
-- Automation:
--   • auto_create_crm_lead()     — trigger: inquiry → crm_lead (on INSERT)
--   • backfill_crm_leads()       — one-shot: promote existing inquiries
--
-- Aggregation functions (pg_cron :28/:58 and :29/:59):
--   • refresh_merchant_metrics()  — SECURITY DEFINER (reads listing_events)
--   • refresh_listing_performance()
--
-- Depends on: migrations 001–014
-- Safe to re-run: CREATE IF NOT EXISTS / OR REPLACE / DROP IF EXISTS throughout.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1.  crm_leads
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Stages (linear funnel):
--   new → contacted → qualified → proposal → won | lost
--
-- Design decisions:
--   • No FK on listing_id / inquiry_id — avoids cascade bloat on a potentially
--     large table; referential integrity enforced by the trigger.
--   • next_followup_at is NULLable; non-NULL rows form the followup queue
--     (partial index below avoids scanning leads without a scheduled followup).
--   • A partial UNIQUE index on inquiry_id prevents duplicate auto-created leads.

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Ownership
  owner_id           uuid         NOT NULL,
  storefront_id      uuid         NULL,
  -- Origin
  listing_id         uuid         NULL,
  inquiry_id         uuid         NULL,
  -- Contact snapshot (copied from inquiry at creation time)
  contact_name       text         NULL,
  contact_phone      text         NULL,
  contact_email      text         NULL,
  -- CRM state
  stage              text         NOT NULL DEFAULT 'new',
  priority           text         NOT NULL DEFAULT 'normal',
  notes              text         NULL,
  -- Followup
  next_followup_at   timestamptz  NULL,
  last_contacted_at  timestamptz  NULL,
  -- Timestamps
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT crm_leads_stage_check
    CHECK (stage    IN ('new','contacted','qualified','proposal','won','lost')),
  CONSTRAINT crm_leads_priority_check
    CHECK (priority IN ('low','normal','high','urgent'))
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2.  crm_lead_events
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Append-only audit trail for each lead (notes, calls, stage transitions, etc.).
-- No FK on lead_id — matches listing_events design: append-only, no cascades.

CREATE TABLE IF NOT EXISTS public.crm_lead_events (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id      uuid        NOT NULL,
  actor_id     uuid        NULL,
  event_type   text        NOT NULL,
  -- Stage transition fields (NULL when event_type ≠ 'stage_change')
  from_stage   text        NULL,
  to_stage     text        NULL,
  -- Free-form content
  note         text        NULL,
  followup_at  timestamptz NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_lead_events_type_check
    CHECK (event_type IN (
      'note','stage_change','followup_scheduled',
      'contacted','call','message'
    ))
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3.  merchant_metrics
-- ══════════════════════════════════════════════════════════════════════════════
--
-- One row per merchant (profile_id). Pre-aggregated by refresh_merchant_metrics().
-- Updated every 30 min; never written by the application layer.
--
-- trust_score formula (0–100):
--   response_part = response_rate_7d × 30        — max 30
--   speed_part    = LEAST(20, 20 × exp(−avg_hours/24))  — max 20
--   ctr_part      = LEAST(20, avg_ctr_7d × 200)  — max 20  (10% = 20)
--   volume_part   = LEAST(20, ln(1+inq_30d)/ln(21) × 20) — max 20
--   verified_bonus= 10 if storefront is_verified  — max 10
--   ──────────────────────────────────────────────── total max 100

CREATE TABLE IF NOT EXISTS public.merchant_metrics (
  profile_id          uuid          PRIMARY KEY,
  -- Inventory
  total_listings      integer       NOT NULL DEFAULT 0,
  active_listings     integer       NOT NULL DEFAULT 0,
  -- Engagement 7 d
  impressions_7d      integer       NOT NULL DEFAULT 0,
  clicks_7d           integer       NOT NULL DEFAULT 0,
  inquiries_7d        integer       NOT NULL DEFAULT 0,
  ctr_7d              numeric(6,4)  NOT NULL DEFAULT 0,
  inquiry_rate_7d     numeric(6,4)  NOT NULL DEFAULT 0,
  -- Engagement 30 d
  impressions_30d     integer       NOT NULL DEFAULT 0,
  clicks_30d          integer       NOT NULL DEFAULT 0,
  inquiries_30d       integer       NOT NULL DEFAULT 0,
  -- Response
  avg_response_hours  numeric(8,2)  NOT NULL DEFAULT 0,
  response_rate_7d    numeric(5,4)  NOT NULL DEFAULT 0,
  -- Lead CRM
  leads_total         integer       NOT NULL DEFAULT 0,
  leads_active        integer       NOT NULL DEFAULT 0,
  leads_won_30d       integer       NOT NULL DEFAULT 0,
  conversion_rate     numeric(5,4)  NOT NULL DEFAULT 0,
  -- Trust
  trust_score         numeric(5,2)  NOT NULL DEFAULT 0,
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4.  listing_performance
-- ══════════════════════════════════════════════════════════════════════════════
--
-- One row per listing. Pre-aggregated by refresh_listing_performance().
--
-- performance_score formula (0–100):
--   ctr_part      = LEAST(25, ctr_7d   × 250)            — max 25
--   inquiry_part  = LEAST(35, inq_rate × 700)             — max 35  (5% = 35)
--   save_part     = LEAST(15, save_rate × 100)            — max 15  (15% = 15)
--   volume_part   = LEAST(25, ln(1+clicks_7d)/ln(51) × 25) — max 25
--
-- performance_tier:
--   new     impressions_7d < 10        (not enough signal)
--   low     score < 20
--   average 20 ≤ score < 45
--   good    45 ≤ score < 70
--   top     score ≥ 70

CREATE TABLE IF NOT EXISTS public.listing_performance (
  listing_id          uuid          PRIMARY KEY,
  -- 7-day
  impressions_7d      integer       NOT NULL DEFAULT 0,
  clicks_7d           integer       NOT NULL DEFAULT 0,
  saves_7d            integer       NOT NULL DEFAULT 0,
  inquiries_7d        integer       NOT NULL DEFAULT 0,
  -- 30-day
  impressions_30d     integer       NOT NULL DEFAULT 0,
  clicks_30d          integer       NOT NULL DEFAULT 0,
  inquiries_30d       integer       NOT NULL DEFAULT 0,
  -- Rates
  ctr_7d              numeric(6,4)  NOT NULL DEFAULT 0,
  ctr_30d             numeric(6,4)  NOT NULL DEFAULT 0,
  inquiry_rate_7d     numeric(6,4)  NOT NULL DEFAULT 0,
  save_rate_7d        numeric(6,4)  NOT NULL DEFAULT 0,
  -- Score + tier
  performance_score   numeric(5,2)  NOT NULL DEFAULT 0,
  performance_tier    text          NOT NULL DEFAULT 'new',
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT listing_performance_tier_check
    CHECK (performance_tier IN ('new','low','average','good','top'))
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5.  merchant_response_events
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Populated by the TypeScript layer when a merchant responds to an inquiry
-- or lead.  response_hours is a generated column — always consistent with
-- the two timestamps, zero extra compute at read time.

CREATE TABLE IF NOT EXISTS public.merchant_response_events (
  id                    bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  merchant_id           uuid          NOT NULL,
  inquiry_id            uuid          NULL,
  lead_id               uuid          NULL,
  inquiry_received_at   timestamptz   NOT NULL,
  responded_at          timestamptz   NOT NULL,
  -- Stored generated: IMMUTABLE because it depends only on the two timestamps
  response_hours        numeric(8,2)  NOT NULL
    GENERATED ALWAYS AS (
      GREATEST(0.0,
        EXTRACT(epoch FROM (responded_at - inquiry_received_at))::numeric / 3600.0
      )
    ) STORED,
  response_length       integer       NULL,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6.  merchant_notifications
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Lightweight inbox — no pub/sub, no realtime infra.  Pages poll via SSR
-- revalidate=0 or a short-interval ISR.  Marking read is a simple UPDATE.

CREATE TABLE IF NOT EXISTS public.merchant_notifications (
  id                 bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_id       uuid        NOT NULL,
  notification_type  text        NOT NULL,
  title              text        NOT NULL,
  body               text        NULL,
  -- Optional link to a resource
  resource_type      text        NULL,   -- 'lead' | 'listing' | 'inquiry' | 'system'
  resource_id        text        NULL,   -- UUID of the linked resource
  -- State
  is_read            boolean     NOT NULL DEFAULT false,
  read_at            timestamptz NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_notifications_type_check
    CHECK (notification_type IN (
      'new_inquiry','lead_followup','listing_expiring',
      'listing_approved','listing_rejected','new_lead','lead_won','system'
    ))
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7.  Composite indexes
-- ══════════════════════════════════════════════════════════════════════════════

-- crm_leads ───────────────────────────────────────────────────────────────────

-- Pipeline view: all leads for a merchant filtered by stage, newest first
CREATE INDEX IF NOT EXISTS crm_leads_owner_stage_created_idx
  ON public.crm_leads (owner_id, stage, created_at DESC);

-- Followup queue: leads with a scheduled followup (partial — skips NULLs)
CREATE INDEX IF NOT EXISTS crm_leads_owner_followup_idx
  ON public.crm_leads (owner_id, next_followup_at)
  WHERE next_followup_at IS NOT NULL;

-- Count leads by stage (pipeline summary card)
CREATE INDEX IF NOT EXISTS crm_leads_owner_created_idx
  ON public.crm_leads (owner_id, created_at DESC);

-- Prevent duplicate auto-created leads per inquiry
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_inquiry_unique_idx
  ON public.crm_leads (inquiry_id)
  WHERE inquiry_id IS NOT NULL;

-- crm_lead_events ─────────────────────────────────────────────────────────────

-- Lead timeline: events for a single lead, newest first
CREATE INDEX IF NOT EXISTS crm_lead_events_lead_created_idx
  ON public.crm_lead_events (lead_id, created_at DESC);

-- merchant_response_events ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS merchant_response_events_merchant_created_idx
  ON public.merchant_response_events (merchant_id, created_at DESC);

-- merchant_notifications ──────────────────────────────────────────────────────

-- Unread badge count + feed (primary query pattern)
CREATE INDEX IF NOT EXISTS merchant_notifications_recipient_read_created_idx
  ON public.merchant_notifications (recipient_id, is_read, created_at DESC);

-- All notifications paginated
CREATE INDEX IF NOT EXISTS merchant_notifications_recipient_created_idx
  ON public.merchant_notifications (recipient_id, created_at DESC);

-- listing_performance ─────────────────────────────────────────────────────────

-- Merchant listing analytics: join listings on owner_id then lookup perf by id
-- (covered by PRIMARY KEY + listings owner index)

-- Leaderboard / admin queries by tier
CREATE INDEX IF NOT EXISTS listing_performance_tier_score_idx
  ON public.listing_performance (performance_tier, performance_score DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8.  Trigger: auto-create crm_lead from inquiry
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Fires AFTER INSERT on inquiries.  Looks up the listing owner and creates
-- a crm_lead row.  The unique partial index (inquiry_id) prevents duplicates
-- when the trigger fires multiple times (idempotent via ON CONFLICT DO NOTHING).

CREATE OR REPLACE FUNCTION public.auto_create_crm_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.listing_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.crm_leads (
    owner_id,
    storefront_id,
    listing_id,
    inquiry_id,
    contact_name,
    contact_phone,
    stage,
    priority
  )
  SELECT
    l.owner_id,
    l.storefront_id,
    NEW.listing_id,
    NEW.id,
    NEW.buyer_name,
    NEW.buyer_phone,
    'new',
    'normal'
  FROM public.listings l
  WHERE l.id        = NEW.listing_id
    AND l.owner_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inquiry_create_crm_lead ON public.inquiries;

CREATE TRIGGER trg_inquiry_create_crm_lead
  AFTER INSERT ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_crm_lead();

-- ── One-shot backfill for existing inquiries ─────────────────────────────────
-- Creates crm_leads for all inquiries that don't already have one.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).

CREATE OR REPLACE FUNCTION public.backfill_crm_leads()
RETURNS integer          -- returns the number of leads inserted
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count integer;
BEGIN
  WITH backfill AS (
    INSERT INTO public.crm_leads (
      owner_id, storefront_id, listing_id, inquiry_id,
      contact_name, contact_phone, stage, priority, created_at
    )
    SELECT
      l.owner_id,
      l.storefront_id,
      i.listing_id,
      i.id,
      i.buyer_name,
      i.buyer_phone,
      COALESCE(
        CASE i.status
          WHEN 'new'         THEN 'new'
          WHEN 'contacted'   THEN 'contacted'
          WHEN 'closed_won'  THEN 'won'
          WHEN 'closed_lost' THEN 'lost'
          ELSE 'new'
        END,
        'new'
      ),
      'normal',
      i.created_at
    FROM public.inquiries i
    JOIN public.listings  l ON l.id = i.listing_id AND l.owner_id IS NOT NULL
    WHERE i.listing_id IS NOT NULL
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM backfill;

  RETURN inserted_count;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9.  refresh_merchant_metrics()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Reads:
--   listings              — inventory counts, owner attribution
--   listing_ctr_stats     — per-listing CTR (7d)
--   listing_signals_daily — 30d impressions/clicks/inquiries via daily roll-up
--   merchant_response_events — response speed
--   crm_leads             — lead counts / conversion
--   storefronts           — is_verified bonus
--
-- SECURITY DEFINER: required because the function aggregates over listing_events
-- indirectly via listing_ctr_stats (public SELECT) and listing_signals_daily
-- (public SELECT). No direct listing_events read is needed here.

CREATE OR REPLACE FUNCTION public.refresh_merchant_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH
  -- ── Inventory ──────────────────────────────────────────────────────────────
  inventory AS (
    SELECT
      owner_id                                AS profile_id,
      COUNT(*)                                AS total_listings,
      COUNT(*) FILTER (
        WHERE status = 'published'
          AND is_public = true
          AND moderation_status = 'approved'
      )                                       AS active_listings
    FROM public.listings
    WHERE owner_id IS NOT NULL
    GROUP BY owner_id
  ),

  -- ── 7-day engagement (from listing_ctr_stats, joined via listings) ─────────
  engagement_7d AS (
    SELECT
      l.owner_id                              AS profile_id,
      COALESCE(SUM(cs.impressions_7d), 0)     AS impressions_7d,
      COALESCE(SUM(cs.clicks_7d), 0)          AS clicks_7d,
      -- CTR: weighted average across listings
      COALESCE(
        SUM(cs.clicks_7d)::numeric
        / NULLIF(SUM(cs.impressions_7d), 0),
        0
      )::numeric(6,4)                         AS ctr_7d
    FROM public.listings l
    JOIN public.listing_ctr_stats cs ON cs.listing_id = l.id
    WHERE l.owner_id IS NOT NULL
    GROUP BY l.owner_id
  ),

  -- ── 30-day engagement (from listing_signals_daily) ────────────────────────
  engagement_30d AS (
    SELECT
      l.owner_id                              AS profile_id,
      COALESCE(SUM(sd.impressions), 0)        AS impressions_30d,
      COALESCE(SUM(sd.clicks), 0)             AS clicks_30d,
      COALESCE(SUM(sd.inquiries), 0)          AS inquiries_30d
    FROM public.listings l
    JOIN public.listing_signals_daily sd ON sd.listing_id = l.id
    WHERE l.owner_id IS NOT NULL
      AND sd.signal_date >= CURRENT_DATE - 30
    GROUP BY l.owner_id
  ),

  -- ── 7-day inquiries (from listing_signals_daily) ──────────────────────────
  inquiries_7d AS (
    SELECT
      l.owner_id                              AS profile_id,
      COALESCE(SUM(sd.inquiries), 0)          AS inquiries_7d
    FROM public.listings l
    JOIN public.listing_signals_daily sd ON sd.listing_id = l.id
    WHERE l.owner_id IS NOT NULL
      AND sd.signal_date >= CURRENT_DATE - 7
    GROUP BY l.owner_id
  ),

  -- ── Response metrics ───────────────────────────────────────────────────────
  response_stats AS (
    SELECT
      merchant_id                             AS profile_id,
      AVG(response_hours)::numeric(8,2)       AS avg_response_hours,
      -- response_rate_7d: fraction of inquiries responded within last 7 days
      -- (approximated: rows in this table represent responded inquiries,
      --  so response rate = responded / total leads in same window)
      1.0::numeric(5,4)                       AS response_rate_7d
    FROM public.merchant_response_events
    WHERE created_at >= now() - interval '7 days'
    GROUP BY merchant_id
  ),

  -- ── Lead CRM stats ─────────────────────────────────────────────────────────
  lead_stats AS (
    SELECT
      owner_id                                AS profile_id,
      COUNT(*)                                AS leads_total,
      COUNT(*) FILTER (
        WHERE stage NOT IN ('won','lost')
      )                                       AS leads_active,
      COUNT(*) FILTER (
        WHERE stage = 'won'
          AND created_at >= now() - interval '30 days'
      )                                       AS leads_won_30d
    FROM public.crm_leads
    GROUP BY owner_id
  ),

  -- ── Verified bonus (from storefronts) ─────────────────────────────────────
  verified AS (
    SELECT
      owner_id                                AS profile_id,
      BOOL_OR(is_verified)                    AS is_verified
    FROM public.storefronts
    WHERE owner_id IS NOT NULL
    GROUP BY owner_id
  ),

  -- ── Combine all dimensions ─────────────────────────────────────────────────
  combined AS (
    SELECT
      inv.profile_id,
      inv.total_listings,
      inv.active_listings,

      COALESCE(e7.impressions_7d,  0)         AS impressions_7d,
      COALESCE(e7.clicks_7d,       0)         AS clicks_7d,
      COALESCE(e7.ctr_7d,          0)         AS ctr_7d,
      COALESCE(i7.inquiries_7d,    0)         AS inquiries_7d,
      COALESCE(
        i7.inquiries_7d::numeric
        / NULLIF(e7.clicks_7d, 0),
        0
      )::numeric(6,4)                         AS inquiry_rate_7d,

      COALESCE(e30.impressions_30d, 0)        AS impressions_30d,
      COALESCE(e30.clicks_30d,      0)        AS clicks_30d,
      COALESCE(e30.inquiries_30d,   0)        AS inquiries_30d,

      COALESCE(rs.avg_response_hours, 0)      AS avg_response_hours,
      COALESCE(rs.response_rate_7d,   0)      AS response_rate_7d,

      COALESCE(ls.leads_total,   0)           AS leads_total,
      COALESCE(ls.leads_active,  0)           AS leads_active,
      COALESCE(ls.leads_won_30d, 0)           AS leads_won_30d,
      COALESCE(
        ls.leads_won_30d::numeric
        / NULLIF(ls.leads_total, 0),
        0
      )::numeric(5,4)                         AS conversion_rate,

      COALESCE(v.is_verified, false)          AS is_verified

    FROM inventory inv
    LEFT JOIN engagement_7d  e7   ON e7.profile_id  = inv.profile_id
    LEFT JOIN inquiries_7d   i7   ON i7.profile_id  = inv.profile_id
    LEFT JOIN engagement_30d e30  ON e30.profile_id = inv.profile_id
    LEFT JOIN response_stats rs   ON rs.profile_id  = inv.profile_id
    LEFT JOIN lead_stats     ls   ON ls.profile_id  = inv.profile_id
    LEFT JOIN verified       v    ON v.profile_id   = inv.profile_id
  )

  INSERT INTO public.merchant_metrics (
    profile_id,
    total_listings,   active_listings,
    impressions_7d,   clicks_7d,   inquiries_7d,   ctr_7d,   inquiry_rate_7d,
    impressions_30d,  clicks_30d,  inquiries_30d,
    avg_response_hours, response_rate_7d,
    leads_total,      leads_active, leads_won_30d, conversion_rate,
    trust_score,
    updated_at
  )
  SELECT
    profile_id,
    total_listings,   active_listings,
    impressions_7d,   clicks_7d,   inquiries_7d,   ctr_7d,   inquiry_rate_7d,
    impressions_30d,  clicks_30d,  inquiries_30d,
    avg_response_hours, response_rate_7d,
    leads_total,      leads_active, leads_won_30d, conversion_rate,

    -- ── Trust score (0–100) ──────────────────────────────────────────────────
    LEAST(100.0,
      -- Response rate component (max 30): 100% response = 30 pts
      response_rate_7d::numeric * 30.0

      -- Speed component (max 20): 0h=20, 4h≈17, 24h=10, 48h≈5
      + CASE WHEN avg_response_hours > 0
          THEN LEAST(20.0,
                 20.0 * EXP(-avg_response_hours::numeric / 24.0))
          ELSE 0.0
        END

      -- CTR quality (max 20): 10% CTR = 20 pts
      + LEAST(20.0, ctr_7d::numeric * 200.0)

      -- Inquiry volume (max 20): log-normalised, 20 inquiries = 20 pts
      + LEAST(20.0,
          LN(1.0 + inquiries_30d::numeric)
          / LN(21.0) * 20.0)

      -- Verified storefront bonus (max 10)
      + CASE WHEN is_verified THEN 10.0 ELSE 0.0 END
    )::numeric(5,2)   AS trust_score,

    now()

  FROM combined

  ON CONFLICT (profile_id) DO UPDATE SET
    total_listings     = EXCLUDED.total_listings,
    active_listings    = EXCLUDED.active_listings,
    impressions_7d     = EXCLUDED.impressions_7d,
    clicks_7d          = EXCLUDED.clicks_7d,
    inquiries_7d       = EXCLUDED.inquiries_7d,
    ctr_7d             = EXCLUDED.ctr_7d,
    inquiry_rate_7d    = EXCLUDED.inquiry_rate_7d,
    impressions_30d    = EXCLUDED.impressions_30d,
    clicks_30d         = EXCLUDED.clicks_30d,
    inquiries_30d      = EXCLUDED.inquiries_30d,
    avg_response_hours = EXCLUDED.avg_response_hours,
    response_rate_7d   = EXCLUDED.response_rate_7d,
    leads_total        = EXCLUDED.leads_total,
    leads_active       = EXCLUDED.leads_active,
    leads_won_30d      = EXCLUDED.leads_won_30d,
    conversion_rate    = EXCLUDED.conversion_rate,
    trust_score        = EXCLUDED.trust_score,
    updated_at         = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10.  refresh_listing_performance()
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Reads:
--   listing_ctr_stats     — 7d CTR (already aggregated)
--   listing_signals_daily — 7d saves + 30d all metrics via SUM
--   listing_quality_scores — inquiry_rate and save_rate (quality function)
--
-- Does NOT read listing_events directly — all signals are pre-aggregated.
-- No SECURITY DEFINER required.

CREATE OR REPLACE FUNCTION public.refresh_listing_performance()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH
  -- ── 30-day totals from listing_signals_daily ───────────────────────────────
  signals_30d AS (
    SELECT
      listing_id,
      SUM(impressions)              AS impressions_30d,
      SUM(clicks)                   AS clicks_30d,
      SUM(inquiries)                AS inquiries_30d,
      SUM(saves)                    AS saves_30d
    FROM public.listing_signals_daily
    WHERE signal_date >= CURRENT_DATE - 30
    GROUP BY listing_id
  ),

  -- ── 7-day totals from listing_signals_daily ───────────────────────────────
  signals_7d AS (
    SELECT
      listing_id,
      SUM(impressions)              AS impressions_7d,
      SUM(clicks)                   AS clicks_7d,
      SUM(inquiries)                AS inquiries_7d,
      SUM(saves)                    AS saves_7d
    FROM public.listing_signals_daily
    WHERE signal_date >= CURRENT_DATE - 7
    GROUP BY listing_id
  ),

  -- ── Combine all signal sources ─────────────────────────────────────────────
  combined AS (
    SELECT
      COALESCE(s7.listing_id, s30.listing_id, cs.listing_id) AS listing_id,

      COALESCE(s7.impressions_7d,  0)        AS impressions_7d,
      COALESCE(s7.clicks_7d,       0)        AS clicks_7d,
      COALESCE(s7.saves_7d,        0)        AS saves_7d,
      COALESCE(s7.inquiries_7d,    0)        AS inquiries_7d,

      COALESCE(s30.impressions_30d, 0)       AS impressions_30d,
      COALESCE(s30.clicks_30d,      0)       AS clicks_30d,
      COALESCE(s30.inquiries_30d,   0)       AS inquiries_30d,

      -- 7d CTR: prefer listing_ctr_stats (deduped) over raw signal calc
      COALESCE(cs.ctr_7d, 0)                 AS ctr_7d,

      -- 30d CTR
      COALESCE(
        s30.clicks_30d::numeric
        / NULLIF(s30.impressions_30d, 0),
        0
      )::numeric(6,4)                        AS ctr_30d,

      -- Rates from quality scores (pre-computed, decay-adjusted)
      COALESCE(qs.inquiry_rate, 0)           AS inquiry_rate_7d,
      COALESCE(qs.save_rate,    0)           AS save_rate_7d

    FROM signals_7d  s7
    FULL OUTER JOIN signals_30d s30 ON s30.listing_id = s7.listing_id
    LEFT JOIN public.listing_ctr_stats      cs ON cs.listing_id = COALESCE(s7.listing_id, s30.listing_id)
    LEFT JOIN public.listing_quality_scores qs ON qs.listing_id = COALESCE(s7.listing_id, s30.listing_id)
  )

  INSERT INTO public.listing_performance (
    listing_id,
    impressions_7d,  clicks_7d,   saves_7d,  inquiries_7d,
    impressions_30d, clicks_30d,  inquiries_30d,
    ctr_7d,          ctr_30d,     inquiry_rate_7d, save_rate_7d,
    performance_score, performance_tier,
    updated_at
  )
  SELECT
    listing_id,
    impressions_7d,  clicks_7d,   saves_7d,  inquiries_7d,
    impressions_30d, clicks_30d,  inquiries_30d,
    ctr_7d,          ctr_30d,     inquiry_rate_7d, save_rate_7d,

    -- ── Performance score (0–100) ────────────────────────────────────────────
    GREATEST(0.0,
      -- CTR component (max 25): 10% = 25 pts
      LEAST(25.0, ctr_7d::numeric * 250.0)

      -- Inquiry conversion (max 35): 5% = 35 pts
      + LEAST(35.0, inquiry_rate_7d::numeric * 700.0)

      -- Save signal (max 15): 15% save rate = 15 pts
      + LEAST(15.0, save_rate_7d::numeric * 100.0)

      -- Click volume (max 25): log-normalised, 50 clicks = 25 pts
      + LEAST(25.0,
          LN(1.0 + clicks_7d::numeric)
          / LN(51.0) * 25.0)
    )::numeric(5,2)  AS performance_score,

    -- ── Performance tier ────────────────────────────────────────────────────
    CASE
      WHEN impressions_7d < 10
        THEN 'new'
      WHEN GREATEST(0.0,
             LEAST(25.0, ctr_7d::numeric * 250.0)
             + LEAST(35.0, inquiry_rate_7d::numeric * 700.0)
             + LEAST(15.0, save_rate_7d::numeric * 100.0)
             + LEAST(25.0, LN(1.0 + clicks_7d::numeric) / LN(51.0) * 25.0)
           ) >= 70.0
        THEN 'top'
      WHEN GREATEST(0.0,
             LEAST(25.0, ctr_7d::numeric * 250.0)
             + LEAST(35.0, inquiry_rate_7d::numeric * 700.0)
             + LEAST(15.0, save_rate_7d::numeric * 100.0)
             + LEAST(25.0, LN(1.0 + clicks_7d::numeric) / LN(51.0) * 25.0)
           ) >= 45.0
        THEN 'good'
      WHEN GREATEST(0.0,
             LEAST(25.0, ctr_7d::numeric * 250.0)
             + LEAST(35.0, inquiry_rate_7d::numeric * 700.0)
             + LEAST(15.0, save_rate_7d::numeric * 100.0)
             + LEAST(25.0, LN(1.0 + clicks_7d::numeric) / LN(51.0) * 25.0)
           ) >= 20.0
        THEN 'average'
      ELSE 'low'
    END              AS performance_tier,

    now()

  FROM combined

  ON CONFLICT (listing_id) DO UPDATE SET
    impressions_7d    = EXCLUDED.impressions_7d,
    clicks_7d         = EXCLUDED.clicks_7d,
    saves_7d          = EXCLUDED.saves_7d,
    inquiries_7d      = EXCLUDED.inquiries_7d,
    impressions_30d   = EXCLUDED.impressions_30d,
    clicks_30d        = EXCLUDED.clicks_30d,
    inquiries_30d     = EXCLUDED.inquiries_30d,
    ctr_7d            = EXCLUDED.ctr_7d,
    ctr_30d           = EXCLUDED.ctr_30d,
    inquiry_rate_7d   = EXCLUDED.inquiry_rate_7d,
    save_rate_7d      = EXCLUDED.save_rate_7d,
    performance_score = EXCLUDED.performance_score,
    performance_tier  = EXCLUDED.performance_tier,
    updated_at        = EXCLUDED.updated_at;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 11.  pg_cron jobs
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Full 30-min analytics pipeline (all stagger slots):
--   :00 signals  :05 scores  :08 CTR  :11 quality
--   :14 affinities  :17 relationships  :21 demand  :24 health
--   :28 merchant_metrics  :29 listing_performance
--
-- merchant_metrics runs at :28/:58 — 2 min after listing_health at :24/:54.
-- listing_performance runs at :29/:59 — immediately after merchant_metrics.

DO $$
BEGIN
  PERFORM cron.schedule(
    'refresh-merchant-metrics',
    '28-59/30 * * * *',
    $$SELECT public.refresh_merchant_metrics()$$
  );
  PERFORM cron.schedule(
    'refresh-listing-performance',
    '29-59/30 * * * *',
    $$SELECT public.refresh_listing_performance()$$
  );
EXCEPTION WHEN undefined_function OR undefined_schema THEN
  RAISE WARNING
    '[015] pg_cron not enabled — merchant_metrics and listing_performance '
    'will not auto-refresh. Enable pg_cron then run cron.schedule() manually.';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12.  RLS
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.crm_leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_metrics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_performance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_response_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_notifications   ENABLE ROW LEVEL SECURITY;

-- crm_leads: owner-only CRUD
CREATE POLICY "crm_leads_owner_select"
  ON public.crm_leads FOR SELECT   TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "crm_leads_owner_insert"
  ON public.crm_leads FOR INSERT   TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "crm_leads_owner_update"
  ON public.crm_leads FOR UPDATE   TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "crm_leads_owner_delete"
  ON public.crm_leads FOR DELETE   TO authenticated USING (owner_id = auth.uid());

-- crm_lead_events: owner of the lead can read/write (join check via crm_leads)
CREATE POLICY "crm_lead_events_owner_select"
  ON public.crm_lead_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = lead_id AND l.owner_id = auth.uid()
  ));
CREATE POLICY "crm_lead_events_owner_insert"
  ON public.crm_lead_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = lead_id AND l.owner_id = auth.uid()
  ));

-- merchant_metrics: owner reads own row
CREATE POLICY "merchant_metrics_owner_select"
  ON public.merchant_metrics FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- listing_performance: listing owner can read their listing's row
CREATE POLICY "listing_performance_owner_select"
  ON public.listing_performance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_id AND l.owner_id = auth.uid()
  ));

-- merchant_response_events: own rows only
CREATE POLICY "merchant_response_events_owner_select"
  ON public.merchant_response_events FOR SELECT TO authenticated
  USING (merchant_id = auth.uid());
CREATE POLICY "merchant_response_events_owner_insert"
  ON public.merchant_response_events FOR INSERT TO authenticated
  WITH CHECK (merchant_id = auth.uid());

-- merchant_notifications: recipient reads/updates own notifications
CREATE POLICY "merchant_notifications_recipient_select"
  ON public.merchant_notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());
CREATE POLICY "merchant_notifications_recipient_update"
  ON public.merchant_notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- 13.  Grants
-- ══════════════════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads                TO authenticated;
GRANT SELECT, INSERT                  ON public.crm_lead_events          TO authenticated;
GRANT SELECT                          ON public.merchant_metrics         TO authenticated;
GRANT SELECT                          ON public.listing_performance      TO authenticated;
GRANT SELECT, INSERT                  ON public.merchant_response_events TO authenticated;
GRANT SELECT, UPDATE                  ON public.merchant_notifications   TO authenticated;

GRANT EXECUTE ON FUNCTION public.auto_create_crm_lead       TO postgres;
GRANT EXECUTE ON FUNCTION public.backfill_crm_leads         TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_merchant_metrics   TO postgres;
GRANT EXECUTE ON FUNCTION public.refresh_listing_performance TO postgres;
