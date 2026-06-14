'use server'

import { createAdminClient }      from '@/lib/supabase/server'
import { anthropicClient, AI_MODEL } from '@/lib/ai/anthropic'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QualityReview {
  passed:               boolean
  issues:               string[]
  suggestions:          string[]
  auto_approve_eligible: boolean
}

// ── reviewListingQuality ──────────────────────────────────────────────────────
// Called from moderation queue to pre-score pending listings.
// Returns structured quality flags to assist moderators.

export async function reviewListingQuality(
  listingId: string,
): Promise<QualityReview> {
  const supabase = await createAdminClient()

  const [listingRes, completenessRes] = await Promise.all([
    supabase
      .from('listings')
      .select('title, description, price_text, price_amount, location_text, contact_phone')
      .eq('id', listingId)
      .single(),
    supabase
      .from('listing_completeness')
      .select('total_score, tier, photo_score, gps_score, legal_score')
      .eq('listing_id', listingId)
      .maybeSingle(),
  ])

  if (!listingRes.data) {
    return { passed: false, issues: ['Không tìm thấy tin đăng.'], suggestions: [], auto_approve_eligible: false }
  }

  const listing     = listingRes.data as unknown as {
    title: string; description: string | null; price_text: string | null
    price_amount: number | null; location_text: string | null; contact_phone: string | null
  }
  const completeness = completenessRes.data as unknown as {
    total_score: number; tier: string; photo_score: number; gps_score: number; legal_score: number
  } | null

  const prompt = `Bạn là kiểm duyệt viên cho sàn bất động sản nông nghiệp VIO AGRI. Đánh giá chất lượng tin đăng sau.

Thông tin:
- Tiêu đề: ${listing.title}
- Giá: ${listing.price_text ?? 'không có'}
- Giá số: ${listing.price_amount ?? 'không có'}
- Địa điểm: ${listing.location_text ?? 'không có'}
- Mô tả: ${(listing.description ?? '').slice(0, 500) || 'không có'}
- Điện thoại liên hệ: ${listing.contact_phone ?? 'không có'}
- Điểm hoàn thiện: ${completeness?.total_score ?? 0}/100 (${completeness?.tier ?? 'bronze'})

Trả lời CHÍNH XÁC theo định dạng JSON sau (không có text thêm):
{
  "passed": true hoặc false,
  "issues": ["vấn đề 1", "vấn đề 2"],
  "suggestions": ["gợi ý 1", "gợi ý 2"]
}

Đánh giá "passed: false" nếu: tiêu đề quá ngắn (<10 ký tự), giá bất thường (quá cao/thấp so với thị trường), mô tả rỗng hoặc spam, không có số điện thoại.
Đánh giá "passed: true" nếu thông tin cơ bản đầy đủ và hợp lý.`

  try {
    const message = await anthropicClient.messages.create({
      model:      AI_MODEL,
      max_tokens: 512,
      messages:   [{ role: 'user', content: prompt }],
    })

    const block  = message.content[0]
    const text   = block?.type === 'text' ? block.text.trim() : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0]) as {
      passed: boolean; issues: string[]; suggestions: string[]
    }

    const tier = completeness?.tier ?? 'bronze'
    const autoApproveEligible =
      parsed.passed &&
      (tier === 'gold' || tier === 'platinum') &&
      (completeness?.total_score ?? 0) >= 75

    return {
      passed:               Boolean(parsed.passed),
      issues:               Array.isArray(parsed.issues)      ? parsed.issues      : [],
      suggestions:          Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      auto_approve_eligible: autoApproveEligible,
    }
  } catch {
    // Fallback: basic rule-based check if AI fails
    const issues: string[] = []
    if (!listing.title || listing.title.length < 10) issues.push('Tiêu đề quá ngắn')
    if (!listing.description)                        issues.push('Thiếu mô tả')
    if (!listing.contact_phone)                      issues.push('Thiếu số điện thoại')
    if (!listing.price_text && !listing.price_amount) issues.push('Thiếu thông tin giá')

    return {
      passed:               issues.length === 0,
      issues,
      suggestions:          [],
      auto_approve_eligible: false,
    }
  }
}
