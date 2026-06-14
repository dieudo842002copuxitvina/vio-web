-- ── Revenue Engine V1 ──────────────────────────────────────────────────────────
-- Creates: subscription_plans, plan_features, subscriptions, featured_listings
--
-- No payment processor is integrated.  Admin grants subscriptions via the
-- service-role client (grantPro / revokePro server actions in admin.server.ts).
-- Quota enforcement happens at the application layer (dashboard layout.tsx gate).
--
-- Plans (seeded below):
--   free  0 VND / forever   — max 10 listings, 7d analytics, no premium features
--   pro   299 000 VND / mo  — max 100 listings, 30d analytics, full feature set

-- ── subscription_plans ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id             text        PRIMARY KEY,
  name           text        NOT NULL,
  price_vnd      integer     NOT NULL DEFAULT 0,
  billing_period text        NOT NULL DEFAULT 'forever',
  sort_order     smallint    NOT NULL DEFAULT 0,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscription_plans_period_check
    CHECK (billing_period IN ('forever', 'monthly', 'yearly'))
);

-- ── plan_features ──────────────────────────────────────────────────────────────
-- Feature flags and limits per plan.
-- feature_value is JSONB so integers, booleans, and strings share one column.

CREATE TABLE IF NOT EXISTS public.plan_features (
  plan_id       text  NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_key   text  NOT NULL,
  feature_value jsonb NOT NULL,
  PRIMARY KEY (plan_id, feature_key)
);

-- ── subscriptions ──────────────────────────────────────────────────────────────
-- One row per user (UNIQUE on profile_id).
-- status lifecycle: trialing → active → cancelled / expired
-- Admin grants are recorded with granted_by (NULL = checkout-originated).
-- current_period_end = NULL means the grant never expires.

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           uuid        NOT NULL UNIQUE
                         REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id              text        NOT NULL
                         REFERENCES public.subscription_plans(id),
  status               text        NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end   timestamptz,
  cancelled_at         timestamptz,
  granted_by           uuid,
  metadata             jsonb       NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'cancelled', 'expired', 'trialing'))
);

CREATE INDEX IF NOT EXISTS subscriptions_profile_status_idx
  ON public.subscriptions (profile_id, status);

-- ── featured_listings ──────────────────────────────────────────────────────────
-- Paid promotional slots.  One slot per listing (UNIQUE on listing_id).
-- Ordered for display: status='active' + priority_score DESC + created_at DESC.
-- ends_at = NULL means no expiry (admin-set permanent feature).

CREATE TABLE IF NOT EXISTS public.featured_listings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid        NOT NULL UNIQUE
                   REFERENCES public.listings(id) ON DELETE CASCADE,
  merchant_id    uuid        NOT NULL
                   REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at      timestamptz NOT NULL DEFAULT now(),
  ends_at        timestamptz,
  priority_score integer     NOT NULL DEFAULT 100,
  status         text        NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT featured_listings_status_check
    CHECK (status IN ('active', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS featured_listings_active_priority_idx
  ON public.featured_listings (status, priority_score DESC, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS featured_listings_merchant_idx
  ON public.featured_listings (merchant_id);

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_listings   ENABLE ROW LEVEL SECURITY;

-- Plans and features: publicly readable (pricing page, onboarding)
CREATE POLICY "plans_public_read"         ON public.subscription_plans  FOR SELECT USING (true);
CREATE POLICY "plan_features_public_read" ON public.plan_features        FOR SELECT USING (true);

-- Subscriptions: each user reads their own; service_role manages all
CREATE POLICY "subscriptions_own_read" ON public.subscriptions
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "subscriptions_service_all" ON public.subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Featured listings: public read; service_role manages
CREATE POLICY "featured_listings_public_read" ON public.featured_listings
  FOR SELECT USING (true);

CREATE POLICY "featured_listings_service_all" ON public.featured_listings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Column grants ──────────────────────────────────────────────────────────────

GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT SELECT ON public.plan_features      TO anon, authenticated;
GRANT SELECT ON public.subscriptions      TO authenticated;
GRANT SELECT ON public.featured_listings  TO anon, authenticated;

-- ── Seed: plans ───────────────────────────────────────────────────────────────

INSERT INTO public.subscription_plans (id, name, price_vnd, billing_period, sort_order) VALUES
  ('free', 'Free', 0,      'forever', 0),
  ('pro',  'Pro',  299000, 'monthly', 1)
ON CONFLICT (id) DO NOTHING;

-- ── Seed: plan features ────────────────────────────────────────────────────────

INSERT INTO public.plan_features (plan_id, feature_key, feature_value) VALUES
  ('free', 'max_listings',     '10'::jsonb),
  ('free', 'analytics_days',   '7'::jsonb),
  ('free', 'hot_leads',        'false'::jsonb),
  ('free', 'smart_matching',   'false'::jsonb),
  ('free', 'featured_listing', 'false'::jsonb),
  ('pro',  'max_listings',     '100'::jsonb),
  ('pro',  'analytics_days',   '30'::jsonb),
  ('pro',  'hot_leads',        'true'::jsonb),
  ('pro',  'smart_matching',   'true'::jsonb),
  ('pro',  'featured_listing', 'true'::jsonb)
ON CONFLICT (plan_id, feature_key) DO NOTHING;
