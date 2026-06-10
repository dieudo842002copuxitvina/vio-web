'use client'

import { useState, useTransition } from 'react'
import Link                         from 'next/link'
import { createPriceAlert }         from '@/app/actions/price-alert'

// ── Sheet primitive ────────────────────────────────────────────────────────────

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
        aria-labelledby="price-alert-title"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] bg-white
                   shadow-[0_-8px_40px_rgba(0,0,0,0.14)]
                   lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-[440px]
                   lg:rounded-[20px] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
      >
        <div className="flex justify-center pt-3 lg:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <h3 id="price-alert-title" className="text-[17px] font-bold text-[#1d1d1f]">
            {title}
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng"
                  className="flex h-8 w-8 items-center justify-center rounded-full
                             bg-neutral-100 text-neutral-500 hover:bg-neutral-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round"/>
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

// ── PriceAlertSheet ───────────────────────────────────────────────────────────

interface PriceAlertSheetProps {
  listingId:    string
  listingTitle: string
  currentPrice: string | null
  open:         boolean
  onClose:      () => void
}

function PriceAlertSheet({
  listingId, listingTitle, currentPrice, open, onClose,
}: PriceAlertSheetProps) {
  const [status,  setStatus]  = useState<'idle' | 'done' | 'needs_login' | 'error'>('idle')
  const [errMsg,  setErrMsg]  = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleClose() {
    setStatus('idle')
    setErrMsg(null)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrMsg(null)
    startTransition(async () => {
      const result = await createPriceAlert(listingId)
      if (result.success) {
        setStatus('done')
      } else if ('requiresLogin' in result && result.requiresLogin) {
        setStatus('needs_login')
      } else {
        setStatus('error')
        setErrMsg(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Theo dõi giá">
      {status === 'done' ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF5E6]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                    stroke="#FF9500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"
                    stroke="#FF9500" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-[17px] font-bold text-[#1d1d1f]">Đã bật theo dõi giá!</p>
          <p className="max-w-[280px] text-[14px] text-neutral-500">
            Bạn sẽ nhận thông báo khi giá lô đất này thay đổi.
          </p>
          <button type="button" onClick={handleClose}
                  className="mt-2 rounded-full bg-[#1A4D2E] px-8 py-3 text-[14px] font-bold
                             text-white transition-opacity hover:opacity-90">
            Hoàn tất
          </button>
        </div>
      ) : status === 'needs_login' ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#6e6e73" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#6e6e73" strokeWidth="2"
                    strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#1d1d1f]">
              Cần đăng nhập để theo dõi giá
            </p>
            <p className="mt-1 text-[13px] text-neutral-500">
              Tạo tài khoản miễn phí để nhận thông báo khi giá thay đổi.
            </p>
          </div>
          <Link
            href={`/login?redirect=/dat/${listingId}`}
            className="w-full rounded-2xl bg-[#1A4D2E] py-3.5 text-center text-[15px]
                       font-bold text-white no-underline transition-opacity hover:opacity-90"
          >
            Đăng nhập / Đăng ký
          </Link>
          <button type="button" onClick={handleClose}
                  className="text-[13px] text-neutral-400 hover:text-neutral-600">
            Để sau
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Context */}
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
            <p className="m-0 text-[12px] text-neutral-400">Lô đất</p>
            <p className="m-0 mt-0.5 line-clamp-1 text-[14px] font-semibold text-[#1d1d1f]">
              {listingTitle}
            </p>
            {currentPrice && (
              <p className="m-0 mt-1 text-[13px] font-bold text-[#1A4D2E]">
                Giá hiện tại: {currentPrice}
              </p>
            )}
          </div>

          {/* What you get */}
          <div className="space-y-2.5">
            {[
              'Thông báo ngay khi giá giảm',
              'Thông báo khi chủ đất cập nhật thông tin',
              'Nhắc nhở nếu lô đất sắp hết hạn đăng',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center
                                rounded-full bg-[#E8F0EB]">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" stroke="#1A4D2E" strokeWidth="3"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[13px] text-neutral-700">{item}</span>
              </div>
            ))}
          </div>

          {errMsg && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{errMsg}</p>
          )}

          <p className="text-[11px] text-neutral-400">
            Theo dõi giá miễn phí. Có thể tắt bất kỳ lúc nào trong tài khoản.
          </p>

          <button type="submit" disabled={pending}
                  className="w-full rounded-2xl bg-[#FF9500] py-3.5 text-[15px] font-bold
                             text-white transition-opacity disabled:opacity-50 hover:opacity-90">
            {pending ? 'Đang xử lý...' : 'Bật theo dõi giá'}
          </button>
        </form>
      )}
    </Sheet>
  )
}

// ── PriceAlertTrigger — drop-in ───────────────────────────────────────────────

interface PriceAlertTriggerProps {
  listingId:    string
  listingTitle: string
  currentPrice: string | null
  variant?:     'outline' | 'ghost'
  fullWidth?:   boolean
}

export function PriceAlertTrigger({
  listingId,
  listingTitle,
  currentPrice,
  variant  = 'ghost',
  fullWidth = false,
}: PriceAlertTriggerProps) {
  const [open, setOpen] = useState(false)

  const btnCls = [
    'flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors',
    fullWidth ? 'w-full rounded-2xl h-11' : 'px-3 py-2 text-[13px]',
    variant === 'outline'
      ? 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
      : 'text-neutral-500 hover:bg-neutral-100 hover:text-[#1d1d1f]',
  ].filter(Boolean).join(' ')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnCls}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
        Theo dõi giá
      </button>

      <PriceAlertSheet
        listingId={listingId}
        listingTitle={listingTitle}
        currentPrice={currentPrice}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
