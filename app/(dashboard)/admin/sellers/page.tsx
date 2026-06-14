import type { Metadata }     from 'next'
import Link                   from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listSellers }        from '@/features/admin/api/sellers.server'
import { SellerTable }        from './_components/SellerTable'

export const metadata: Metadata = {
  title:  'Người bán — Admin VIO AGRI',
  robots: { index: false, follow: false },
}
export const revalidate = 0

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page ?? '1', 10))
  const search = params.q ?? ''

  const supabase  = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { items, total }   = await listSellers(page, search)
  const totalPages = Math.ceil(total / 30)

  return (
    <div className="p-6 md:p-10">

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold
                       text-gray-400 no-underline hover:text-gray-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Admin OS
          </Link>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Quản lý người bán
          </h1>
          <p className="m-0 mt-1 text-[13px] text-gray-500">{total} người dùng</p>
        </div>

        {/* Search */}
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={search}
            placeholder="Tìm tên hoặc email…"
            className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-[13px]
                       outline-none focus:border-gray-400 dark:border-white/10 dark:bg-white/5"
          />
          <button
            type="submit"
            className="h-10 rounded-xl bg-gray-900 px-4 text-[13px] font-bold text-white
                       transition-opacity hover:opacity-90 dark:bg-white dark:text-gray-900"
          >
            Tìm
          </button>
        </form>
      </div>

      <SellerTable sellers={items} adminId={user?.id ?? ''}/>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
              className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold
                         text-gray-600 no-underline hover:bg-gray-50"
            >
              ← Trước
            </Link>
          )}
          <span className="text-[13px] text-gray-400">Trang {page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`?page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`}
              className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold
                         text-gray-600 no-underline hover:bg-gray-50"
            >
              Tiếp →
            </Link>
          )}
        </div>
      )}

    </div>
  )
}
