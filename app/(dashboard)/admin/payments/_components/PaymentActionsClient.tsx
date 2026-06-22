'use client'

import { useState, useTransition } from 'react'
import { confirmPayment, rejectPayment } from '@/features/billing/api/transactions.server'
import { useRouter } from 'next/navigation'

export function PaymentActionsClient({
  requestId,
}: {
  requestId: string
}) {
  const [done,      setDone]     = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason,    setReason]   = useState('')
  const [isPending, start]       = useTransition()
  const router = useRouter()

  if (done) {
    return <span className="text-[12px] text-green-600 font-semibold">Đã xử lý ✓</span>
  }

  async function handleConfirm() {
    start(async () => {
      const r = await confirmPayment(requestId)
      if (r.ok) { setDone(true); router.refresh() }
    })
  }

  async function handleReject() {
    if (!reason.trim()) return
    start(async () => {
      const r = await rejectPayment(requestId, reason)
      if (r.ok) { setDone(true); router.refresh() }
      setRejectOpen(false)
    })
  }

  return (
    <>
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="m-0 mb-3 text-[17px] font-bold">Từ chối thanh toán</h3>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Lý do từ chối…"
              rows={3}
              className="w-full rounded-xl border border-gray-200 p-3 text-[13px] outline-none focus:border-gray-400"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleReject}
                disabled={!reason.trim()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
              >
                Từ chối
              </button>
              <button
                onClick={() => setRejectOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`flex items-center gap-1.5 ${isPending ? 'opacity-40 pointer-events-none' : ''}`}>
        <button
          onClick={handleConfirm}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-[12px] font-bold text-white hover:opacity-90"
        >
          Xác nhận
        </button>
        <button
          onClick={() => setRejectOpen(true)}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-bold text-red-600 hover:bg-red-100"
        >
          Từ chối
        </button>
      </div>
    </>
  )
}
