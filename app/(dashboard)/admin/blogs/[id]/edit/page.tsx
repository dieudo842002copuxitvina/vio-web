import type { Metadata } from 'next'
import Link              from 'next/link'
import { notFound }      from 'next/navigation'
import { getAdminBlogById } from '@/features/blog/api/blog.server'
import { BlogForm }      from '../../_components/BlogForm'

export const metadata: Metadata = { title: 'Chỉnh sửa bài viết — VIO AGRI Admin' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditBlogPage({ params }: PageProps) {
  const { id } = await params
  const blog   = await getAdminBlogById(id)

  if (!blog) notFound()

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-[13px] text-gray-400">
        <Link href="/admin/blogs" className="no-underline hover:text-gray-700">
          Blog
        </Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="truncate max-w-[240px] text-gray-700 font-semibold">{blog.title}</span>
      </nav>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Admin CMS
          </p>
          <h1 className="m-0 mt-1 text-[1.75rem] font-bold tracking-tight text-gray-900">
            Chỉnh sửa bài viết
          </h1>
        </div>
        {blog.status === 'published' && (
          <Link
            href={`/blog/${blog.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2
                       text-[13px] font-semibold text-gray-600 no-underline hover:bg-gray-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Xem bài đã đăng
          </Link>
        )}
      </div>

      <div className="max-w-3xl">
        <BlogForm blog={blog} />
      </div>
    </div>
  )
}
