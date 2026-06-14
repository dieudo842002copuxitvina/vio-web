'use client'

import { useState, useTransition } from 'react'
import { createPaymentRequest, markPendingConfirm } from '@/features/billing/api/transactions.server'
import type { PaymentRequest } from '@/features/billing/api/transactions.server'
import { BANK_INFO, PRODUCT_CATALOG } from '@/features/billing/api/billing-constants'
import type { PaymentProductType } from '@/features/billing/api/billing-constants'

// ── BankTransferModal ─────────────────────────────────────────────────────────

function BankTransferModal({
  request,
  onClose,
}: {
  request: PaymentRequest
  onClose: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, start] = useTransition()
  const product = PRODUCT_CATALOG[request.product_type]

  function handleConfirmedTransfer() {
    start(async () => {
      await markPendingConfirm(request.id)
      setConfirmed(true)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#1C1C1E]">

        {confirmed ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-600">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="m-0 text-[19px] font-bold text-gray-900 dark:text-white">
              Đã ghi nhận chuyển khoản
            </h3>
            <p className="m-0 text-[13px] text-gray-500">
              Admin sẽ xác nhận và kích hoạt gói boost trong vòng 2 giờ.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-vio-forest py-3 text-[14px] font-bold text-white hover:opacity-90"
            >
              Đã hiểu
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                Xác nhận đặt mua
              </p>
              <h3 className="m-0 mt-1 text-[19px] font-bold text-gray-900 dark:text-white">
                {product?.label}
              </h3>
              <p className="m-0 mt-0.5 text-[22px] font-black text-vio-forest">
                {request.amount_vnd.toLocaleString('vi-VN')} ₫
              </p>
            </div>

            {/* Bank details */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-2">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-blue-600">
                Chuyển khoản đến
              </p>
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngân hàng</span>
                  <span className="font-semibold text-gray-900">{BANK_INFO.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số tài khoản</span>
                  <code className="font-mono font-bold text-gray-900">{BANK_INFO.account_number}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Chủ tài khoản</span>
                  <span className="font-semibold text-gray-900">{BANK_INFO.account_name}</span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-2">
                  <span className="text-gray-500">Số tiền</span>
                  <span className="font-bold text-blue-700">{request.amount_vnd.toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>
            </div>

            {/* Reference code */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-amber-600">
                Nội dung chuyển khoản (bắt buộc)
              </p>
              <code className="mt-1 block text-[22px] font-black tracking-widest text-amber-800">
                {request.reference_code}
              </code>
              <p className="m-0 mt-1 text-[11px] text-amber-600">
                Ghi chính xác mã này vào nội dung CK để hệ thống tự động xác nhận.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirmedTransfer}
                disabled={isPending}
                className="flex-1 rounded-2xl bg-vio-forest py-3 text-[14px] font-bold text-white
                           transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Đang xử lý…' : 'Tôi đã chuyển khoản ✓'}
              </button>
              <button
                onClick={onClose}
                className="rounded-2xl border border-gray-200 px-5 text-[14px] font-semibold
                           text-gray-600 hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── BoostCheckoutButton ───────────────────────────────────────────────────────

export function BoostCheckoutButton({
  productType,
  listingId,
  label,
  className,
}: {
  productType: PaymentProductType
  listingId?:  string
  label:       string
  className?:  string
}) {
  const [request,    setRequest]    = useState<PaymentRequest | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [isPending,  start]         = useTransition()

  function handleClick() {
    setError(null)
    start(async () => {
      const res = await createPaymentRequest(productType, listingId)
      if (!res.ok) {
        setError(res.error ?? 'Có lỗi xảy ra.')
      } else {
        setRequest(res.request!)
      }
    })
  }

  return (
    <>
      {request && (
        <BankTransferModal
          request={request}
          onClose={() => setRequest(null)}
        />
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={className}
      >
        {isPending ? 'Đang tạo yêu cầu…' : label}
      </button>

      {error && (
        <p className="mt-1 text-center text-[12px] text-red-500">{error}</p>
      )}
    </>
  )
}
