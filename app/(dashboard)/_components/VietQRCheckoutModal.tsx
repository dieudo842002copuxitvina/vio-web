'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { markPendingConfirm }      from '@/features/billing/api/transactions.server'
import type { PaymentRequest }     from '@/features/billing/api/transactions.server'
import { PRODUCT_CATALOG }         from '@/features/billing/api/billing-constants'

// ── Bank env config ───────────────────────────────────────────────────────────
// Set these in .env.local:
//   NEXT_PUBLIC_BANK_BIN          e.g. 970436 (Vietcombank)
//   NEXT_PUBLIC_BANK_ACCOUNT_NO   e.g. 1234567890
//   NEXT_PUBLIC_BANK_ACCOUNT_NAME e.g. CONG TY VIO AGRI
//   NEXT_PUBLIC_BANK_NAME         e.g. Vietcombank

const BANK_BIN  = process.env.NEXT_PUBLIC_BANK_BIN          ?? ''
const ACCT_NO   = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NO   ?? ''
const ACCT_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? ''
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME         ?? 'Ngân hàng'

// ── VietQRCheckoutModal ───────────────────────────────────────────────────────

export function VietQRCheckoutModal({
  isOpen,
  onClose,
  paymentRequest,
}: {
  isOpen:         boolean
  onClose:        () => void
  paymentRequest: PaymentRequest
}) {
  const [done,      setDone]    = useState(false)
  const [copied,    setCopied]  = useState(false)
  const [error,     setError]   = useState<string | null>(null)
  const [isPending, start]      = useTransition()
  const router = useRouter()

  if (!isOpen) return null

  const refCode = paymentRequest.reference_code ?? ''
  const product = PRODUCT_CATALOG[paymentRequest.product_type]

  const qrUrl = BANK_BIN && ACCT_NO
    ? `https://img.vietqr.io/image/${BANK_BIN}-${ACCT_NO}-compact2.png` +
      `?amount=${paymentRequest.amount_vnd}` +
      `&addInfo=${encodeURIComponent(refCode)}` +
      `&accountName=${encodeURIComponent(ACCT_NAME)}`
    : null

  function handleCopy() {
    if (!refCode) return
    void navigator.clipboard.writeText(refCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleTransferred() {
    setError(null)
    start(async () => {
      const res = await markPendingConfirm(paymentRequest.id)
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/dashboard'), 2500)
      } else {
        setError(res.error ?? 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vqr-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={done ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Sheet / card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">

        {/* ── Success state ── */}
        {done ? (
          <div className="flex flex-col items-center gap-5 px-8 py-12 text-center">
            <div className="flex h-18 w-18 items-center justify-center rounded-full bg-emerald-100"
                 style={{ height: 72, width: 72 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-emerald-600" aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 id="vqr-title" className="m-0 text-[22px] font-bold text-gray-900">
                Đã ghi nhận!
              </h3>
              <p className="m-0 mt-2 text-[14px] leading-relaxed text-gray-500">
                Admin sẽ xác nhận và kích hoạt <strong>{product?.label}</strong> trong vòng 2 giờ.
                Đang chuyển về Dashboard…
              </p>
            </div>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full animate-[progress_2.5s_linear_forwards] rounded-full bg-emerald-500"
                   style={{ animation: 'progress 2.5s linear forwards' }} />
            </div>
          </div>
        ) : (
          /* ── Payment state ── */
          <div>
            {/* Top bar */}
            <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
                  {product?.label ?? 'Thanh toán'}
                </p>
                <p id="vqr-title" className="m-0 mt-0.5 text-[30px] font-black leading-none tracking-tight text-gray-900">
                  {paymentRequest.amount_vnd.toLocaleString('vi-VN')}&thinsp;₫
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">

              {/* QR + bank details row */}
              <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                {/* QR image */}
                {qrUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrUrl}
                    alt="Mã QR VietQR để chuyển khoản"
                    width={130}
                    height={130}
                    className="shrink-0 rounded-xl border border-white shadow-sm"
                  />
                ) : (
                  <div className="flex h-[130px] w-[130px] shrink-0 flex-col items-center justify-center
                                  rounded-xl border-2 border-dashed border-gray-200 bg-white text-center">
                    <p className="m-0 text-[10px] font-bold text-gray-400">Cấu hình</p>
                    <p className="m-0 text-[10px] text-gray-400">NEXT_PUBLIC_</p>
                    <p className="m-0 text-[10px] text-gray-400">BANK_BIN</p>
                  </div>
                )}

                {/* Bank info */}
                <div className="min-w-0 flex-1 space-y-2.5">
                  <InfoRow label="Ngân hàng"    value={BANK_NAME || '—'} />
                  <InfoRow label="Số tài khoản" value={ACCT_NO   || '—'} mono />
                  <InfoRow label="Chủ TK"       value={ACCT_NAME || '—'} />
                  <InfoRow
                    label="Số tiền"
                    value={`${paymentRequest.amount_vnd.toLocaleString('vi-VN')} ₫`}
                    accent
                  />
                </div>
              </div>

              {/* Reference code */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.1em] text-amber-600">
                    Nội dung chuyển khoản (bắt buộc)
                  </p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 rounded-full bg-amber-200/80 px-3 py-0.5 text-[11px] font-bold
                               text-amber-800 transition-colors hover:bg-amber-200 active:scale-95"
                  >
                    {copied ? '✓ Đã copy' : 'Copy'}
                  </button>
                </div>
                <code className="mt-1 block select-all text-[26px] font-black tracking-widest text-amber-900">
                  {refCode || '—'}
                </code>
                <p className="m-0 mt-1 text-[11px] leading-relaxed text-amber-600">
                  Ghi chính xác nội dung này để hệ thống tự động xác nhận.
                </p>
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] text-red-600">
                  {error}
                </p>
              )}

              {/* CTA */}
              <button
                type="button"
                onClick={handleTransferred}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-vio-forest py-3.5
                           text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Spinner />
                    Đang xử lý…
                  </>
                ) : (
                  'Tôi đã chuyển khoản ✓'
                )}
              </button>

              <p className="text-center text-[12px] text-gray-400">
                Sau khi bấm, admin sẽ xác nhận và kích hoạt trong vòng 2 giờ.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Keyframe for progress bar */}
      <style>{`
        @keyframes progress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({
  label, value, mono, accent,
}: {
  label:   string
  value:   string
  mono?:   boolean
  accent?: boolean
}) {
  return (
    <div>
      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.07em] text-gray-400">{label}</p>
      <p className={[
        'm-0 text-[12.5px] font-semibold leading-tight',
        mono   ? 'font-mono'       : '',
        accent ? 'text-vio-forest' : 'text-gray-800',
      ].join(' ')}>
        {value}
      </p>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24" fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}
