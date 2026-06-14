'use server'

import { revalidatePath }    from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { writeAuditLog }     from '@/features/admin/api/audit.server'
import { grantPro }          from './admin.server'
import { activateFeaturedListing } from './admin.server'
import { assignExperimentVariant } from '@/features/experiments/api/experiments.server'
import { PRODUCT_CATALOG, type PaymentProductType } from './billing-constants'

export interface PaymentRequest {
  id:              string
  user_id:         string
  product_type:    PaymentProductType
  product_id:      string | null
  amount_vnd:      number
  reference_code:  string | null
  status:          string
  metadata:        Record<string, unknown> | null
  created_at:      string
  completed_at:    string | null
  confirmed_by:    string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'VIO'
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ── createPaymentRequest ──────────────────────────────────────────────────────

export async function createPaymentRequest(
  productType: PaymentProductType,
  productId?:  string,
  metadata?:   Record<string, unknown>,
  sessionId?:  string,
): Promise<{ ok: boolean; request?: PaymentRequest; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Chưa đăng nhập.' }

  const product   = PRODUCT_CATALOG[productType]
  const refCode   = generateReferenceCode()

  // Assign experiment variant if a running experiment exists for this product
  const experiment = sessionId
    ? await assignExperimentVariant(productType, sessionId)
    : { experimentId: null, variant: 'a' as const, price: 0 }

  const effectivePrice = experiment.experimentId ? experiment.price : product.amount_vnd

  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      user_id:             user.id,
      product_type:        productType,
      product_id:          productId ?? null,
      amount_vnd:          effectivePrice,
      reference_code:      refCode,
      status:              'pending',
      experiment_id:       experiment.experimentId ?? null,
      experiment_variant:  experiment.experimentId ? experiment.variant : null,
      metadata:            metadata ?? null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, request: data as unknown as PaymentRequest }
}

// ── markPendingConfirm ─────────────────────────────────────────────────────────

export async function markPendingConfirm(
  requestId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Chưa đăng nhập.' }

  const { error } = await supabase
    .from('payment_requests')
    .update({ status: 'pending_confirm' })
    .eq('id', requestId)
    .eq('user_id', user.id)   // ensure ownership
    .eq('status',  'pending')

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ── confirmPayment (admin) ─────────────────────────────────────────────────────

export async function confirmPayment(
  requestId: string,
  adminId:   string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient()

  // Fetch the request
  const { data: req } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (!req) return { ok: false, error: 'Không tìm thấy yêu cầu thanh toán.' }
  const r = req as unknown as PaymentRequest

  if (r.status === 'completed') return { ok: false, error: 'Đã xác nhận trước đó.' }

  // Activate product
  let activationError: string | undefined
  const product = PRODUCT_CATALOG[r.product_type]

  switch (r.product_type) {
    case 'boost_7d':
    case 'boost_30d':
    case 'spotlight': {
      if (!r.product_id) { activationError = 'Thiếu listing_id cho boost.'; break }
      const res = await activateFeaturedListing(
        r.product_id,
        r.user_id,
        product.priority ?? 50,
        product.days,
      )
      if (!res.ok) activationError = res.error
      break
    }
    case 'pro_monthly': {
      const res = await grantPro(r.user_id, adminId, product.days)
      if (!res.ok) activationError = res.error
      break
    }
    case 'seller_verification': {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: true, updated_at: new Date().toISOString() })
        .eq('id', r.user_id)
      if (error) activationError = error.message
      // Trigger trust score refresh async
      void supabase.rpc('compute_seller_trust_score', { p_user_id: r.user_id })
      break
    }
    case 'legal_review': {
      if (r.product_id) {
        await supabase
          .from('legal_review_requests')
          .update({ status: 'in_progress' })
          .eq('id', r.product_id)
      }
      break
    }
  }

  if (activationError) return { ok: false, error: activationError }

  // Mark completed
  const { error: updateErr } = await supabase
    .from('payment_requests')
    .update({
      status:        'completed',
      completed_at:  new Date().toISOString(),
      confirmed_by:  adminId,
    })
    .eq('id', requestId)

  if (updateErr) return { ok: false, error: updateErr.message }

  await writeAuditLog('payment.confirm', 'payment_request', requestId, adminId, {
    product_type: r.product_type,
    amount_vnd:   r.amount_vnd,
    user_id:      r.user_id,
  })

  revalidatePath('/admin/payments')
  revalidatePath('/admin/revenue')
  return { ok: true }
}

// ── rejectPayment (admin) ──────────────────────────────────────────────────────

export async function rejectPayment(
  requestId: string,
  adminId:   string,
  reason:    string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('payment_requests')
    .update({ status: 'failed' })
    .eq('id', requestId)
    .in('status', ['pending', 'pending_confirm'])

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('payment.reject', 'payment_request', requestId, adminId, { reason })
  revalidatePath('/admin/payments')
  return { ok: true }
}

// ── getPaymentRequests (admin) ─────────────────────────────────────────────────

export async function getPaymentRequests(
  status?: string,
  page    = 1,
  limit   = 30,
): Promise<{ items: PaymentRequest[]; total: number }> {
  const supabase = await createAdminClient()
  const from = (page - 1) * limit

  let q = supabase
    .from('payment_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status) q = q.eq('status', status)

  const { data, count } = await q
  return {
    items: (data ?? []) as unknown as PaymentRequest[],
    total: count ?? 0,
  }
}

// ── getUserPaymentHistory ──────────────────────────────────────────────────────

export async function getUserPaymentHistory(): Promise<PaymentRequest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []) as unknown as PaymentRequest[]
}

// ── getRevenueStats (admin) ────────────────────────────────────────────────────

export interface RevenueStats {
  total_completed_vnd:    number
  by_product_type:        Record<string, number>
  mrr_vnd:                number
  pending_count:          number
  pending_confirm_count:  number
}

export async function getRevenueStats(): Promise<RevenueStats> {
  const supabase = await createAdminClient()

  const [completedRes, subscriptionsRes, pendingRes] = await Promise.all([
    supabase
      .from('payment_requests')
      .select('product_type, amount_vnd')
      .eq('status', 'completed'),
    supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('status', 'active')
      .eq('plan_id', 'pro'),
    supabase
      .from('payment_requests')
      .select('status')
      .in('status', ['pending', 'pending_confirm']),
  ])

  const completed  = (completedRes.data ?? []) as { product_type: string; amount_vnd: number }[]
  const by_product = {} as Record<string, number>
  let total = 0
  for (const r of completed) {
    by_product[r.product_type] = (by_product[r.product_type] ?? 0) + r.amount_vnd
    total += r.amount_vnd
  }

  const proCount = (subscriptionsRes.data ?? []).length
  const pending  = (pendingRes.data ?? []) as { status: string }[]

  return {
    total_completed_vnd:   total,
    by_product_type:       by_product,
    mrr_vnd:               proCount * 299_000,
    pending_count:         pending.filter(r => r.status === 'pending').length,
    pending_confirm_count: pending.filter(r => r.status === 'pending_confirm').length,
  }
}
