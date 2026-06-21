'use client'

import { useState, useTransition } from 'react'
import { createPaymentRequest, markPendingConfirm } from '@/features/billing/api/transactions.server'
import { BANK_INFO } from '@/features/billing/api/billing-constants'
import { createClient } from '@/lib/supabase/client'
import type { PaymentRequest } from '@/features/billing/api/transactions.server'

type Phase = 'form' | 'uploading' | 'payment' | 'done'

// ── BankTransferModal (inline variant) ────────────────────────────────────────

function BankTransferModal({
  request,
  onDone,
}: {
  request: PaymentRequest
  onDone:  () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, start] = useTransition()

  function handleConfirm() {
    start(async () => {
      await markPendingConfirm(request.id)
      setConfirmed(true)
    })
  }

  if (confirmed) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-600">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="m-0 text-[19px] font-bold text-[#1d1d1f]">Yêu cầu đã được gửi!</h3>
        <p className="m-0 text-[13px] text-neutral-500">
          Admin sẽ xem xét hồ sơ và xác nhận thanh toán trong 1–2 ngày làm việc.
        </p>
        <button onClick={onDone} className="w-full rounded-2xl bg-vio-forest py-3 text-[14px] font-bold text-white hover:opacity-90">
          Hoàn tất
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        Thanh toán phí xác minh
      </p>
      <p className="m-0 text-[22px] font-black text-vio-forest">
        {request.amount_vnd.toLocaleString('vi-VN')} ₫ <span className="text-[14px] font-normal text-neutral-400">một lần</span>
      </p>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-1.5 text-[13px]">
        <p className="m-0 font-bold text-blue-700">Chuyển khoản đến:</p>
        <p className="m-0 text-blue-800">{BANK_INFO.bank_name} · {BANK_INFO.account_number}</p>
        <p className="m-0 text-blue-800">Chủ TK: {BANK_INFO.account_name}</p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-amber-600">
          Nội dung chuyển khoản
        </p>
        <code className="mt-1 block text-[22px] font-black tracking-widest text-amber-800">
          {request.reference_code}
        </code>
      </div>

      <button
        onClick={handleConfirm}
        disabled={isPending}
        className="w-full rounded-2xl bg-vio-forest py-3 text-[14px] font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Đang xử lý…' : 'Tôi đã chuyển khoản ✓'}
      </button>
    </div>
  )
}

// ── VerificationRequestForm ────────────────────────────────────────────────────

export function VerificationRequestForm() {
  const [phase, setPhase]           = useState<Phase>('form')
  const [request, setRequest]       = useState<PaymentRequest | null>(null)
  const [docUrls, setDocUrls]       = useState<string[]>([])
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, start]          = useTransition()

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const uploaded: string[] = []

    for (const file of files) {
      const ext  = file.name.split('.').pop()
      const path = `verification-docs/${crypto.randomUUID()}.${ext}`
      const { data, error: upErr } = await supabase.storage
        .from('verification-docs')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (upErr) {
        setError(`Lỗi upload ${file.name}: ${upErr.message}`)
        setUploading(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('verification-docs').getPublicUrl(data.path)
      uploaded.push(publicUrl)
    }

    setDocUrls(prev => [...prev, ...uploaded])
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (docUrls.length === 0) {
      setError('Vui lòng upload ít nhất 1 tài liệu.')
      return
    }

    setError(null)
    setPhase('uploading')

    start(async () => {
      // Create verification_request record
      const supabase = createClient()
      const { data: verReq, error: verErr } = await supabase
        .from('verification_requests')
        .insert({
          request_type: 'seller',
          documents:    docUrls.map(url => ({ url, doc_type: 'id_document', uploaded_at: new Date().toISOString() })),
          status:       'pending',
          amount_vnd:   500_000,
        })
        .select('id')
        .single()

      if (verErr || !verReq) {
        setError('Lỗi tạo yêu cầu xác minh.')
        setPhase('form')
        return
      }

      // Create payment request linked to verification
      const res = await createPaymentRequest('seller_verification', (verReq as { id: string }).id, {
        verification_request_id: (verReq as { id: string }).id,
      })

      if (!res.ok) {
        setError(res.error ?? 'Lỗi tạo thanh toán.')
        setPhase('form')
        return
      }

      setRequest(res.request!)
      setPhase('payment')
    })
  }

  // Payment done
  if (phase === 'done') {
    return (
      <div className="rounded-3xl border border-green-200 bg-green-50 p-6 text-center">
        <h2 className="m-0 text-[19px] font-bold text-green-800">Yêu cầu đã được gửi!</h2>
        <p className="m-0 mt-1 text-[13px] text-green-700">Admin sẽ xem xét trong 1–2 ngày.</p>
      </div>
    )
  }

  // Payment phase
  if (phase === 'payment' && request) {
    return (
      <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
        <BankTransferModal request={request} onDone={() => setPhase('done')}/>
      </div>
    )
  }

  // Form phase
  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Price */}
      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
        <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-blue-500">
          Phí xác minh
        </p>
        <p className="m-0 mt-1 text-[2rem] font-black text-blue-900">500.000 ₫</p>
        <p className="m-0 mt-0.5 text-[12px] text-blue-600">Một lần duy nhất · Không gia hạn</p>
      </div>

      {/* Document upload */}
      <div className="space-y-2">
        <label className="text-[14px] font-bold text-[#1d1d1f]">
          Tài liệu xác minh
          <span className="ml-1 text-red-500">*</span>
        </label>
        <p className="text-[12.5px] text-neutral-500">
          Upload CCCD/CMND (cả 2 mặt) hoặc hộ chiếu. Chấp nhận JPG, PNG, PDF. Tối đa 5MB/file.
        </p>
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-8 text-center transition-colors hover:border-vio-forest/40 hover:bg-vio-forest/[0.02]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="m-0 text-[13px] font-semibold text-neutral-600">
            {uploading ? 'Đang upload…' : 'Nhấp để chọn tài liệu'}
          </p>
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            className="sr-only"
            disabled={uploading}
            onChange={handleFileUpload}
          />
        </label>

        {docUrls.length > 0 && (
          <div className="space-y-1.5">
            {docUrls.map((url, i) => (
              <div key={url} className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-green-600">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span className="text-[12px] font-medium text-green-700">Tài liệu {i + 1} đã upload</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || uploading || docUrls.length === 0}
        className="w-full rounded-2xl bg-vio-forest py-3.5 text-[15px] font-bold text-white
                   transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Đang xử lý…' : 'Gửi yêu cầu xác minh'}
      </button>
    </form>
  )
}
