import type { Metadata }     from 'next'
import Link                   from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPaymentRequests } from '@/features/billing/api/transactions.server'
import { PRODUCT_CATALOG, BANK_INFO } from '@/features/billing/api/billing-constants'
import { PaymentActionsClient } from './_components/PaymentActionsClient'

export const metadata: Metadata = {
  title:  'Thanh toán — Admin VIO AGRI',
  robots: { index: false, follow: false },
}
export const revalidate = 0

function fmtVnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' ₫'
}

const STATUS_LABELS: Record<string, string> = {
  pending:         'Chờ thanh toán',
  pending_confirm: 'Chờ xác nhận',
  completed:       'Hoàn tất',
  failed:          'Thất bại',
  cancelled:       'Đã huỷ',
}

const STATUS_COLORS: Record<string, string> = {
  pending:         'bg-gray-100  text-gray-500',
  pending_confirm: 'bg-amber-100 text-amber-700',
  completed:       'bg-green-100 text-green-700',
  failed:          'bg-red-100   text-red-700',
  cancelled:       'bg-gray-100  text-gray-400',
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const params   = await searchParams
  const status   = params.status ?? 'pending_confirm'
  const page     = Math.max(1, parseInt(params.page ?? '1', 10))

  const supabase   = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { items, total } = await getPaymentRequests(status || undefined, page, 30)
  const totalPages = Math.ceil(total / 30)

  return (
    <div className="p-6 md:p-10">

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 no-underline hover:text-gray-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Admin OS
          </Link>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Thanh toán đang chờ
          </h1>
          <p className="m-0 mt-1 text-[13px] text-gray-500">{total} yêu cầu</p>
        </div>

        <form method="GET" className="flex gap-2">
          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none"
          >
            <option value="pending_confirm">Chờ xác nhận</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="completed">Hoàn tất</option>
            <option value="failed">Thất bại</option>
            <option value="">Tất cả</option>
          </select>
          <button type="submit" className="h-10 rounded-xl bg-gray-900 px-4 text-[13px] font-bold text-white hover:opacity-90">
            Lọc
          </button>
        </form>
      </div>

      {/* Bank info reminder */}
      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-blue-600">
          Thông tin tài khoản nhận
        </p>
        <p className="m-0 mt-1 text-[13px] text-blue-800">
          {BANK_INFO.bank_name} · {BANK_INFO.account_number} · {BANK_INFO.account_name}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Sản phẩm', 'Số tiền', 'Mã CK', 'Trạng thái', 'Ngày tạo', 'Hành động'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(req => (
                <tr key={req.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <p className="m-0 text-[13px] font-semibold text-gray-900 dark:text-white">
                      {PRODUCT_CATALOG[req.product_type]?.label ?? req.product_type}
                    </p>
                    <p className="m-0 text-[11px] font-mono text-gray-400">{req.user_id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-bold text-gray-900">{fmtVnd(req.amount_vnd)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded-lg bg-gray-100 px-2 py-1 text-[12px] font-mono font-bold text-gray-700">
                      {req.reference_code}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[req.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-gray-400">
                      {new Date(req.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(req.status === 'pending' || req.status === 'pending_confirm') && (
                      <PaymentActionsClient
                        requestId={req.id}
                        adminId={user?.id ?? ''}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-gray-400">
                    Không có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`?status=${status}&page=${page - 1}`} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-600 no-underline hover:bg-gray-50">
              ← Trước
            </Link>
          )}
          <span className="text-[13px] text-gray-400">Trang {page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`?status=${status}&page=${page + 1}`} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-600 no-underline hover:bg-gray-50">
              Tiếp →
            </Link>
          )}
        </div>
      )}

    </div>
  )
}
