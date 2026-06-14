'use client'

import { useState, useTransition } from 'react'
import { createVisitRequest }       from '@/app/actions/visit-request'

// ── Sheet primitive (same pattern as InquirySheet) ─────────────────────────────

function Sheet({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
           onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-sheet-title"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] bg-white
                   shadow-[0_-8px_40px_rgba(0,0,0,0.14)]
                   lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-[480px]
                   lg:rounded-[20px] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
      >
        <div className="flex justify-center pt-3 lg:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <h3 id="visit-sheet-title" className="text-[17px] font-bold text-[#1d1d1f]">
            {title}
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng"
                  className="flex h-8 w-8 items-center justify-center rounded-full
                             bg-neutral-100 text-neutral-500 hover:bg-neutral-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="px-5 pb-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </>
  )
}

// ── Time slot options ─────────────────────────────────────────────────────────

const TIME_SLOTS = ['Sáng (8–11h)', 'Trưa (11–13h)', 'Chiều (13–17h)', 'Tối (17–19h)'] as const

// ── VisitRequestSheet ─────────────────────────────────────────────────────────

interface VisitRequestSheetProps {
  listingId:    string
  listingTitle: string
  open:         boolean
  onClose:      () => void
}

function VisitRequestSheet({
  listingId, listingTitle, open, onClose,
}: VisitRequestSheetProps) {
  const [name,      setName]      = useState('')
  const [phone,     setPhone]     = useState('')
  const [date,      setDate]      = useState('')
  const [timeSlot,  setTimeSlot]  = useState(TIME_SLOTS[2])
  const [message,   setMessage]   = useState('')
  const [done,      setDone]      = useState(false)
  const [err,       setErr]       = useState<string | null>(null)
  const [pending,   startTransition] = useTransition()

  // Minimum date = tomorrow
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  function handleClose() {
    setDone(false)
    setErr(null)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    startTransition(async () => {
      const result = await createVisitRequest({
        listingId,
        contactName:   name,
        contactPhone:  phone,
        preferredDate: date,
        preferredTime: timeSlot,
        message,
      })
      if (result.success) {
        setDone(true)
      } else {
        setErr(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Đặt lịch xem đất">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0EB]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#1A4D2E" strokeWidth="2"/>
              <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"
                    stroke="#1A4D2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[17px] font-bold text-[#1d1d1f]">Đã đặt lịch thành công!</p>
          <p className="max-w-[280px] text-[14px] text-neutral-500">
            Chủ đất sẽ xác nhận lịch xem đất và liên hệ lại với bạn sớm nhất.
          </p>
          <button type="button" onClick={handleClose}
                  className="mt-2 rounded-full bg-[#1A4D2E] px-8 py-3 text-[14px] font-bold text-white
                             transition-opacity hover:opacity-90">
            Đóng
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <p className="m-0 text-[12px] text-neutral-400 line-clamp-1">
            Lô đất: {listingTitle}
          </p>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vr-name" className="text-[12px] font-semibold text-neutral-600">
              Họ và tên
            </label>
            <input id="vr-name" type="text" value={name}
                   onChange={e => setName(e.target.value)}
                   placeholder="Nguyễn Văn A" required
                   className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5
                              text-[15px] outline-none focus:border-[#1A4D2E] focus:bg-white" />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vr-phone" className="text-[12px] font-semibold text-neutral-600">
              Số điện thoại
            </label>
            <input id="vr-phone" type="tel" inputMode="numeric" value={phone}
                   onChange={e => setPhone(e.target.value)}
                   placeholder="0901 234 567" required
                   className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5
                              text-[15px] outline-none focus:border-[#1A4D2E] focus:bg-white" />
          </div>

          {/* Date + time grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vr-date" className="text-[12px] font-semibold text-neutral-600">
                Ngày muốn xem
              </label>
              <input id="vr-date" type="date" value={date} min={minDateStr}
                     onChange={e => setDate(e.target.value)} required
                     className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5
                                text-[14px] outline-none focus:border-[#1A4D2E] focus:bg-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vr-time" className="text-[12px] font-semibold text-neutral-600">
                Khung giờ
              </label>
              <select id="vr-time" value={timeSlot}
                      onChange={e => setTimeSlot(e.target.value as typeof timeSlot)}
                      className="h-11 appearance-none rounded-xl border border-neutral-200
                                 bg-neutral-50 px-3.5 text-[14px] outline-none
                                 focus:border-[#1A4D2E] focus:bg-white">
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vr-msg" className="text-[12px] font-semibold text-neutral-600">
              Ghi chú <span className="font-normal text-neutral-400">(tùy chọn)</span>
            </label>
            <textarea id="vr-msg" rows={2} value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Tôi muốn xem toàn bộ diện tích và kiểm tra giấy tờ..."
                      className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3
                                 text-[15px] leading-relaxed outline-none resize-none
                                 focus:border-[#1A4D2E] focus:bg-white" />
          </div>

          {err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{err}</p>
          )}

          <p className="text-[11px] text-neutral-400">
            Thông tin lịch hẹn sẽ được chuyển đến chủ đất ngay lập tức.
          </p>

          <button type="submit" disabled={pending}
                  className="w-full rounded-2xl bg-[#1A4D2E] py-3.5 text-[15px] font-bold text-white
                             transition-opacity disabled:opacity-50 hover:opacity-90 active:opacity-80">
            {pending ? 'Đang gửi...' : 'Xác nhận đặt lịch'}
          </button>
        </form>
      )}
    </Sheet>
  )
}

// ── VisitRequestTrigger — drop-in button with built-in sheet state ─────────────

interface VisitRequestTriggerProps {
  listingId:    string
  listingTitle: string
  variant?:     'outline' | 'ghost'
  fullWidth?:   boolean
  iconOnly?:    boolean
  label?:       string
}

export function VisitRequestTrigger({
  listingId,
  listingTitle,
  variant   = 'outline',
  fullWidth = true,
  iconOnly  = false,
  label     = 'Đặt lịch xem đất',
}: VisitRequestTriggerProps) {
  const [open, setOpen] = useState(false)

  const btnCls = [
    'flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors',
    fullWidth ? 'w-full' : '',
    iconOnly ? 'h-11 w-11' : 'h-11 px-4 text-[14px]',
    variant === 'outline'
      ? 'border border-neutral-200 bg-white text-[#1d1d1f] hover:bg-neutral-50'
      : 'text-neutral-600 hover:bg-neutral-100',
  ].filter(Boolean).join(' ')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnCls}
              aria-label={iconOnly ? label : undefined}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75"
                strokeLinejoin="round"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
        </svg>
        {!iconOnly && label}
      </button>

      <VisitRequestSheet
        listingId={listingId}
        listingTitle={listingTitle}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
