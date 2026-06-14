// Server-only. Completeness engine — computes, persists, and reads listing scores.
// Also exports a pure-TS compute function safe for client-side preview
// (called from the listing wizard during editing — no DB writes).

import { createClient } from '@/lib/supabase/server'
import type {
  ListingCompleteness,
  CompletenessTier,
  LegalDocType,
} from '../model/normalized-types'

// ─────────────────────────────────────────────────────────────────────────────
// CompletenessInput
// Flat struct passed to computeCompleteness(). All fields required so
// the caller is explicit about what data it has (no silent nulls).
// ─────────────────────────────────────────────────────────────────────────────

export interface CompletenessInput {
  // Media
  mediaImageCount:   number
  mediaVideoCount:   number

  // GPS (from listing_infrastructure)
  hasGps:            boolean

  // Legal (from listing_legal_metadata or EAV fallback)
  legalDocType:      LegalDocType | string | null

  // Seller
  ownerVerified:     boolean
  ownerProfileExists: boolean

  // Description
  descriptionLength: number

  // Infrastructure (from listing_infrastructure)
  hasRoadAccessData:  boolean   // road_access column IS NOT NULL
  hasWaterSourceData: boolean   // water_source column IS NOT NULL

  // Agriculture (from listing_agriculture)
  hasAnySoilData:    boolean    // row exists (any column set)
  hasSoilType:       boolean
  hasCurrentCrops:   boolean
  hasCertifications: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// CompletenessResult — returned by both the pure-TS and server functions
// ─────────────────────────────────────────────────────────────────────────────

export interface CompletenessResult {
  total:       number
  tier:        CompletenessTier

  // Sub-scores
  photoScore:  number
  gpsScore:    number
  legalScore:  number
  sellerScore: number
  infraScore:  number
  agriScore:   number
  textScore:   number
  videoScore:  number

  // Prioritised next steps shown to seller in dashboard
  nextSteps:   CompletenessStep[]
}

export interface CompletenessStep {
  factor:   string
  label:    string
  gain:     number            // points available if this step is completed
  action:   string            // user-facing Vietnamese instruction
  priority: 'high' | 'medium' | 'low'
}

// ─────────────────────────────────────────────────────────────────────────────
// computeCompleteness — pure TS, no I/O
// Safe to call from client components (listing wizard preview).
// ─────────────────────────────────────────────────────────────────────────────

export function computeCompleteness(i: CompletenessInput): CompletenessResult {
  // Photo score (max 20)
  const photoScore =
    i.mediaImageCount >= 5 ? 20 :
    i.mediaImageCount >= 3 ? 16 :
    i.mediaImageCount >= 2 ? 12 :
    i.mediaImageCount >= 1 ?  6 : 0

  // GPS score (max 10)
  const gpsScore = i.hasGps ? 10 : 0

  // Legal score (max 15)
  const legalScore =
    (i.legalDocType === 'so_do' || i.legalDocType === 'so_hong') ? 15 :
    i.legalDocType === 'giay_tay'                                 ?  7 :
    (i.legalDocType === 'pending' || i.legalDocType === 'contract') ? 3 : 0

  // Seller score (max 10)
  const sellerScore =
    i.ownerVerified       ? 10 :
    i.ownerProfileExists  ?  3 : 0

  // Infrastructure score (max 15)
  let infraScore = 0
  if (i.hasAnySoilData || i.hasRoadAccessData || i.hasWaterSourceData) {
    infraScore = 5  // base: any infra row
    if (i.hasRoadAccessData)  infraScore += 5
    if (i.hasWaterSourceData) infraScore += 5
  }

  // Agriculture score (max 20)
  let agriScore = 0
  if (i.hasAnySoilData || i.hasSoilType || i.hasCurrentCrops || i.hasCertifications) {
    agriScore = 5  // base: any agri row
    if (i.hasSoilType)       agriScore += 5
    if (i.hasCurrentCrops)   agriScore += 5
    if (i.hasCertifications) agriScore += 5
  }

  // Text score (max 5)
  const textScore =
    i.descriptionLength >= 300 ? 5 :
    i.descriptionLength >= 80  ? 3 :
    i.descriptionLength >  0   ? 1 : 0

  // Video score (max 5)
  const videoScore = i.mediaVideoCount > 0 ? 5 : 0

  const total = photoScore + gpsScore + legalScore + sellerScore
              + infraScore + agriScore + textScore + videoScore

  const tier: CompletenessTier =
    total >= 90 ? 'platinum' :
    total >= 75 ? 'gold'     :
    total >= 55 ? 'silver'   : 'bronze'

  // Build prioritised next-steps
  const nextSteps: CompletenessStep[] = []

  if (i.mediaImageCount < 5)
    nextSteps.push({ factor: 'photo',  label: 'Hình ảnh',       gain: 20 - photoScore,
      action:   'Tải lên ít nhất 5 ảnh thực địa chất lượng cao',
      priority: 'high' })

  if (!i.hasGps)
    nextSteps.push({ factor: 'gps',    label: 'Toạ độ GPS',      gain: 10,
      action:   'Ghim vị trí chính xác trên bản đồ',
      priority: 'high' })

  if (legalScore < 15)
    nextSteps.push({ factor: 'legal',  label: 'Pháp lý',         gain: 15 - legalScore,
      action:   'Cập nhật loại sổ, số thửa và mục đích sử dụng',
      priority: 'high' })

  if (!i.hasRoadAccessData)
    nextSteps.push({ factor: 'road',   label: 'Đường vào',       gain: 5,
      action:   'Điền thông tin đường vào và bề rộng đường',
      priority: 'medium' })

  if (!i.hasWaterSourceData)
    nextSteps.push({ factor: 'water',  label: 'Nguồn nước',      gain: 5,
      action:   'Ghi rõ nguồn nước tưới (kênh/giếng/sông/...)',
      priority: 'medium' })

  if (!i.hasSoilType)
    nextSteps.push({ factor: 'soil',   label: 'Loại đất',        gain: 5,
      action:   'Chọn loại đất (phù sa / basalt / cát / sét / ...)',
      priority: 'medium' })

  if (!i.hasCurrentCrops)
    nextSteps.push({ factor: 'crops',  label: 'Cây trồng',       gain: 5,
      action:   'Liệt kê cây trồng hiện tại hoặc đã canh tác',
      priority: 'medium' })

  if (!i.hasCertifications)
    nextSteps.push({ factor: 'certs',  label: 'Chứng nhận',      gain: 5,
      action:   'Thêm chứng nhận VietGAP / GlobalGAP / Hữu cơ nếu có',
      priority: 'low' })

  if (i.mediaVideoCount === 0)
    nextSteps.push({ factor: 'video',  label: 'Video thực địa',  gain: 5,
      action:   'Quay video drone hoặc thực địa để tăng niềm tin',
      priority: 'low' })

  if (i.descriptionLength < 300)
    nextSteps.push({ factor: 'text',   label: 'Mô tả chi tiết',  gain: 5 - textScore,
      action:   'Viết mô tả ít nhất 300 ký tự về lợi thế của mảnh đất',
      priority: 'low' })

  // Sort: priority first, then by gain desc
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 }
  nextSteps.sort((a, b) => (rank[a.priority] - rank[b.priority]) || (b.gain - a.gain))

