'use server'

import { createAdminClient, createCachedClient } from '@/lib/supabase/server'
import { writeAuditLog }                          from './audit.server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MarketplaceDailyMetric {
  id:                    number
  date:                  string
  active_listings:       number
  new_listings:          number
  active_sellers:        number
  active_agencies:       number
  new_leads:             number
  visit_requests:        number
  legal_review_requests: number
  saved_searches:        number
  pro_subscribers:       number
  revenue_vnd:           number
  pending_payments:      number
  leads_per_listing:     number
  computed_at:           string
}

export interface MarketplaceAlert {
  id:           number
  alert_type:   string
  severity:     'info' | 'warning' | 'critical'
  message_vi:   string
  triggered_at: string
  resolved_at:  string | null
  metadata:     Record<string, unknown>
}

export interface ProvinceMetricRow {
  province_id:   number
  province_name: string
  province_slug: string
  active_listings: number
  leads_30d:     number
  liquidity_score: number | null
}

// ── getMarketplaceDailyMetrics ────────────────────────────────────────────────

export async function getMarketplaceDailyMetrics(
  days: 7 | 30 | 90 = 30,
): Promise<MarketplaceDailyMetric[]> {
  const supabase = await createCachedClient()

  const { data, error } = await supabase
    .from('marketplace_daily_metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(days)

  if (error) {
    console.error('[getMarketplaceDailyMetrics]', error.message)
    return []
  }

  return (data ?? []).reverse() as unknown as MarketplaceDailyMetric[]
}

// ── getTodayMetrics ───────────────────────────────────────────────────────────

export async function getTodayMetrics(): Promise<MarketplaceDailyMetric | null> {
  const admin = await createAdminClient()

  // Trigger a fresh snapshot first
  await (admin.rpc as unknown as (fn: string) => Promise<unknown>)(
    'snapshot_marketplace_metrics',
  )

  const today = new Date().toISOString().slice(0, 10)
  const { data } = await admin
    .from('marketplace_daily_metrics')
    .select('*')
    .eq('date', today)
    .maybeSingle()

  return data as unknown as MarketplaceDailyMetric | null
}

// ── getActiveAlerts ───────────────────────────────────────────────────────────

export async function getActiveAlerts(): Promise<MarketplaceAlert[]> {
  const supabase = await createCachedClient()

  const { data, error } = await supabase
    .from('marketplace_alerts')
    .select('*')
    .is('resolved_at', null)
    .order('triggered_at', { ascending: false })

  if (error) {
    console.error('[getActiveAlerts]', error.message)
    return []
  }

  return (data ?? []) as unknown as MarketplaceAlert[]
}

// ── resolveAlert ──────────────────────────────────────────────────────────────

export async function resolveAlert(
  alertId: number,
  adminId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await createAdminClient()

  const { error } = await admin
    .from('marketplace_alerts')
    .update({ resolved_at: new Date().toISOString(), resolved_by: adminId })
    .eq('id', alertId)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('alert.resolve', 'marketplace_alert', String(alertId), adminId)
  return { ok: true }
}

// ── getGeographicBreakdown ────────────────────────────────────────────────────

export async function getGeographicBreakdown(): Promise<ProvinceMetricRow[]> {
  const supabase = await createCachedClient()

  const { data, error } = await supabase
    .from('province_liquidity_scores')
    .select('province_id, province_name, province_slug, active_listings, leads_30d, score')
    .order('score', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[getGeographicBreakdown]', error.message)
    return []
  }

  return (data ?? []).map((r: {
    province_id: number; province_name: string; province_slug: string;
    active_listings: number; leads_30d: number; score: number;
  }) => ({
    province_id:     r.province_id,
    province_name:   r.province_name,
    province_slug:   r.province_slug,
    active_listings: r.active_listings,
    leads_30d:       r.leads_30d,
    liquidity_score: r.score,
  })) as ProvinceMetricRow[]
}
