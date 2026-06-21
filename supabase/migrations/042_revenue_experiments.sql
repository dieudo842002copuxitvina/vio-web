-- Revenue Experiments Platform: A/B pricing experiments without code changes.
-- Variant assignment is deterministic (session hash) and tagged on payment_requests.

CREATE TABLE pricing_experiments (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name      text        NOT NULL UNIQUE,
  product_type         text        NOT NULL,
  -- 'boost_7d'|'boost_30d'|'spotlight'|'pro_monthly'|'seller_verification'|'legal_review'
  status               text        NOT NULL DEFAULT 'draft',
  -- 'draft'|'running'|'paused'|'ended'
  variant_a_price      integer     NOT NULL,
  variant_a_label      text        NOT NULL DEFAULT 'Control',
  variant_b_price      integer     NOT NULL,
  variant_b_label      text        NOT NULL DEFAULT 'Treatment',
  traffic_split_pct    smallint    NOT NULL DEFAULT 50,  -- % assigned to variant B
  start_date           timestamptz,
  end_date             timestamptz,
  -- Running totals (updated on payment confirmation)
  variant_a_views      integer     NOT NULL DEFAULT 0,
  variant_a_checkouts  integer     NOT NULL DEFAULT 0,
  variant_b_views      integer     NOT NULL DEFAULT 0,
  variant_b_checkouts  integer     NOT NULL DEFAULT 0,
  created_by           uuid        REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON pricing_experiments(status, product_type);

-- ── Tag payment_requests with experiment context ───────────────────────────────

ALTER TABLE payment_requests
  ADD COLUMN IF NOT EXISTS experiment_id      uuid REFERENCES pricing_experiments(id),
  ADD COLUMN IF NOT EXISTS experiment_variant text;  -- 'a' | 'b'

CREATE INDEX ON payment_requests(experiment_id) WHERE experiment_id IS NOT NULL;

-- ── get_experiment_stats: live aggregation ────────────────────────────────────

CREATE OR REPLACE FUNCTION get_experiment_stats(p_id uuid)
RETURNS TABLE (
  variant          text,
  views            bigint,
  checkouts        bigint,
  completions      bigint,
  revenue_vnd      bigint,
  conversion_rate  numeric,
  revenue_per_view numeric
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    pr.experiment_variant                                     AS variant,
    COUNT(*) FILTER (WHERE (pr.metadata->>'experiment_viewed')::boolean = true)  AS views,
    COUNT(*)                                                  AS checkouts,
    COUNT(*) FILTER (WHERE pr.status = 'completed')           AS completions,
    COALESCE(SUM(pr.amount_vnd) FILTER (WHERE pr.status = 'completed'), 0) AS revenue_vnd,
    ROUND(
      COUNT(*) FILTER (WHERE pr.status = 'completed')::numeric
      / NULLIF(COUNT(*), 0) * 100,
    2)                                                        AS conversion_rate,
    ROUND(
      COALESCE(SUM(pr.amount_vnd) FILTER (WHERE pr.status = 'completed'), 0)::numeric
      / NULLIF(COUNT(*) FILTER (WHERE (pr.metadata->>'experiment_viewed')::boolean = true), 0),
    0)                                                        AS revenue_per_view
  FROM payment_requests pr
  WHERE pr.experiment_id = p_id
    AND pr.experiment_variant IS NOT NULL
  GROUP BY pr.experiment_variant
  ORDER BY pr.experiment_variant;
$$;

-- ── increment experiment view/checkout counters ───────────────────────────────

CREATE OR REPLACE FUNCTION record_experiment_checkout(
  p_experiment_id uuid,
  p_variant       text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_variant = 'a' THEN
    UPDATE pricing_experiments SET variant_a_checkouts = variant_a_checkouts + 1 WHERE id = p_experiment_id;
  ELSIF p_variant = 'b' THEN
    UPDATE pricing_experiments SET variant_b_checkouts = variant_b_checkouts + 1 WHERE id = p_experiment_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION record_experiment_view(
  p_experiment_id uuid,
  p_variant       text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_variant = 'a' THEN
    UPDATE pricing_experiments SET variant_a_views = variant_a_views + 1 WHERE id = p_experiment_id;
  ELSIF p_variant = 'b' THEN
    UPDATE pricing_experiments SET variant_b_views = variant_b_views + 1 WHERE id = p_experiment_id;
  END IF;
END;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE pricing_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_experiments" ON pricing_experiments
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
