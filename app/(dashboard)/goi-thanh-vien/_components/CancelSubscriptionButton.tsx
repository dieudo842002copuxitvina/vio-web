'use client'

import { useState } from 'react'

export function CancelSubscriptionButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer border-0 bg-transparent p-0 text-[12px] text-gray-400 hover:text-gray-600 hover:underline"
      >
        Hủy đăng ký
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-sub-title"
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md rounded-t-[28px] bg-white p-6 sm:rounded-[28px] sm:shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <h2 id="cancel-sub-title" className="m-0 text-[18px] font-bold text-gray-900">
              Hủy gói Pro?
            </h2>
            <p className="m-0 mt-2 text-[14px] leading-relaxed text-gray-500">
              Sau khi hủy, bạn sẽ mất quyền truy cập lead nóng, phân tích nâng cao và các tính năng Pro khác vào cuối chu kỳ hiện tại.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <a
                href="/lien-he?subject=cancel-subscription"
                className="flex h-11 items-center justify-center rounded-full bg-red-500 text-[14px] font-bold text-white no-underline transition-opacity hover:opacity-80"
              >
                Xác nhận hủy đăng ký
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center rounded-full border border-gray-200 bg-white text-[14px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Giữ lại gói Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
