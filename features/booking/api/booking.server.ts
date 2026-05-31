'use server'

import { revalidatePath } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export type BookingActionState =
  | null
  | { error: string }
  | { success: true; booking_id: string }

// ── submitBooking ─────────────────────────────────────────────────────────────

export async function submitBooking(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Vui lòng đăng nhập để đặt lịch.' }

  const business_id  = formData.get('business_id')  as string | null
  const service_id   = formData.get('service_id')   as string | null
  const booking_date = formData.get('booking_date') as string | null
  const time_slot    = formData.get('time_slot')    as string | null
  const notes        = formData.get('notes')        as string | null

  if (!business_id)  return { error: 'Thiếu thông tin doanh nghiệp.' }
  if (!booking_date) return { error: 'Vui lòng chọn ngày.' }
  if (!time_slot)    return { error: 'Vui lòng chọn giờ.' }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id:  user.id,
      business_id,
      service_id:   service_id || null,
      booking_date,
      time_slot,
      notes:        notes?.trim() || null,
      status:       'pending' satisfies BookingStatus,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/quan-ly-lich-hen')

  return { success: true, booking_id: (data as { id: string }).id }
}

// ── updateBookingStatus ───────────────────────────────────────────────────────

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Không xác thực.' }

  // Only allow updating bookings belonging to the current user's business
  const { error } = await supabase
    .from('bookings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq(
      'business_id',
      supabase.from('storefronts').select('id').eq('owner_id', user.id),
    )

  if (error) return { error: error.message }

  revalidatePath('/quan-ly-lich-hen')
  return {}
}
