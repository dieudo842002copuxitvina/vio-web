import type { Metadata }      from 'next'
import Link                    from 'next/link'
import { getAdminBlogs }       from '@/features/blog/api/blog.server'
import { BlogActionsMenu }     from './_components/BlogActionsMenu'

export const metadata: Metadata = { title: 'Quản lý Blog — VIO AGRI Admin' }
export const revalidate = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  return status === 'published' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5
                     text-[11px] font-bold text-emerald-700 border border-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Đã xuất bản
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5
                     text-[11px] font-bold text-gray-500 border border-gray-200">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Nháp
    </span>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyBlogs() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100"
           aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="m-0 text-[15px] font-semibold text-gray-700">Chưa có bài viết nào</p>
      <p className="m-0 mt-1 text-[13px] text-gray-400">Tạo bài viết đầu tiên để bắt đầu</p>
      <Link
        href="/admin/blogs/create"
        className="mt-5 rounded-full bg-vio-forest px-5 py-2.5 text-[14px] font-bold
                   text-white no-underline hover:opacity-90"
      >
        + Tạo bài viết mới
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminBlogsPage() {
  const blogs = await getAdminBlogs()

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Admin CMS
          </p>
          <h1 className="m-0 mt-1 text-[1.75rem] font-bold tracking-tight text-gray-900">
            Quản lý Blog
          </h1>
        </div>
        <Link
          href="/admin/blogs/create"
          className="flex items-center gap-2 rounded-full bg-vio-forest px-5 py-2.5
                     text-[13px] font-bold text-white no-underline hover:opacity-90"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Bài viết mới
        </Link>
      </div>

      {/* Stats strip */}
      {blogs.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Pill label="Tổng"        value={blogs.length}                                                color="gray" />
          <Pill label="Đã xuất bản" value={blogs.filter(b => b.status === 'published').length}         color="green" />
          <Pill label="Nháp"        value={blogs.filter(b => b.status === 'draft').length}             color="gray" />
        </div>
      )}

      {blogs.length === 0 ? (
        <EmptyBlogs />
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white
                          shadow-[0_1px_4px_rgb(0,0,0,0.04)] md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Bài viết', 'Trạng thái', 'Ngày đăng', 'Tác giả', ''].map(h => (
                    <th key={h} className="py-3 pl-5 pr-4 text-left text-[11px] font-bold
                                           uppercase tracking-[0.08em] text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blogs.map(blog => (
                  <tr key={blog.id}
                      className="border-b border-gray-50 transition-colors hover:bg-gray-50/50 last:border-0">

                    {/* Thumbnail + title */}
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {blog.thumbnail_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={blog.thumbnail_url} alt={blog.title}
                                 className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-300">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M3 16l5-5 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.5"
                                  strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="m-0 max-w-[260px] truncate text-[13.5px] font-semibold text-gray-900">
                            {blog.title}
                          </p>
                          <p className="m-0 mt-0.5 text-[11px] text-gray-400">/blog/{blog.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 pr-4">
                      <StatusBadge status={blog.status} />
                    </td>

                    <td className="py-3 pr-4 text-[13px] text-gray-500">
                      {fmtDate(blog.published_at ?? blog.created_at)}
                    </td>

                    <td className="py-3 pr-4 text-[13px] text-gray-500">
                      {(blog.profiles as { display_name?: string | null } | null)?.display_name ?? '—'}
                    </td>

                    <td className="py-3 pr-5">
                      <BlogActionsMenu id={blog.id} slug={blog.slug} status={blog.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="flex flex-col gap-3 md:hidden">
            {blogs.map(blog => (
              <div key={blog.id}
                   className="rounded-2xl border border-gray-100 bg-white p-4
                              shadow-[0_1px_3px_rgb(0,0,0,0.04)]">
                <div className="flex gap-3">
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {blog.thumbnail_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={blog.thumbnail_url} alt={blog.title}
                           className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M3 16l5-5 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="m-0 line-clamp-2 text-[14px] font-semibold text-gray-900">
                        {blog.title}
                      </p>
                      <div className="shrink-0">
                        <BlogActionsMenu id={blog.id} slug={blog.slug} status={blog.status} />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={blog.status} />
                      <span className="text-[11px] text-gray-400">
                        {fmtDate(blog.published_at ?? blog.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Pill({ label, value, color }: { label: string; value: number; color: 'gray' | 'green' }) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
      'text-[12px] font-semibold shadow-[0_1px_2px_rgb(0,0,0,0.04)]',
      color === 'green'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-gray-100 bg-white text-gray-600',
    ].join(' ')}>
      {value} {label}
    </span>
  )
}
