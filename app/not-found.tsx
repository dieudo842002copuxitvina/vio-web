import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Không tìm thấy trang' }

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">

      {/* Icon — muted, large */}
      <div className="mb-7 select-none" aria-hidden="true">
        <svg
          width="72" height="72" viewBox="0 0 72 72"
          fill="none" className="text-gray-200 dark:text-gray-700"
        >
          <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <path d="M48 48l12 12" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <path d="M25 32h14M32 25v14" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
        </svg>
      </div>

      <h1 className="text-[1.625rem] font-bold tracking-tight text-gray-900 dark:text-white mb-3">
        Trang không tồn tại
      </h1>

      <p className="text-gray-500 dark:text-gray-400 text-[0.9375rem] leading-relaxed max-w-[260px] mb-10">
        Trang bạn tìm kiếm đã bị xóa hoặc địa chỉ URL không đúng.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-[0.9375rem] no-underline transition-opacity hover:opacity-75 active:opacity-60"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 7H2M6 3l-4 4 4 4"/>
        </svg>
        Quay lại trang chủ
      </Link>

    </main>
  )
}
