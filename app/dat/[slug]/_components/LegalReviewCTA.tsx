'use client'

import { useState, useTransition } from 'react'
import { createClient }            from '@/lib/supabase/client'
import { createPaymentRequest, markPendingConfirm } from '@/features/billing/api/transactions.server'
import { BANK_INFO } from '@/features/billing/api/billing-constants'
import type { PaymentRequest } from '@/features/billing/api/transactions.server'

// ── BankModal (inline minimal) ────────────────────────────────────────────────

function BankModal({
  request,
  onClose,
}: {
  request: PaymentRequest
  onClose: () => void
}) {
  const [done, setDone] = useState(false)
  const [isPending, start] = useTransition()

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-600">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="m-0 text-[17px] font-bold text-gray-900">Yêu cầu đã gửi!</h3>
          <p className="m-0 mt-1 text-[12px] text-gray-500">Luật sư của VIO sẽ liên hệ trong 24 giờ.</p>
          <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-vio-forest py-2.5 text-[13px] font-bold text-white">
            Đóng
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div>
          <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-gray-400">
            Kiểm tra pháp lý
          </p>
          <p className="m-0 mt-1 text-[22px] font-black text-vio-forest">
            200.000 ₫
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 space-y-1 text-[12px]">
          <p className="m-0 font-bold text-blue-700">{BANK_INFO.bank_name} · {BANK_INFO.account_number}</p>
          <p className="m-0 text-blue-600">{BANK_INFO.account_name}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-600">
            Nội dung CK
          </p>
          <code className="mt-0.5 block text-[20px] font-black tracking-widest text-amber-800">
            {request.reference_code}
          </code>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => start(async () => { await markPendingConfirm(request.id); setDone(true) })}
            disabled={isPending}
            className="flex-1 rounded-2xl bg-vio-forest py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {isPending ? 'Đang xử lý…' : 'Đã chuyển khoản ✓'}
          </button>
          <button
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-4 text-[13px] font-semibold text-gray-600"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  )
}

// ── LegalReviewCTA ─────────────────────────────────────────────────────────────

export function LegalReviewCTA({
  listingId,
  listingTitle,
}: {
  listingId:    string
  listingTitle: string
}) {
  const [request,   setRequest]   = useState<PaymentRequest | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [isPending, start]        = useTransition()

  async function handleRequest() {
    setError(null)
    start(async () => {
      // Create legal_review_request first
      const supabase = createClient()
      const { data: lrr, error: lrrErr } = await supabase
        .from('legal_review_requests')
        .insert({
          listing_id:   listingId,
          request_type: 'review_parcel',
          status:       'pending',
          amount_vnd:   200_000,
        })
        .select('id')
        .single()

      if (lrrErr || !lrr) {
        setError('Lỗi tạo yêu cầu. Vui lòng thử lại.')
        return
      }

      const res = await createPaymentRequest('legal_review', (lrr as { id: string }).id, {
        listing_id:    listingId,
        listing_title: listingTitle,
      })

      if (!res.ok) {
        setError(res.error ?? 'Có lỗi xảy ra.')
        return
      }

      setRequest(res.request!)
    })
  }

  return (
    <>
      {request && (
        <BankModal request={request} onClose={() => setRequest(null)}/>
      )}

      <div className="rounded-3xl border border-neutral-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="1.75"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="m-0 text-[14px] font-bold text-[#1d1d1f]">Kiểm tra pháp lý</p>
            <p className="m-0 mt-0.5 text-[12.5px] text-neutral-500">
              Luật sư VIO xem xét sổ đỏ, sổ hồng, giấy tờ đất và tư vấn rủi ro pháp lý.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={handleRequest}
                disabled={isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4
                           text-[12.5px] font-bold text-white transition-opacity hover:opacity-90
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Đang xử lý…' : 'Yêu cầu kiểm tra · 200.000 ₫'}
              </button>
              <span className="text-[12px] text-neutral-400">Phản hồi trong 24 giờ</span>
            </div>
            {error && <p className="m-0 mt-1 text-[12px] text-red-500">{error}</p>}
          </div>
        </div>
      </div>
    </>
  )
}
