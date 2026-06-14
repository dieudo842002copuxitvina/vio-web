'use server'

import { createClient }  from '@/lib/supabase/server'
import { trackInquiry }  from '@/features/signals/api/tracking.server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VisitRequestInput {
  listingId:     string
  contactName:   string
  contactPhone:  string
  preferredDate: string   // ISO date string YYYY-MM-DD
  preferredTime: string   // e.g. "Sáng" | "Chiều" | "Tối"
  message:       string
}

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

// ── Validation ────────────────────────────────────────────────────────────────

function validateVisitRequest(input: VisitRequestInput): string | null {
  if (!input.listingId?.trim())   return 'Thiếu ID tin đăng.'
  if (!input.contactName?.trim()) return 'Vui lòng nhập họ tên.'
  if (input.contactName.length > 100) return 'Họ tên quá dài.'
  const phone = input.contactPhone?.replace(/\D/g, '')
  if (!phone || phone.length < 9 || phone.length > 11) return 'Số điện thoại không hợp lệ.'
  return null
}

// ── createVisitRequest ────────────────────────────────────────────────────────
// Inserts an inquiry of type "visit_request" and fires a tracking event.

export async function createVisitRequest(
  input: VisitRequestInput,
): Promise<ActionResult> {
  const validationError = validateVisitRequest(input)
  if (validationError) return { success: false, error: validationError }

  const { listingId, contactName, contactPhone, preferredDate, preferredTime, message } = input

  const parts = ['[ĐẶT LỊCH XEM ĐẤT]']
  if (preferredDate) parts.push(`Ngày muốn xem: ${preferredDate}${preferredTime ? ` (${preferredTime})` : ''}`)
  if (message?.trim()) parts.push(message.trim())
  const fullMessage = parts.join('\n')

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('inquiries').insert({
      listing_id:    listingId,
      contact_name:  contactName,
      contact_phone: contactPhone.replace(/\D/g, ''),
      message:       fullMessage,
    })

    if (error) {
      console.error('[createVisitRequest]', error.message)
      return { success: false, error: 'Không thể gửi yêu cầu. Vui lòng thử lại.' }
    }

    void trackInquiry(listingId, { metadata: { channel: 'visit_request' } })
    return { success: true }
  } catch (err) {
    console.error('[createVisitRequest]', err)
    return { success: false, error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' }
  }
}

// ── createGeneralInquiry ──────────────────────────────────────────────────────
// Used for "Gửi yêu cầu tư vấn" — available to all users (free + Pro).

export interface GeneralInquiryInput {
  listingId:    string
  contactName:  string
  contactPhone: string
  message:      string
  channel?:     'general' | 'legal_review'
}

export async function createGeneralInquiry(
  input: GeneralInquiryInput,
): Promise<ActionResult> {
  if (!input.listingId?.trim())   return { success: false, error: 'Thiếu ID tin đăng.' }
  if (!input.contactName?.trim()) return { success: false, error: 'Vui lòng nhập họ tên.' }
  const phone = input.contactPhone?.replace(/\D/g, '')
  if (!phone || phone.length < 9) return { success: false, error: 'Số điện thoại không hợp lệ.' }

  const prefix = input.channel === 'legal_review' ? '[YÊU CẦU XEM XÉT PHÁP LÝ]' : '[TƯ VẤN]'
  const fullMessage = [prefix, input.message?.trim()].filter(Boolean).join('\n')

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('inquiries').insert({
      listing_id:    input.listingId,
      contact_name:  input.contactName,
      contact_phone: phone,
      message:       fullMessage || prefix,
    })

    if (error) {
      console.error('[createGeneralInquiry]', error.message)
      return { success: false, error: 'Không thể gửi yêu cầu. Vui lòng thử lại.' }
    }

    void trackInquiry(input.listingId, {
      metadata: { channel: input.channel ?? 'general' },
    })
    return { success: true }
  } catch (err) {
    console.error('[createGeneralInquiry]', err)
    return { success: false, error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' }
  }
}
