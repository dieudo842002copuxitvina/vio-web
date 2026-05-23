'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">

      {/* Icon */}
      <div className="mb-7 select-none" aria-hidden="true">
        <svg
          width="72" height="72" viewBox="0 0 72 72"
          fill="none" className="text-gray-200 dark:text-gray-700"
        >
          <circle cx="36" cy="36" r="27" stroke="currentColor" strokeWidth="5"/>
          <path d="M36 22v17" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="36" cy="47" r="3" fill="currentColor"/>
        </svg>
      </div>

      <h1 className="text-[1.625rem] font-bold tracking-tight text-gray-900 dark:text-white mb-3">
        Đã xảy ra lỗi
      </h1>

      <p className="text-gray-500 dark:text-gray-400 text-[0.9375rem] leading-relaxed max-w-[260px] mb-10">
        Không thể tải trang này. Vui lòng thử lại hoặc quay về trang chủ.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-[0.9375rem] cursor-pointer transition-opacity hover:opacity-75 active:opacity-60 border-0"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 7A6 6 0 0 1 13 7M13 7l-2-2M13 7l-2 2"/>
          </svg>
          Thử lại
        </button>

        <Link
          href="/"
          className="inline-flex items-center px-5 py-3 rounded-full border border-gray-200 dark:border-white/[0.12] text-gray-600 dark:text-gray-300 font-medium text-[0.9375rem] no-underline transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
        >
          Trang chủ
        </Link>
      </div>

    </main>
  )
}
