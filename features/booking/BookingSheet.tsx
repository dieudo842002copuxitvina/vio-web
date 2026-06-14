'use client'

import { useState, useActionState, useCallback } from 'react'
import { useFormStatus }                          from 'react-dom'
import { Button }                                 from '@/shared/ui/button'
import { submitBooking }                          from './api/booking.server'
import type { BookingActionState }                from './api/booking.server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingSheetProps {
  businessId: string
  serviceId?: string
  onClose:    () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']

function getNext7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD
}

// ── Submit button (needs useFormStatus inside form) ───────────────────────────

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      isLoading={pending}
      disabled={disabled || pending}
      className="w-full rounded-full"
    >
      Xác nhận đặt lịch
    </Button>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      role="alert"
      className={[
        'fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap',
        'flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-xl',
        type === 'success' ? 'bg-[#34C759] text-white' : 'bg-red-500 text-white',
      ].join(' ')}
    >
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  )
}

// ── BookingSheet ───────────────────────────────────────────────────────────────

export function BookingSheet({ businessId, serviceId, onClose }: BookingSheetProps) {
  const days = getNext7Days()

  const [selectedDate, setSelectedDate] = useState<string>(fmt(days[0]))
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [showSuccess, setShowSuccess]   = useState(false)

  const [state, action] = useActionState<BookingActionState, FormData>(submitBooking, null)

  const handleSuccess = useCallback(() => {
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onClose()
    }, 2000)
  }, [onClose])

  // Trigger success side-effect when state changes to success
  if (state && 'success' in state && !showSuccess) {
    handleSuccess()
  }

  const canSubmit = !!selectedDate && !!selectedTime

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — slides up on mobile, centered modal on md+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Đặt lịch dịch vụ"
        className={[
          // Mobile: full bottom sheet
          'fixed bottom-0 left-0 right-0 z-50',
          'flex flex-col bg-white dark:bg-[#1C1C1E]',
          'rounded-t-[2rem] shadow-2xl',
          // Desktop: centered modal
          'md:inset-auto md:left-1/2 md:top-1/2',
          'md:-translate-x-1/2 md:-translate-y-1/2',
          'md:w-full md:max-w-lg md:rounded-3xl',
          // Max height
          'max-h-[92dvh] overflow-y-auto',
        ].join(' ')}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >

        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/[0.06]">
          <h2 className="m-0 text-[1.0625rem] font-bold tracking-tight text-gray-900 dark:text-white">
            Đặt lịch dịch vụ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-white/[0.08] dark:text-gray-400"
            aria-label="Đóng"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form action={action} className="flex flex-col gap-6 p-6">
          {/* Hidden fields */}
          <input type="hidden" name="business_id" value={businessId} />
          {serviceId && <input type="hidden" name="service_id" value={serviceId} />}
          <input type="hidden" name="booking_date" value={selectedDate} />
          <input type="hidden" name="time_slot"    value={selectedTime} />

          {/* Date strip */}
          <div>
            <p className="m-0 mb-3 text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">Chọn ngày</p>
            <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
              {days.map(d => {
                const iso      = fmt(d)
                const isActive = iso === selectedDate
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(iso)}
                    className={[
                      'flex shrink-0 flex-col items-center gap-0.5 rounded-2xl px-3.5 py-2.5',
                      'text-center transition-all duration-150 min-w-[3.25rem]',
                      isActive
                        ? 'bg-vio-primary text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-[#2C2C2E] dark:text-gray-300',
                    ].join(' ')}
                  >
                    <span className="text-[0.6875rem] font-semibold uppercase opacity-70">
                      {DAY_NAMES[d.getDay()]}
                    </span>
                    <span className="text-[1.125rem] font-bold leading-none">
                      {d.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots grid */}
          <div>
            <p className="m-0 mb-3 text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">Chọn giờ</p>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTime(t)}
                  className={[
                    'h-11 rounded-xl text-[0.9375rem] font-semibold transition-all duration-150',
                    selectedTime === t
                      ? 'bg-vio-primary text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-[#2C2C2E] dark:text-gray-300',
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="m-0 mb-2 text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
              Ghi chú thêm <span className="font-normal text-gray-400">(Không bắt buộc)</span>
            </p>
            <textarea
              name="notes"
              rows={3}
              placeholder="Ghi chú cho đại lý, yêu cầu đặc biệt..."
              className={[
                'w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3',
                'text-base text-gray-900 placeholder:text-gray-400 resize-none',
                'outline-none transition-all duration-200',
                'focus:ring-2 focus:ring-vio-primary/20 focus:border-vio-primary',
                'dark:bg-[#2C2C2E] dark:text-white dark:border-white/[0.1]',
              ].join(' ')}
            />
          </div>

          {/* Error */}
          {state && 'error' in state && (
            <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20">
              {state.error}
            </p>
          )}

          {/* Submit — sticky at bottom */}
          <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-gray-100 bg-white/90 px-6 py-4 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#1C1C1E]/90">
            <SubmitButton disabled={!canSubmit} />
          </div>
        </form>

      </div>

      {/* Toast */}
      {showSuccess && <Toast message="Đặt lịch thành công!" type="success" />}
    </>
  )
}
