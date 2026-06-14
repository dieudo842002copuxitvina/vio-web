// ── Subscription query layer ───────────────────────────────────────────────────
//
// getSubscriptionFeatures(profileId)  — feature flags for the current plan
// getActiveSubscription(profileId)    — raw subscription row (or null = Free)
// getListingCount(profileId)          — non-archived listing count for quota gate
// getBillingMetrics()                 — admin aggregate metrics
//
// All reads use the authenticated anon client (RLS: users see their own row).
// Cache: 5 min per profileId; invalidated by revalidateTag('billing').

import { unstable_cache }    from 'next/cache'
import { createClient, createCachedClient } from '@/lib/supabase/server'
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
} from '../types'
import type { PlanFeatures, Subscription } from '../types'

// ── getSubscriptionFeatures ───────────────────────────────────────────────────

export async function getSubscriptionFeatures(
  profileId: string,
): Promise<PlanFeatures> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_id, status')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .maybeSingle()
    if (!data) return FREE_PLAN_FEATURES
    return data.plan_id === 'pro' ? PRO_PLAN_FEATURES : FREE_PLAN_FEATURES
  } catch (err) {
    console.error('[getSubscriptionFeatures]', (err as Error).message)
    return FREE_PLAN_FEATURES
  }
}

// ── getActiveSubscription ─────────────────────────────────────────────────────

export async function getActiveSubscription(
  profileId: string,
): Promise<Subscription | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .maybeSingle()

    return data as Subscription | null
  } catch (err) {
    console.error('[getActiveSubscription]', (err as Error).message)
    return null
  }
}

// ── getListingCount ───────────────────────────────────────────────────────────
// Returns non-archived listing count for a profile.
// Used in dang-tin/layout.tsx and dang-tin-dat/layout.tsx quota gates.

export async function getListingCount(profileId: string): Promise<number> {
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', profileId)
      .neq('status', 'archived')

    return count ?? 0
  } catch (err) {
    console.error('[getListingCount]', (err as Error).message)
    return 0
  }
}

// ── getBillingMetrics (admin) ─────────────────────────────────────────────────

export interface BillingMetrics {
  totalFreeUsers:         number
  totalProUsers:          number
  mrrVnd:                 number
  featuredListingsActive: number
  conversionRate:         number
}

const _cachedBillingMetrics = unstable_cache(
  async (): Promise<BillingMetrics> => {
    const supabase = createCachedClient()

    const [proRes, freeRes, featuredRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('plan_id', 'pro')
        .eq('status', 'active'),

      supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('plan_id', 'free')
        .eq('status', 'active'),

      supabase
        .from('featured_listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])

    const proCount      = proRes.count      ?? 0
    const freeCount     = freeRes.count     ?? 0
    const featuredCount = featuredRes.count ?? 0
    const total         = proCount + freeCount

    return {
      totalFreeUsers:         freeCount,
      totalProUsers:          proCount,
      mrrVnd:                 proCount * 299_000,
      featuredListingsActive: featuredCount,
      conversionRate:         total > 0 ? proCount / total : 0,
    }
  },
  ['billing', 'metrics'],
  { revalidate: 300, tags: ['billing'] },
)

export async function getBillingMetrics(): Promise<BillingMetrics> {
  try {
    return await _cachedBillingMetrics()
  } catch (err) {
    console.error('[getBillingMetrics]', (err as Error).message)
    return {
      totalFreeUsers: 0, totalProUsers: 0,
      mrrVnd: 0, featuredListingsActive: 0, conversionRate: 0,
    }
  }
}
