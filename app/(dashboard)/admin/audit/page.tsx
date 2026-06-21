import type { Metadata }  from 'next'
import Link               from 'next/link'
import { getAuditLogs }   from '@/features/admin/api/audit.server'

export const metadata: Metadata = {
  title:  'Nhật ký — Admin VIO AGRI',
  robots: { index: false, follow: false },
}
export const revalidate = 0

const ACTION_LABELS: Record<string, string> = {
  'listing.approve': 'Duyệt tin',
  'listing.reject':  'Từ chối tin',
  'listing.hide':    'Ẩn tin',
  'seller.verify':   'Xác minh người bán',
  'seller.suspend':  'Đình chỉ người bán',
  'seller.grant_pro':'Cấp Pro',
  'seller.revoke_pro':'Thu hồi Pro',
  'payment.confirm': 'Xác nhận thanh toán',
  'fraud.dismiss':   'Bỏ qua cảnh báo',
}

const ACTION_COLORS: Record<string, string> = {
  'listing.approve': 'bg-green-100 text-green-700',
  'listing.reject':  'bg-red-100   text-red-700',
  'listing.hide':    'bg-gray-100  text-gray-600',
  'seller.verify':   'bg-blue-100  text-blue-700',
  'seller.suspend':  'bg-red-100   text-red-700',
  'seller.grant_pro':'bg-purple-100 text-purple-700',
  'seller.revoke_pro':'bg-gray-100 text-gray-600',
  'payment.confirm': 'bg-green-100 text-green-700',
  'fraud.dismiss':   'bg-gray-100  text-gray-500',
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>
}) {
  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page ?? '1', 10))
  const action = params.action ?? ''

  const { items, total } = await getAuditLogs({
    action:  action || undefined,
    page,
    limit:   50,
  })
  const totalPages = Math.ceil(total / 50)

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
            Nhật ký kiểm tra
          </h1>
          <p className="m-0 mt-1 text-[13px] text-gray-500">{total.toLocaleString('vi-VN')} sự kiện</p>
        </div>

        <form method="GET" className="flex gap-2">
          <select
            name="action"
            defaultValue={action}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none"
          >
            <option value="">Tất cả hành động</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button type="submit" className="h-10 rounded-xl bg-gray-900 px-4 text-[13px] font-bold text-white hover:opacity-90">
            Lọc
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {items.map(log => {
          const colorClass = ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
          const label      = ACTION_LABELS[log.action] ?? log.action
          const actor      = (log.actor as { full_name?: string | null; email?: string | null } | null)

          return (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4
                         dark:border-white/[0.06] dark:bg-[#1C1C1E]"
            >
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${colorClass}`}>
                {label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13px] text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">{actor?.full_name ?? actor?.email ?? 'Admin'}</span>
                  {' · '}
                  <span className="font-mono text-[11px] text-gray-400">{log.entity_type}/{log.entity_id?.slice(0, 8)}</span>
                </p>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <p className="m-0 mt-0.5 text-[11px] text-gray-400">
                    {Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                )}
              </div>
              <time className="shrink-0 text-[11px] text-gray-400">
                {new Date(log.created_at).toLocaleString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </time>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            <p className="m-0 text-[13px] text-gray-400">Không có sự kiện nào.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`?page=${page - 1}${action ? `&action=${action}` : ''}`} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-600 no-underline hover:bg-gray-50">
              ← Trước
            </Link>
          )}
          <span className="text-[13px] text-gray-400">Trang {page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`?page=${page + 1}${action ? `&action=${action}` : ''}`} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-600 no-underline hover:bg-gray-50">
              Tiếp →
            </Link>
          )}
        </div>
      )}

    </div>
  )
}
