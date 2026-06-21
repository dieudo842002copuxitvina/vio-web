import type { Metadata }     from 'next'
import Link                   from 'next/link'
import { createAdminClient }  from '@/lib/supabase/server'

export const metadata: Metadata = {
  title:  'Tin đăng — Admin VIO AGRI',
  robots: { index: false, follow: false },
}
export const revalidate = 0

const STATUS_LABELS: Record<string, string> = {
  pending:  'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  hidden:   'Đã ẩn',
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100   text-red-700',
  hidden:   'bg-gray-100  text-gray-500',
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; mod?: string; q?: string }>
}) {
  const params   = await searchParams
  const page     = Math.max(1, parseInt(params.page ?? '1', 10))
  const modFilter = params.mod ?? ''
  const search    = params.q ?? ''
  const limit     = 30
  const from      = (page - 1) * limit

  const supabase = await createAdminClient()

  let q = supabase
    .from('listings')
    .select(
      'id, slug, title, moderation_status, status, is_public, price_text, location_text, owner_id, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (modFilter) q = q.eq('moderation_status', modFilter)
  if (search)    q = q.ilike('title', `%${search}%`)

  const { data, count } = await q
  const rows = (data ?? []) as unknown as {
    id: string; slug: string; title: string; moderation_status: string
    status: string; is_public: boolean; price_text: string | null
    location_text: string | null; owner_id: string | null; created_at: string
  }[]
  const total      = count ?? 0
  const totalPages = Math.ceil(total / limit)

  function pageLink(p: number) {
    const sp = new URLSearchParams()
    if (p > 1)      sp.set('page', String(p))
    if (modFilter)  sp.set('mod', modFilter)
    if (search)     sp.set('q', search)
    return `?${sp.toString()}`
  }

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
            Quản lý tin đăng
          </h1>
          <p className="m-0 mt-1 text-[13px] text-gray-500">{total.toLocaleString('vi-VN')} tin đăng</p>
        </div>

        {/* Filters */}
        <form method="GET" className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={search}
            placeholder="Tìm tiêu đề…"
            className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-[13px] outline-none focus:border-gray-400"
          />
          <select
            name="mod"
            defaultValue={modFilter}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="hidden">Đã ẩn</option>
          </select>
          <button
            type="submit"
            className="h-10 rounded-xl bg-gray-900 px-4 text-[13px] font-bold text-white hover:opacity-90"
          >
            Lọc
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Tiêu đề', 'Trạng thái', 'Giá', 'Địa điểm', 'Ngày tạo', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/40 dark:border-white/[0.04]">
                  <td className="px-4 py-3">
                    <p className="m-0 line-clamp-1 max-w-[240px] text-[13px] font-semibold text-gray-900 dark:text-white">
                      {r.title}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[r.moderation_status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[r.moderation_status] ?? r.moderation_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-gray-600">{r.price_text ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-gray-500 line-clamp-1 max-w-[140px]">{r.location_text ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dat/${r.slug}`}
                      target="_blank"
                      className="text-[12px] font-semibold text-blue-600 no-underline hover:underline"
                    >
                      Xem →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-gray-400">
                    Không tìm thấy tin đăng nào.
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
            <Link href={pageLink(page - 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-600 no-underline hover:bg-gray-50">
              ← Trước
            </Link>
          )}
          <span className="text-[13px] text-gray-400">Trang {page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={pageLink(page + 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-600 no-underline hover:bg-gray-50">
              Tiếp →
            </Link>
          )}
        </div>
      )}

    </div>
  )
}
