'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard] route error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-7 px-6 text-center">

      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-orange-50">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <circle cx="18" cy="18" r="15" stroke="#FF9500" strokeWidth="2" />
          <path d="M18 11v8" stroke="#FF9500" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="18" cy="25" r="1.75" fill="#FF9500" />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[1.25rem] font-bold text-gray-900 dark:text-white">
          Không thể tải nội dung
        </h2>
        <p className="mx-auto max-w-xs text-[0.9375rem] leading-relaxed text-gray-500 dark:text-gray-400">
          Đã xảy ra sự cố trong quá trình tải dữ liệu. Vui lòng thử lại.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-300 dark:text-gray-600">#{error.digest}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className={[
            'inline-flex items-center gap-2 px-6 py-3',
            'rounded-full bg-gray-900 dark:bg-white',
            'text-white dark:text-gray-900',
            'text-[0.9375rem] font-medium',
            'border-0 cursor-pointer',
            'transition-opacity hover:opacity-75 active:opacity-60',
          ].join(' ')}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 7A6 6 0 0 1 13 7M13 7l-2-2M13 7l-2 2" />
          </svg>
          Thử lại
        </button>

        <Link
          href="/dashboard"
          className={[
            'inline-flex items-center px-5 py-3',
            'rounded-full border border-gray-200 dark:border-white/[0.12]',
            'text-gray-600 dark:text-gray-300',
            'text-[0.9375rem] font-medium no-underline',
            'transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]',
          ].join(' ')}
        >
          Dashboard
        </Link>
      </div>

    </div>
  )
}
