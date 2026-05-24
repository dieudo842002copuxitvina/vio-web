'use server'

import { createClient } from '@/lib/supabase/server'

export type InquiryState =
  | null
  | { success: true;  message: string }
  | { success: false; error: string }

export async function submitInquiry(
  _prevState: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const listing_id  = formData.get('listing_id')?.toString().trim() ?? ''
  const buyer_name  = formData.get('buyer_name')?.toString().trim()  ?? ''
  const buyer_phone = formData.get('buyer_phone')?.toString().trim() ?? ''
  const message     = formData.get('message')?.toString().trim()     ?? ''

  if (!buyer_phone) {
    return {
      success: false,
      error:   'Vui lòng nhập số điện thoại để chủ đất có thể liên hệ lại với bạn.',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('inquiries').insert({
    listing_id: listing_id || null,
    buyer_name: buyer_name || null,
    buyer_phone,
    message:    message    || null,
  })

  if (error) {
    console.error('[submitInquiry]', error.message)
    return {
      success: false,
      error:   'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau.',
    }
  }

  return {
    success: true,
    message: 'Yêu cầu của bạn đã được ghi nhận. Chủ đất sẽ liên hệ sớm nhất!',
  }
}
