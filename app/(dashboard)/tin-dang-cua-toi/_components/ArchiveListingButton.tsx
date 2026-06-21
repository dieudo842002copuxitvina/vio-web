'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { archiveListing } from '../actions'

export function ArchiveListingButton({ listingId }: { listingId: string }) {
  const [open, setOpen]       = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleConfirm() {
    setPending(true)
    const res = await archiveListing(listingId)
    setPending(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-gray-400 hover:text-red-500"
      >
        Ẩn
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-listing-title"
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md rounded-t-[28px] bg-white p-6 sm:rounded-[28px] sm:shadow-2xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-amber-500" aria-hidden="true">
                <polyline points="21 8 21 21 3 21 3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="1" y="3" width="22" height="5" rx="1" stroke="currentColor" strokeWidth="2"/>
                <line x1="10" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <h2 id="archive-listing-title" className="m-0 text-[18px] font-bold text-gray-900">
              Ẩn tin đăng?
            </h2>
            <p className="m-0 mt-2 text-[14px] leading-relaxed text-gray-500">
              Tin đăng sẽ không còn hiển thị với người mua. Bạn có thể đăng lại bất cứ lúc nào từ mục quản lý tin.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="flex h-11 items-center justify-center rounded-full bg-gray-900 text-[14px] font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {pending ? 'Đang xử lý…' : 'Xác nhận ẩn tin'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center rounded-full border border-gray-200 bg-white text-[14px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Giữ lại
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
