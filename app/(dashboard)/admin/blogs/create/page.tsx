import type { Metadata } from 'next'
import Link              from 'next/link'
import { BlogForm }      from '../_components/BlogForm'

export const metadata: Metadata = { title: 'Tạo bài viết mới — VIO AGRI Admin' }

export default function CreateBlogPage() {
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
        <span className="text-gray-700 font-semibold">Tạo mới</span>
      </nav>

      <div className="mb-7">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Admin CMS
        </p>
        <h1 className="m-0 mt-1 text-[1.75rem] font-bold tracking-tight text-gray-900">
          Tạo bài viết mới
        </h1>
      </div>

      <div className="max-w-3xl">
        <BlogForm />
      </div>
    </div>
  )
}
