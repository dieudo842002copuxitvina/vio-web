'use client'

import { useState, useTransition } from 'react'
import type { PendingListing }      from '@/features/admin/api/moderation.server'
import {
  approveListing,
  rejectListing,
  hideListing,
} from '@/features/admin/api/moderation.server'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  platinum: 'bg-purple-100 text-purple-700',
  gold:     'bg-amber-100  text-amber-700',
  silver:   'bg-gray-100   text-gray-600',
  bronze:   'bg-orange-100 text-orange-700',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── ReasonModal ───────────────────────────────────────────────────────────────

function ReasonModal({
  action,
  listingTitle,
  onConfirm,
  onCancel,
}: {
  action:       'reject' | 'hide'
  listingTitle: string
  onConfirm:    (reason: string) => void
  onCancel:     () => void
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#1C1C1E]">
        <h3 className="m-0 mb-1 text-[17px] font-bold text-gray-900 dark:text-white">
          {action === 'reject' ? 'Từ chối tin đăng' : 'Ẩn tin đăng'}
        </h3>
        <p className="m-0 mb-4 text-[13px] text-gray-500 line-clamp-2">{listingTitle}</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Lý do (bắt buộc)…"
          rows={3}
          className="w-full rounded-xl border border-gray-200 p-3 text-[13px] outline-none
                     focus:border-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()) }}
            disabled={!reason.trim()}
            className="flex-1 rounded-xl bg-gray-900 py-2.5 text-[13px] font-bold text-white
                       disabled:opacity-40 dark:bg-white dark:text-gray-900"
          >
            Xác nhận
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold
                       text-gray-600 dark:border-white/10 dark:text-gray-300"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ModerationRow ─────────────────────────────────────────────────────────────

function ModerationRow({
  item,
  adminId,
  onDone,
}: {
  item:    PendingListing
  adminId: string
  onDone:  (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'reject' | 'hide' | null>(null)

  function handleApprove() {
    startTransition(async () => {
      await approveListing(item.id, adminId)
      onDone(item.id)
    })
  }

  function handleReasonConfirm(reason: string) {
    startTransition(async () => {
      if (modal === 'reject') await rejectListing(item.id, adminId, reason)
      else                    await hideListing(item.id, adminId, reason)
      setModal(null)
      onDone(item.id)
    })
  }

  const tier = item.completeness_tier
  const tierClass = tier ? (TIER_COLORS[tier] ?? 'bg-gray-100 text-gray-500') : ''

  return (
    <>
      {modal && (
        <ReasonModal
          action={modal}
          listingTitle={item.title}
          onConfirm={handleReasonConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      <tr className={`border-b border-gray-50 transition-opacity dark:border-white/[0.04] ${isPending ? 'opacity-40 pointer-events-none' : ''}`}>
        <td className="px-4 py-3">
          <p className="m-0 line-clamp-2 text-[13px] font-semibold text-gray-900 dark:text-white">
            {item.title}
          </p>
          <p className="m-0 mt-0.5 text-[11px] text-gray-400">{item.location_text}</p>
        </td>
        <td className="hidden px-4 py-3 md:table-cell">
          <p className="m-0 text-[12px] text-gray-700 dark:text-gray-300">
            {item.owner_name ?? '—'}
          </p>
          <p className="m-0 text-[11px] text-gray-400">{item.contact_phone ?? '—'}</p>
        </td>
        <td className="hidden px-4 py-3 lg:table-cell">
          {tier ? (
            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${tierClass}`}>
              {tier}
            </span>
          ) : (
            <span className="text-[12px] text-gray-400">—</span>
          )}
        </td>
        <td className="hidden px-4 py-3 lg:table-cell">
          <p className="m-0 text-[12px] text-gray-500">{fmtDate(item.created_at)}</p>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleApprove}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-[12px] font-bold text-white
                         transition-opacity hover:opacity-90"
            >
              Duyệt
            </button>
            <button
              onClick={() => setModal('reject')}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px]
                         font-bold text-red-600 transition-colors hover:bg-red-100"
            >
              Từ chối
            </button>
            <button
              onClick={() => setModal('hide')}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px]
                         font-semibold text-gray-500 transition-colors hover:bg-gray-50
                         dark:border-white/10 dark:text-gray-400"
            >
              Ẩn
            </button>
          </div>
        </td>
      </tr>
    </>
  )
}

// ── ModerationQueue ───────────────────────────────────────────────────────────

export function ModerationQueue({
  items:    initialItems,
  adminId,
}: {
  items:   PendingListing[]
  adminId: string
}) {
  const [items, setItems] = useState(initialItems)

  function handleDone(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-200 py-16 text-center dark:border-white/[0.08]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="m-0 text-[15px] font-bold text-gray-900 dark:text-white">
          Không có tin nào chờ duyệt
        </p>
        <p className="m-0 text-[13px] text-gray-500">Tất cả tin đăng đã được xử lý.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.06]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.04] dark:bg-white/[0.02]">
              {['Tin đăng', 'Người bán', 'Chất lượng', 'Ngày tạo', 'Hành động'].map(h => (
                <th
                  key={h}
                  className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400
                    ${h === 'Người bán' ? 'hidden md:table-cell' : ''}
                    ${h === 'Chất lượng' || h === 'Ngày tạo' ? 'hidden lg:table-cell' : ''}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <ModerationRow
                key={item.id}
                item={item}
                adminId={adminId}
                onDone={handleDone}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
