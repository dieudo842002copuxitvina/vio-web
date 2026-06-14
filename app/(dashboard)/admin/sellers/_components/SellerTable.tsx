'use client'

import { useState, useTransition } from 'react'
import type { AdminSellerRow }      from '@/features/admin/api/sellers.server'
import {
  verifySeller,
  suspendSeller,
  adminGrantPro,
  adminRevokePro,
} from '@/features/admin/api/sellers.server'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  verified_pro: 'bg-purple-100 text-purple-700',
  trusted:      'bg-blue-100   text-blue-700',
  standard:     'bg-gray-100   text-gray-600',
  new:          'bg-gray-50    text-gray-400',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── SellerRow ──────────────────────────────────────────────────────────────────

function SellerRow({ seller, adminId }: { seller: AdminSellerRow; adminId: string }) {
  const [row, setRow]        = useState(seller)
  const [isPending, start]   = useTransition()
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  async function handleVerify() {
    start(async () => {
      const r = await verifySeller(row.id, adminId)
      if (r.ok) setRow(prev => ({ ...prev, is_verified: true }))
    })
  }

  async function handleGrantPro() {
    start(async () => {
      const r = await adminGrantPro(row.id, adminId, 30)
      if (r.ok) setRow(prev => ({ ...prev, plan_id: 'pro' }))
    })
  }

  async function handleRevokePro() {
    start(async () => {
      const r = await adminRevokePro(row.id, adminId)
      if (r.ok) setRow(prev => ({ ...prev, plan_id: 'free' }))
    })
  }

  async function handleSuspend() {
    if (!suspendReason.trim()) return
    start(async () => {
      await suspendSeller(row.id, adminId, suspendReason)
      setSuspendOpen(false)
    })
  }

  const tierClass = row.trust_tier ? (TIER_COLORS[row.trust_tier] ?? 'bg-gray-100 text-gray-500') : ''

  return (
    <>
      {suspendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#1C1C1E]">
            <h3 className="m-0 mb-3 text-[17px] font-bold text-gray-900 dark:text-white">
              Đình chỉ tài khoản
            </h3>
            <p className="m-0 mb-3 text-[13px] text-gray-500">{row.full_name ?? row.email}</p>
            <textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder="Lý do đình chỉ…"
              rows={3}
              className="w-full rounded-xl border border-gray-200 p-3 text-[13px] outline-none focus:border-gray-400"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSuspend}
                disabled={!suspendReason.trim()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
              >
                Đình chỉ
              </button>
              <button
                onClick={() => setSuspendOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      <tr className={`border-b border-gray-50 dark:border-white/[0.04] ${isPending ? 'opacity-40 pointer-events-none' : ''}`}>
        <td className="px-4 py-3">
          <p className="m-0 text-[13px] font-semibold text-gray-900 dark:text-white">
            {row.full_name ?? '—'}
          </p>
          <p className="m-0 text-[11px] text-gray-400">{row.email}</p>
        </td>
        <td className="hidden px-4 py-3 md:table-cell">
          {row.trust_tier ? (
            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${tierClass}`}>
              {row.trust_tier.replace('_', ' ')}
            </span>
          ) : <span className="text-[12px] text-gray-400">—</span>}
        </td>
        <td className="hidden px-4 py-3 sm:table-cell">
          <span className="text-[12px] text-gray-600 dark:text-gray-300">{row.listing_count}</span>
        </td>
        <td className="hidden px-4 py-3 md:table-cell">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${row.plan_id === 'pro' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {row.plan_id === 'pro' ? 'Pro' : 'Free'}
          </span>
        </td>
        <td className="hidden px-4 py-3 lg:table-cell">
          <div className="flex items-center gap-1">
            {row.is_verified
              ? <span className="text-[11px] text-blue-600">✓ Đã xác minh</span>
              : <span className="text-[11px] text-gray-400">Chưa xác minh</span>}
          </div>
        </td>
        <td className="hidden px-4 py-3 lg:table-cell">
          <span className="text-[12px] text-gray-400">{fmtDate(row.created_at)}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {!row.is_verified && (
              <button
                onClick={handleVerify}
                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
              >
                Xác minh
              </button>
            )}
            {row.plan_id !== 'pro'
              ? (
                <button
                  onClick={handleGrantPro}
                  className="rounded-lg bg-vio-forest px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
                >
                  Cấp Pro
                </button>
              ) : (
                <button
                  onClick={handleRevokePro}
                  className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Thu hồi
                </button>
              )}
            <button
              onClick={() => setSuspendOpen(true)}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
            >
              Đình chỉ
            </button>
          </div>
        </td>
      </tr>
    </>
  )
}

// ── SellerTable ────────────────────────────────────────────────────────────────

export function SellerTable({ sellers, adminId }: { sellers: AdminSellerRow[]; adminId: string }) {
  if (sellers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center dark:border-white/[0.08]">
        <p className="m-0 text-[14px] text-gray-500">Không tìm thấy người bán nào.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.06]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.04]">
              {['Người bán', 'Độ tin cậy', 'Tin', 'Gói', 'Xác minh', 'Tham gia', 'Hành động'].map(h => (
                <th
                  key={h}
                  className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400
                    ${h === 'Độ tin cậy' ? 'hidden md:table-cell' : ''}
                    ${h === 'Tin' ? 'hidden sm:table-cell' : ''}
                    ${h === 'Gói' ? 'hidden md:table-cell' : ''}
                    ${h === 'Xác minh' || h === 'Tham gia' ? 'hidden lg:table-cell' : ''}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sellers.map(s => <SellerRow key={s.id} seller={s} adminId={adminId}/>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