  return {
    total, tier,
    photoScore, gpsScore, legalScore, sellerScore,
    infraScore, agriScore, textScore, videoScore,
    nextSteps,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// refreshListingCompleteness
// Calls the Postgres SECURITY DEFINER function to persist the score.
// Call after any mutation that affects completeness inputs.
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshListingCompleteness(
  listingId: string,
): Promise<{ success: boolean; score?: number; tier?: CompletenessTier }> {
  const supabase = await createClient()

  const { error } = await (supabase.rpc as unknown as (
    fn: string, args: Record<string, unknown>
  ) => Promise<{ error: unknown }>)(
    'compute_listing_completeness',
    { p_listing_id: listingId },
  )

  if (error) {
    console.error('[refreshListingCompleteness]', (error as { message: string }).message)
    return { success: false }
  }

  const { data } = await supabase
    .from('listing_completeness')
    .select('total_score, tier')
    .eq('listing_id', listingId)
    .maybeSingle()

  const row = data as { total_score: number; tier: CompletenessTier } | null
  return { success: true, score: row?.total_score, tier: row?.tier }
}

// ─────────────────────────────────────────────────────────────────────────────
// getListingCompleteness
// Read the persisted row. Returns null if score has never been computed.
// ─────────────────────────────────────────────────────────────────────────────

export async function getListingCompleteness(
  listingId: string,
): Promise<ListingCompleteness | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listing_completeness')
    .select('*')
    .eq('listing_id', listingId)
    .maybeSingle()

  if (error) {
    console.error('[getListingCompleteness]', error.message)
    return null
  }

  return data as unknown as ListingCompleteness | null
}

// ─────────────────────────────────────────────────────────────────────────────
// refreshSellerCompleteness
// Batch refresh for all published listings owned by a user.
// Call after seller verification status changes.
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshSellerCompleteness(
  userId: string,
): Promise<{ refreshed: number; errors: number }> {
  const supabase = await createClient()

  const { data: listings } = await supabase
    .from('listings')
    .select('id')
    .eq('owner_id', userId)
    .in('status', ['published', 'paused'])

  if (!listings?.length) return { refreshed: 0, errors: 0 }

  let refreshed = 0, errors = 0
  await Promise.all(
    listings.map(async (l) => {
      const r = await refreshListingCompleteness(l.id)
      if (r.success) { refreshed++ } else { errors++ }
    }),
  )

  return { refreshed, errors }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER_CONFIG — display metadata for completeness tiers
// Import this in UI components to avoid duplicating labels/colors.
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_CONFIG: Record<CompletenessTier, {
  label:   string
  color:   string
  bgClass: string
  min:     number
}> = {
  platinum: { label: 'Tin xuất sắc',    color: '#1A4D2E', bgClass: 'bg-[#E8F0EB]', min: 90 },
  gold:     { label: 'Tin chất lượng', color: '#2D7A4F', bgClass: 'bg-[#EAF5EE]', min: 75 },
  silver:   { label: 'Tin đầy đủ',     color: '#B45309', bgClass: 'bg-[#FFF5E6]', min: 55 },
  bronze:   { label: 'Cần bổ sung',    color: '#DC2626', bgClass: 'bg-[#FFF0EF]', min: 0  },
}
