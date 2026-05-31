'use client'

import { useState, useTransition } from 'react'
import { updateBookingStatus }     from '@/features/booking/api/booking.server'
import type { BookingStatus }      from '@/features/booking/api/booking.server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id:           string
  booking_date: string
  time_slot:    string | null
  notes:        string | null
  status:       BookingStatus
  created_at:   string
  customer: {
    full_name: string | null
    phone:     string | null
  } | null
  service: {
    title: string
  } | null
}

interface BookingCardProps {
  booking: Booking
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const STATUS_BADGE: Record<BookingStatus, { label: string; cls: string }> = {
  pending:   { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  confirmed: { label: 'Đã xác nhận',  cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Hoàn thành',   cls: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Đã hủy',       cls: 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BookingCard({ booking: initial }: BookingCardProps) {
  const [booking, setBooking] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const badge = STATUS_BADGE[booking.status]

  async function changeStatus(newStatus: BookingStatus) {
    setError(null)
    startTransition(async () => {
      const result = await updateBookingStatus(booking.id, newStatus)
      if (result.error) {
        setError(result.error)
      } else {
        setBooking(b => ({ ...b, status: newStatus }))
      }
    })
  }

  return (
    <div
      className={[
        'rounded-2xl bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.07)]',
        'dark:bg-[#1C1C1E] dark:shadow-[0_1px_6px_rgba(0,0,0,0.25)]',
        isPending ? 'opacity-60' : '',
        'transition-opacity duration-150',
      ].join(' ')}
    >
      {/* Status badge + date */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${badge.cls}`}>
          {badge.label}
        </span>
        <span className="shrink-0 text-[0.75rem] text-gray-400">
          {formatDate(booking.booking_date)}
          {booking.time_slot && ` · ${booking.time_slot}`}
        </span>
      </div>

      {/* Customer */}
      <div className="mb-3">
        <p className="m-0 font-semibold text-gray-900 dark:text-white">
          {booking.customer?.full_name ?? 'Khách hàng'}
        </p>
        {booking.customer?.phone && (
          <a
            href={`tel:${booking.customer.phone}`}
            className="m-0 mt-0.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-vio-primary no-underline hover:opacity-80"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13.5 10.6c-.6.6-1.2.9-1.9.7-1.5-.4-3-1.4-4.3-2.7C6 7.3 5 5.8 4.6 4.3c-.2-.7.1-1.3.7-1.9l.9-.9c.3-.3.8-.3 1.1 0L9 3.3c.3.3.3.7 0 1L7.9 5.5a.4.4 0 0 0-.1.4 8.5 8.5 0 0 0 3.8 3.8.4.4 0 0 0 .4-.1l1.2-1.2c.3-.3.7-.3 1 0L16 10c.3.3.3.7 0 1l-2.5-.4Z" />
            </svg>
            {booking.customer.phone}
          </a>
        )}
      </div>

      {/* Service */}
      {booking.service && (
        <p className="m-0 mb-3 rounded-xl bg-gray-50 px-3 py-2 text-[0.8125rem] font-medium text-gray-700 dark:bg-white/[0.05] dark:text-gray-300">
          🔧 {booking.service.title}
        </p>
      )}

      {/* Notes */}
      {booking.notes && (
        <p className="m-0 mb-3 text-[0.8125rem] italic text-gray-400">"{booking.notes}"</p>
      )}

      {/* Error */}
      {error && (
        <p className="m-0 mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20">{error}</p>
      )}

      {/* Action buttons */}
      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
        <div className="flex gap-2">
          {booking.status === 'pending' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus('confirmed')}
              className="flex-1 rounded-xl bg-blue-600 py-2 text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Xác nhận
            </button>
          )}
          {booking.status === 'confirmed' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus('completed')}
              className="flex-1 rounded-xl bg-[#34C759] py-2 text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Hoàn thành
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => changeStatus('cancelled')}
            className="rounded-xl bg-gray-100 px-3 py-2 text-[0.8125rem] font-semibold text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-white/[0.06] dark:text-gray-400"
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  )
}
