import type { Metadata }        from 'next'
import Link                      from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPendingListings, getModerationStats } from '@/features/admin/api/moderation.server'
import { ModerationQueue }       from './_components/ModerationQueue'

export const metadata: Metadata = {
  title:  'Kiểm duyệt — Admin VIO AGRI',
  robots: { index: false, follow: false },
}
export const revalidate = 0

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page ?? '1', 10))

  const supabase  = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ items, total }, stats] = await Promise.all([
    getPendingListings(page, 20),
    getModerationStats(),
  ])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 md:p-10">

      {/* ── Header ── */}
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
            Hàng đợi kiểm duyệt
          </h1>
          <p className="m-0 mt-1 text-[13px] text-gray-500">
            {total} tin đang chờ · Đã duyệt {stats.approved} · Từ chối {stats.rejected}
          </p>
        </div>
      </div>

      {/* ── Queue ── */}
      <ModerationQueue items={items} adminId={user?.id ?? ''}/>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}`}
              className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold
                         text-gray-600 no-underline hover:bg-gray-50 dark:border-white/10"
            >
              ← Trước
            </Link>
          )}
          <span className="text-[13px] text-gray-400">
            Trang {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?page=${page + 1}`}
              className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-semibold
                         text-gray-600 no-underline hover:bg-gray-50 dark:border-white/10"
            >
              Tiếp →
            </Link>
          )}
        </div>
      )}

    </div>
  )
}
