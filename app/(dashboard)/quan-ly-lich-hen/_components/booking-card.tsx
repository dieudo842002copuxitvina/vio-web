'use client'

import { useState, useTransition } from 'react'
import { updateBookingStatus }     from '@/features/booking/api/booking.server'
import type { BookingStatus }      from '@/features/booking/api/booking.server'
import { Badge }                   from '@/shared/ui/badge'

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

type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'error' | 'neutral'

const STATUS_BADGE: Record<BookingStatus, { label: string; variant: BadgeVariant }> = {
  pending:   { label: 'Chờ xác nhận', variant: 'warning' },
  confirmed: { label: 'Đã xác nhận',  variant: 'info'    },
  completed: { label: 'Hoàn thành',   variant: 'success' },
  cancelled: { label: 'Đã hủy',       variant: 'neutral' },
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
        'rounded-2xl bg-[var(--surface)] p-5 shadow-apple-soft',
        'dark:bg-[var(--surface)]',
        isPending ? 'opacity-60' : '',
        'transition-opacity duration-150',
      ].join(' ')}
    >
      {/* Status badge + date */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="shrink-0 text-[0.75rem] text-[var(--muted)]">
          {formatDate(booking.booking_date)}
          {booking.time_slot && ` · ${booking.time_slot}`}
        </span>
      </div>

      {/* Customer */}
      <div className="mb-3">
        <p className="m-0 font-semibold text-[var(--sea-ink)]">
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
        <p className="m-0 mb-3 rounded-xl bg-[var(--foam)] px-3 py-2 text-[0.8125rem] font-medium text-[var(--sea-ink-soft)] dark:bg-white/[0.05]">
          🔧 {booking.service.title}
        </p>
      )}

      {/* Notes */}
      {booking.notes && (
        <p className="m-0 mb-3 text-[0.8125rem] italic text-[var(--muted)]">&ldquo;{booking.notes}&rdquo;</p>
      )}

      {/* Error */}
      {error && (
        <p className="m-0 mb-3 rounded-xl bg-[#FF3B30]/[0.07] px-3 py-2 text-xs text-[#FF3B30]">{error}</p>
      )}

      {/* Action buttons — Apple HIG 44px tap targets */}
      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
        <div className="flex gap-2">
          {booking.status === 'pending' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus('confirmed')}
              className="h-11 min-h-[44px] flex-1 rounded-xl bg-vio-blue text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Xác nhận
            </button>
          )}
          {booking.status === 'confirmed' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => changeStatus('completed')}
              className="h-11 min-h-[44px] flex-1 rounded-xl bg-vio-primary text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Hoàn thành
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => changeStatus('cancelled')}
            className="h-11 min-h-[44px] rounded-xl bg-[var(--chip-bg)] px-3 text-[0.8125rem] font-semibold text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--chip-line)] disabled:opacity-50"
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  )
}
