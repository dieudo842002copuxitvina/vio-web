'use server'

import { createCachedClient, createAdminClient } from '@/lib/supabase/server'
import { anthropicClient, AI_MODEL }             from '@/lib/ai/anthropic'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiListingSummary {
  listing_id:     string
  summary_vi:     string
  generated_at:   string
  model:          string
  prompt_version: number
}

// ── generateListingSummary ────────────────────────────────────────────────────
// Builds a Vietnamese marketing summary using listing data already in the DB.

export async function generateListingSummary(
  listingId: string,
): Promise<string | null> {
  const supabase = await createAdminClient()

  // Fetch listing details for the prompt
  const { data: listing } = await supabase
    .from('listings')
    .select('title, description, price_text, location_text, province_id')
    .eq('id', listingId)
    .single()

  if (!listing) return null

  const l = listing as unknown as {
    title: string; description: string | null; price_text: string | null
    location_text: string | null
  }

  // Fetch sub-entities
  const [{ data: infra }, { data: agri }, { data: legal }] = await Promise.all([
    supabase.from('listing_infrastructure').select('road_access, water_source, electricity_access, terrain').eq('listing_id', listingId).maybeSingle(),
    supabase.from('listing_agriculture').select('soil_type, current_crops, irrigation_type, certifications').eq('listing_id', listingId).maybeSingle(),
    supabase.from('listing_legal_metadata').select('legal_doc_type, doc_verified, is_disputable').eq('listing_id', listingId).maybeSingle(),
  ])

  const infraText = infra ? [
    infra.road_access ? 'Có đường vào' : null,
    infra.electricity_access ? 'Có điện' : null,
    infra.water_source && infra.water_source !== 'none' ? `Nguồn nước: ${infra.water_source}` : null,
  ].filter(Boolean).join(', ') : ''

  const agriText = agri ? [
    agri.soil_type ? `Đất ${agri.soil_type}` : null,
    agri.current_crops?.length ? `Đang trồng: ${(agri.current_crops as string[]).join(', ')}` : null,
    agri.certifications?.length ? `Chứng nhận: ${(agri.certifications as string[]).join(', ')}` : null,
  ].filter(Boolean).join('. ') : ''

  const legalText = legal
    ? legal.legal_doc_type === 'so_do' ? 'Sổ đỏ đầy đủ'
      : legal.legal_doc_type === 'so_hong' ? 'Sổ hồng đầy đủ'
      : 'Giấy tờ pháp lý đang hoàn thiện'
    : ''

  const prompt = `Bạn là chuyên gia bất động sản nông nghiệp Việt Nam. Viết 2–3 câu mô tả hấp dẫn và chuyên nghiệp bằng tiếng Việt cho thửa đất sau. Tập trung vào giá trị nổi bật và tiềm năng đầu tư. Không lặp lại thông tin giá/địa điểm.

Thông tin:
- Tiêu đề: ${l.title}
- Địa điểm: ${l.location_text ?? 'chưa rõ'}
- Giá: ${l.price_text ?? 'thương lượng'}
- Cơ sở hạ tầng: ${infraText || 'chưa cung cấp'}
- Canh tác: ${agriText || 'chưa cung cấp'}
- Pháp lý: ${legalText || 'chưa rõ'}
${l.description ? `- Mô tả thêm: ${l.description.slice(0, 300)}` : ''}

Chỉ trả lời bằng đoạn mô tả ngắn (2–3 câu), không có tiêu đề hay ghi chú thêm.`

  let summaryVi: string
  try {
    const message = await anthropicClient.messages.create({
      model:      AI_MODEL,
      max_tokens: 256,
      messages:   [{ role: 'user', content: prompt }],
    })
    const block = message.content[0]
    summaryVi = block?.type === 'text' ? block.text.trim() : ''
  } catch {
    return null
  }

  if (!summaryVi) return null

  // Cache in DB
  await supabase
    .from('ai_listing_summaries')
    .upsert({
      listing_id:     listingId,
      summary_vi:     summaryVi,
      generated_at:   new Date().toISOString(),
      model:          AI_MODEL,
      prompt_version: 1,
    }, { onConflict: 'listing_id' })

  return summaryVi
}

// ── getOrGenerateListingSummary ────────────────────────────────────────────────

export async function getOrGenerateListingSummary(
  listingId: string,
): Promise<string | null> {
  const supabase = await createCachedClient()

  // Check cache first
  const { data: cached } = await supabase
    .from('ai_listing_summaries')
    .select('summary_vi, generated_at')
    .eq('listing_id', listingId)
    .maybeSingle()

  if (cached) {
    // Regenerate if older than 30 days
    const age = Date.now() - new Date((cached as { generated_at: string }).generated_at).getTime()
    if (age < 30 * 24 * 3_600_000) {
      return (cached as { summary_vi: string }).summary_vi
    }
  }

  return generateListingSummary(listingId)
}
