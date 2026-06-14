'use server'

import { revalidatePath }                          from 'next/cache'
import { createAdminClient, createCachedClient }   from '@/lib/supabase/server'
import { writeAuditLog }                           from '@/features/admin/api/audit.server'
import type { PaymentProductType }                 from '@/features/billing/api/billing-constants'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'ended'

export interface PricingExperiment {
  id:                   string
  experiment_name:      string
  product_type:         PaymentProductType
  status:               ExperimentStatus
  variant_a_price:      number
  variant_a_label:      string
  variant_b_price:      number
  variant_b_label:      string
  traffic_split_pct:    number
  start_date:           string | null
  end_date:             string | null
  variant_a_views:      number
  variant_a_checkouts:  number
  variant_b_views:      number
  variant_b_checkouts:  number
  created_at:           string
}

export interface ExperimentStats {
  variant:          string
  views:            number
  checkouts:        number
  completions:      number
  revenue_vnd:      number
  conversion_rate:  number
  revenue_per_view: number
}

export interface CreateExperimentData {
  experiment_name:   string
  product_type:      PaymentProductType
  variant_a_price:   number
  variant_a_label?:  string
  variant_b_price:   number
  variant_b_label?:  string
  traffic_split_pct?: number
  start_date?:        string
  end_date?:          string
}

// ── getExperiments ────────────────────────────────────────────────────────────

export async function getExperiments(): Promise<PricingExperiment[]> {
  const supabase = await createCachedClient()

  const { data, error } = await supabase
    .from('pricing_experiments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getExperiments]', error.message)
    return []
  }

  return (data ?? []) as unknown as PricingExperiment[]
}

// ── getExperimentStats ────────────────────────────────────────────────────────

export async function getExperimentStats(id: string): Promise<ExperimentStats[]> {
  const admin = await createAdminClient()

  const { data, error } = await (admin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>)(
    'get_experiment_stats',
    { p_id: id },
  )

  if (error) {
    console.error('[getExperimentStats]', (error as { message: string }).message)
    return []
  }

  return (data as unknown as ExperimentStats[]) ?? []
}

// ── createExperiment ──────────────────────────────────────────────────────────

export async function createExperiment(
  data:    CreateExperimentData,
  adminId: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const admin = await createAdminClient()

  const { data: row, error } = await admin
    .from('pricing_experiments')
    .insert({
      ...data,
      created_by: adminId,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('experiment.create', 'pricing_experiment', row.id, adminId, {
    name: data.experiment_name,
    product: data.product_type,
  })

  revalidatePath('/admin/experiments')
  return { ok: true, id: row.id }
}

// ── startExperiment ───────────────────────────────────────────────────────────

export async function startExperiment(
  id:      string,
  adminId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await createAdminClient()

  const { error } = await admin
    .from('pricing_experiments')
    .update({ status: 'running', start_date: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('experiment.start', 'pricing_experiment', id, adminId)
  revalidatePath('/admin/experiments')
  return { ok: true }
}

// ── endExperiment ─────────────────────────────────────────────────────────────

export async function endExperiment(
  id:      string,
  adminId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await createAdminClient()

  const { error } = await admin
    .from('pricing_experiments')
    .update({ status: 'ended', end_date: new Date().toISOString() })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('experiment.end', 'pricing_experiment', id, adminId)
  revalidatePath('/admin/experiments')
  return { ok: true }
}

// ── assignExperimentVariant ───────────────────────────────────────────────────
// Deterministic: same session always gets same variant. No DB write at assignment.

export async function assignExperimentVariant(
  productType: PaymentProductType,
  sessionId:   string,
): Promise<{ experimentId: string | null; variant: 'a' | 'b'; price: number }> {
  const supabase = await createCachedClient()

  const { data } = await supabase
    .from('pricing_experiments')
    .select('id, variant_a_price, variant_b_price, traffic_split_pct')
    .eq('product_type', productType)
    .eq('status', 'running')
    .limit(1)
    .maybeSingle()

  if (!data) {
    return { experimentId: null, variant: 'a', price: 0 }
  }

  // Deterministic hash: sum of char codes % 100
  const hash = sessionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100
  const variant: 'a' | 'b' = hash < data.traffic_split_pct ? 'b' : 'a'

  return {
    experimentId: data.id,
    variant,
    price: variant === 'b' ? data.variant_b_price : data.variant_a_price,
  }
}
