// Server-only. Seller trust score read and refresh functions.
// Trust score is computed by the compute_seller_trust_score() Postgres function
// and persisted in seller_trust_scores. This module provides the TypeScript layer.

import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SellerTrustTier = 'new' | 'standard' | 'trusted' | 'verified_pro'

export interface SellerTrustScore {
  user_id:                string
  total_score:            number   // 0–100
  verification_score:     number   // 0–30
  response_score:         number   // 0–25
  quality_score:          number   // 0–20
  completion_score:       number   // 0–15
  tenure_score:           number   // 0–10
  tier:                   SellerTrustTier
  active_listing_count:   number
  completed_sales:        number
  response_rate_pct:      number | null
  avg_response_hours:     number | null
  avg_completeness_score: number | null
  computed_at:            string
}

export const TRUST_TIER_CONFIG: Record<SellerTrustTier, {
  label:    string
  color:    string     // Tailwind text-*
  bgClass:  string     // Tailwind bg-*
  min:      number
}> = {
  verified_pro: { label: 'Chứng nhận Pro', color: 'text-amber-700',  bgClass: 'bg-amber-50',  min: 80 },
  trusted:      { label: 'Tin cậy',        color: 'text-vio-forest', bgClass: 'bg-green-50',  min: 60 },
  standard:     { label: 'Tiêu chuẩn',     color: 'text-blue-700',   bgClass: 'bg-blue-50',   min: 35 },
  new:          { label: 'Mới',            color: 'text-gray-500',   bgClass: 'bg-gray-50',   min: 0  },
}

// ─────────────────────────────────────────────────────────────────────────────
// getSellerTrustScore
// ─────────────────────────────────────────────────────────────────────────────

export async function getSellerTrustScore(
  userId: string,
): Promise<SellerTrustScore | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('seller_trust_scores')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[getSellerTrustScore]', error.message)
    return null
  }

  return data as unknown as SellerTrustScore | null
}

// ─────────────────────────────────────────────────────────────────────────────
// refreshSellerTrustScore — calls Postgres compute function, then reads back
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshSellerTrustScore(
  userId: string,
): Promise<{ success: boolean; score?: SellerTrustScore; error?: string }> {
  try {
    const supabase = await createClient()

    const { error: rpcError } = await (supabase.rpc as unknown as (
      fn: string, args: Record<string, unknown>
    ) => Promise<{ error: unknown }>)(
      'compute_seller_trust_score',
      { p_user_id: userId },
    )

    if (rpcError) {
      return { success: false, error: (rpcError as { message: string }).message }
    }

    const score = await getSellerTrustScore(userId)
    return { success: true, score: score ?? undefined }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[refreshSellerTrustScore]', msg)
    return { success: false, error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrRefreshTrustScore — reads cache, triggers refresh if stale (>24 h)
// Used on public listing detail page to show seller trust badge.
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrRefreshTrustScore(
  userId: string,
): Promise<SellerTrustScore | null> {
  const existing = await getSellerTrustScore(userId)

  if (existing) {
    const ageMs = Date.now() - new Date(existing.computed_at).getTime()
    if (ageMs < 24 * 3_600_000) return existing    // fresh enough
  }

  // Fire refresh but don't block the request
  void refreshSellerTrustScore(userId)
  return existing   // return stale data (or null if first-run)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-score breakdown helper — used in seller analytics dashboard
// ─────────────────────────────────────────────────────────────────────────────

export interface TrustScoreBreakdown {
  label:    string
  score:    number
  max:      number
  tip:      string
}

export function getTrustScoreBreakdown(ts: SellerTrustScore): TrustScoreBreakdown[] {
  return [
    {
      label: 'Xác minh danh tính',
      score: ts.verification_score,
      max:   30,
      tip:   ts.verification_score < 30
        ? 'Xác minh CCCD để đạt tối đa 30 điểm'
        : 'Đã xác minh đầy đủ',
    },
    {
      label: 'Tỷ lệ phản hồi',
      score: ts.response_score,
      max:   25,
      tip:   ts.response_score < 25
        ? `Phản hồi nhanh hơn — hiện ${ts.response_rate_pct ?? 0}% tin nhắn được trả lời`
        : 'Tỷ lệ phản hồi tốt',
    },
    {
      label: 'Chất lượng tin đăng',
      score: ts.quality_score,
      max:   20,
      tip:   ts.quality_score < 20
        ? 'Bổ sung ảnh, GPS và thông tin nông nghiệp để tăng điểm'
        : 'Tin đăng đầy đủ thông tin',
    },
    {
      label: 'Giao dịch hoàn thành',
      score: ts.completion_score,
      max:   15,
      tip:   ts.completion_score < 15
        ? `Hiện ${ts.completed_sales} giao dịch thành công`
        : 'Lịch sử giao dịch tốt',
    },
    {
      label: 'Thâm niên',
      score: ts.tenure_score,
      max:   10,
      tip:   ts.tenure_score < 10
        ? 'Tăng theo thời gian hoạt động trên nền tảng'
        : 'Thâm niên tối đa',
    },
  ]
}
