'use client'

import { useState, useTransition } from 'react'
import { createGeneralInquiry }    from '@/app/actions/visit-request'

// ── Sheet primitive ────────────────────────────────────────────────────────────

function Sheet({
  open, onClose, title, children,
}: {
  open:    boolean
  onClose: () => void
  title:   string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-sheet-title"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] bg-white
                   shadow-[0_-8px_40px_rgba(0,0,0,0.14)] lg:inset-x-auto
                   lg:left-1/2 lg:-translate-x-1/2 lg:w-[480px] lg:rounded-[20px]
                   lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 lg:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <h3 id="inquiry-sheet-title" className="text-[17px] font-bold text-[#1d1d1f]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-full
                       bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </>
  )
}

// ── InquirySheet ──────────────────────────────────────────────────────────────

interface InquirySheetProps {
  listingId:    string
  listingTitle: string
  open:         boolean
  onClose:      () => void
  channel?:     'general' | 'legal_review'
}

function InquirySheet({
  listingId, listingTitle, open, onClose, channel = 'general',
}: InquirySheetProps) {
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [message, setMessage] = useState('')
  const [done,    setDone]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const isLegal  = channel === 'legal_review'
  const sheetTitle = isLegal ? 'Yêu cầu xem xét pháp lý' : 'Gửi yêu cầu tư vấn'
  const placeholder = isLegal
    ? 'Tôi muốn xem xét giấy tờ pháp lý, sổ đỏ của lô đất này...'
    : 'Tôi quan tâm lô đất này, vui lòng liên hệ lại với tôi...'

  function handleClose() {
    setDone(false)
    setErr(null)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    startTransition(async () => {
      const result = await createGeneralInquiry({
        listingId,
        contactName:  name,
        contactPhone: phone,
        message,
        channel,
      })
      if (result.success) {
        setDone(true)
      } else {
        setErr(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onClose={handleClose} title={sheetTitle}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0EB]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="#1A4D2E" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[17px] font-bold text-[#1d1d1f]">Đã gửi thành công!</p>
          <p className="max-w-[280px] text-[14px] text-neutral-500">
            Chủ đất sẽ liên hệ lại trong vòng 24 giờ.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-2 rounded-full bg-[#1A4D2E] px-8 py-3 text-[14px] font-bold text-white
                       transition-opacity hover:opacity-90"
          >
            Đóng
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {/* Listing context */}
          <p className="m-0 text-[12px] text-neutral-400 line-clamp-1">
            Về: {listingTitle}
          </p>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inq-name" className="text-[12px] font-semibold text-neutral-600">
              Họ và tên
            </label>
            <input
              id="inq-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5
                         text-[15px] outline-none transition-colors
                         focus:border-[#1A4D2E] focus:bg-white"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inq-phone" className="text-[12px] font-semibold text-neutral-600">
              Số điện thoại
            </label>
            <input
              id="inq-phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0901 234 567"
              required
              className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5
                         text-[15px] outline-none transition-colors
                         focus:border-[#1A4D2E] focus:bg-white"
            />
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inq-msg" className="text-[12px] font-semibold text-neutral-600">
              Nội dung <span className="font-normal text-neutral-400">(tùy chọn)</span>
            </label>
            <textarea
              id="inq-msg"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={placeholder}
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3
                         text-[15px] leading-relaxed outline-none transition-colors resize-none
                         focus:border-[#1A4D2E] focus:bg-white"
            />
          </div>

          {/* Error */}
          {err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{err}</p>
          )}

          {/* Trust note */}
          <p className="text-[11px] text-neutral-400">
            Thông tin của bạn chỉ được chia sẻ với chủ đất. VIO AGRI không tiết lộ cho bên thứ ba.
          </p>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-[#1A4D2E] py-3.5 text-[15px] font-bold text-white
                       transition-opacity disabled:opacity-50 hover:opacity-90 active:opacity-80"
          >
            {pending ? 'Đang gửi...' : isLegal ? 'Gửi yêu cầu pháp lý' : 'Gửi yêu cầu tư vấn'}
          </button>
        </form>
      )}
    </Sheet>
  )
}

// ── InquiryTrigger — self-contained, drop-in anywhere ────────────────────────

interface InquiryTriggerProps {
  listingId:    string
  listingTitle: string
  channel?:     'general' | 'legal_review'
  label?:       string
  variant?:     'primary' | 'outline' | 'ghost'
  fullWidth?:   boolean
}

export function InquiryTrigger({
  listingId,
  listingTitle,
  channel    = 'general',
  label,
  variant    = 'outline',
  fullWidth  = true,
}: InquiryTriggerProps) {
  const [open, setOpen] = useState(false)
  const isLegal = channel === 'legal_review'

  const defaultLabel = isLegal ? 'Yêu cầu xem pháp lý' : 'Gửi yêu cầu tư vấn'
  const btnLabel = label ?? defaultLabel

  const btnCls = [
    'flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors',
    fullWidth ? 'w-full' : '',
    'h-11 px-4 text-[14px]',
    variant === 'primary'
      ? 'bg-[#1A4D2E] text-white hover:opacity-90'
      : variant === 'outline'
      ? 'border border-[#1A4D2E]/25 text-[#1A4D2E] hover:bg-[#E8F0EB]'
      : 'text-neutral-600 hover:bg-neutral-100',
  ].filter(Boolean).join(' ')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnCls}>
        {isLegal ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
            <path d="M14 2v6h6M9 13h6M9 17h4"
                  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                  stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
          </svg>
        )}
        {btnLabel}
      </button>

      <InquirySheet
        listingId={listingId}
        listingTitle={listingTitle}
        open={open}
        onClose={() => setOpen(false)}
        channel={channel}
      />
    </>
  )
}
