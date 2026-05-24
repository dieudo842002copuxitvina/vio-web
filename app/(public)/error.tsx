'use client'

import { useEffect } from 'react'

// ── Error boundary for all (public) routes ─────────────────────────────────
// Next.js passes `error` (the thrown value) and `reset` (retries the segment).
// Must be a Client Component — the `reset` callback triggers a re-render.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[public] route error:', error)
  }, [error])

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-7 px-6 text-center">

      {/* Icon — SF Symbol-style exclamation mark circle */}
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-red-50">
        <svg
          width="36" height="36" viewBox="0 0 36 36"
          fill="none" aria-hidden="true"
        >
          <circle
            cx="18" cy="18" r="15"
            stroke="#FF3B30" strokeWidth="2"
          />
          <path
            d="M18 11v8"
            stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round"
          />
          <circle cx="18" cy="25" r="1.75" fill="#FF3B30" />
        </svg>
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[1.25rem] font-bold text-gray-900">
          Không thể tải trang
        </h2>
        <p className="mx-auto max-w-xs text-[0.9375rem] leading-relaxed text-gray-500">
          Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-300">
            #{error.digest}
          </p>
        )}
      </div>

      {/* CTA — Apple-style primary button */}
      <button
        type="button"
        onClick={reset}
        className={[
          'h-11 min-h-[44px] px-8',
          'rounded-xl bg-vio-primary text-white',
          'text-[0.9375rem] font-semibold',
          'transition-all duration-200',
          'hover:opacity-90 active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-vio-primary focus-visible:ring-offset-2',
        ].join(' ')}
      >
        Thử lại
      </button>

    </main>
  )
}
