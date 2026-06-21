'use client'

import { useState, useTransition }    from 'react'
import { createPaymentRequest }        from '@/features/billing/api/transactions.server'
import type { PaymentRequest }         from '@/features/billing/api/transactions.server'
import type { PaymentProductType }     from '@/features/billing/api/billing-constants'
import { VietQRCheckoutModal }         from '@/app/(dashboard)/_components/VietQRCheckoutModal'

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
  const [request,   setRequest]  = useState<PaymentRequest | null>(null)
  const [error,     setError]    = useState<string | null>(null)
  const [isPending, start]       = useTransition()

  function handleClick() {
    setError(null)
    start(async () => {
      const res = await createPaymentRequest(productType, listingId)
      if (res.ok) {
        setRequest(res.request!)
      } else {
        setError(res.error ?? 'Có lỗi xảy ra.')
      }
    })
  }

  return (
    <>
      {request && (
        <VietQRCheckoutModal
          isOpen={Boolean(request)}
          onClose={() => setRequest(null)}
          paymentRequest={request}
        />
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={className}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            Đang tạo yêu cầu…
          </span>
        ) : label}
      </button>

      {error && (
        <p className="mt-1.5 text-center text-[12px] text-red-500">{error}</p>
      )}
    </>
  )
}
