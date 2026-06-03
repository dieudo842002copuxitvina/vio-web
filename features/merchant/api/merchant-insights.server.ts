'use server'

// ── Merchant Insights — per-listing intelligence layer ────────────────────────
//
// Assembles all signal sources for one merchant in parallel:
//
//   Query 1  listings            owned by merchant (IDs + geo/category context)
//   Query 2  listing_performance 7d engagement (views, CTR, save_rate, contact_rate)
//   Query 3  listing_ctr_stats   24h impression window
//   Query 4  trending_listings   province / category / national rank positions
//   Query 5  getLeadScores()     behavioral leads grouped by listing (cached)
//   Query 6  trending_keywords   top search keywords for merchant's province(s)
//
// Total: 5 real DB queries + 1 cache read, no N+1.
// Cache: 5 min — matches the shortest cron refresh window.

import { unstable_cache } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'
import { getLeadScores }  from '@/features/leads/api/lead-score.server'
import type { BehavioralLead } from '@/features/leads/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ListingInsight {
  // Identity
  listingId:    string
  listingTitle: string | null
  listingSlug:  string | null
  provinceId:   number | null
  categoryId:   number | null

  // Engagement (7d unless noted)
  views24h:    number
  views7d:     number
  ctr:         number   // ratio [0,1]
  saveRate:    number   // ratio [0,1]
  contactRate: number   // inquiry / impression ratio [0,1]

  // Ranking positions — null = not in trending table
  provinceRank:  number | null
  categoryRank:  number | null
  trendingRank:  number | null   // national scope

  // Behavioral lead intelligence
  leadCount:        number
  hotLeadCount:     number
  veryHotLeadCount: number

  // Province-level trending search keywords (≤5)
  topKeywords: string[]
}

// ── Core query ────────────────────────────────────────────────────────────────

const _cachedInsights = unstable_cache(
  async (merchantId: string): Promise<ListingInsight[]> => {
    const supabase = await createClient()

    // ── 1. Merchant's published listings ────────────────────────────────────
    const { data: listingRows, error: listingErr } = await supabase
      .from('listings')
      .select('id, title, slug, province_id, category_id')
      .eq('owner_id', merchantId)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (listingErr || !listingRows?.length) return []

    type LRow = { id: string; title: string; slug: string; province_id: number | null; category_id: number | null }
    const listings = listingRows as LRow[]
    const listingIds = listings.map(l => l.id)
    const provinceIds = [...new Set(listings.map(l => l.province_id).filter((p): p is number => p != null))]

    // ── 2–6. Parallel fetches ────────────────────────────────────────────────
    const [perfResult, ctrResult, trendResult, leads, kwResult] = await Promise.all([

      // listing_performance → 7d engagement metrics
      supabase
        .from('listing_performance')
        .select('listing_id, impressions_7d, ctr_7d, save_rate_7d, inquiry_rate_7d')
        .in('listing_id', listingIds),

      // listing_ctr_stats → 24h impression count
      supabase
        .from('listing_ctr_stats')
        .select('listing_id, impressions_1d')
        .in('listing_id', listingIds),

      // trending_listings → national / province / category rank positions
      supabase
        .from('trending_listings')
        .select('listing_id, scope_type, scope_id, rank_position')
        .in('listing_id', listingIds)
        .in('scope_type', ['national', 'province', 'category']),

      // behavioral lead scores (cached 5 min via getLeadScores)
      getLeadScores(merchantId),

      // trending keywords for merchant's provinces + national (province_id = 0)
      provinceIds.length > 0
        ? supabase
            .from('trending_keywords')
            .select('keyword, province_id, rank_position')
            .in('province_id', [...provinceIds, 0])
            .order('rank_position', { ascending: true })
            .limit(100)
        : supabase
            .from('trending_keywords')
            .select('keyword, province_id, rank_position')
            .eq('province_id', 0)
            .order('rank_position', { ascending: true })
            .limit(20),
    ])

    // ── Build lookup maps ────────────────────────────────────────────────────

    type PerfRow = {
      listing_id: string
      impressions_7d: number
      ctr_7d: number
      save_rate_7d: number
      inquiry_rate_7d: number
    }
    const perfMap = new Map<string, PerfRow>(
      ((perfResult.data ?? []) as PerfRow[]).map(r => [r.listing_id, r]),
    )

    type CtrRow = { listing_id: string; impressions_1d: number }
    const ctrMap = new Map<string, number>(
      ((ctrResult.data ?? []) as CtrRow[]).map(r => [r.listing_id, r.impressions_1d ?? 0]),
    )

    type TrendRow = { listing_id: string; scope_type: string; scope_id: number; rank_position: number }
    const trendingMap = new Map<string, { national?: number; province?: number; category?: number }>()
    for (const row of (trendResult.data ?? []) as TrendRow[]) {
      const entry = trendingMap.get(row.listing_id) ?? {}
      if (row.scope_type === 'national')  entry.national  = row.rank_position
      if (row.scope_type === 'province')  entry.province  = row.rank_position
      if (row.scope_type === 'category')  entry.category  = row.rank_position
      trendingMap.set(row.listing_id, entry)
    }

    // Group behavioral leads by listing
    const leadsByListing = new Map<string, BehavioralLead[]>()
    for (const lead of leads) {
      const arr = leadsByListing.get(lead.listingId) ?? []
      arr.push(lead)
      leadsByListing.set(lead.listingId, arr)
    }

    // Keywords indexed by province_id, up to 5 per province
    type KwRow = { keyword: string; province_id: number; rank_position: number }
    const kwByProvince = new Map<number, string[]>()
    for (const row of (kwResult.data ?? []) as KwRow[]) {
      const arr = kwByProvince.get(row.province_id) ?? []
      if (arr.length < 5) {
        arr.push(row.keyword)
        kwByProvince.set(row.province_id, arr)
      }
    }

    // ── Assemble insight rows ────────────────────────────────────────────────
    return listings.map(l => {
      const perf     = perfMap.get(l.id)
      const views24h = ctrMap.get(l.id) ?? 0
      const ranking  = trendingMap.get(l.id) ?? {}
      const listingLeads = leadsByListing.get(l.id) ?? []

      // Province keywords first, fall back to national (province_id=0)
      const keywords =
        (l.province_id != null ? kwByProvince.get(l.province_id) : null) ??
        kwByProvince.get(0) ??
        []

      return {
        listingId:    l.id,
        listingTitle: l.title,
        listingSlug:  l.slug,
        provinceId:   l.province_id,
        categoryId:   l.category_id,

        views24h,
        views7d:     perf?.impressions_7d  ?? 0,
        ctr:         perf?.ctr_7d          ?? 0,
        saveRate:    perf?.save_rate_7d    ?? 0,
        contactRate: perf?.inquiry_rate_7d ?? 0,

        provinceRank:  ranking.province ?? null,
        categoryRank:  ranking.category ?? null,
        trendingRank:  ranking.national ?? null,

        leadCount:        listingLeads.length,
        hotLeadCount:     listingLeads.filter(ld => ld.temperature === 'hot').length,
        veryHotLeadCount: listingLeads.filter(ld => ld.temperature === 'very_hot').length,

        topKeywords: keywords.slice(0, 5),
      }
    })
  },
  ['merchant', 'insights'],
  { revalidate: 300, tags: ['listings', 'recommendations', 'leads'] },
)

export async function getMerchantInsights(merchantId: string): Promise<ListingInsight[]> {
  try {
    return await _cachedInsights(merchantId)
  } catch (err) {
    console.error('[getMerchantInsights]', (err as Error).message)
    return []
  }
}
