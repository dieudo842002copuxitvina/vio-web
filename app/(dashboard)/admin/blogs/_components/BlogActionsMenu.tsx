'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link          from 'next/link'
import { toggleBlogStatus, deleteBlog } from '@/features/blog/api/blog.server'

export function BlogActionsMenu({
  id,
  slug,
  status,
}: {
  id:     string
  slug:   string
  status: 'draft' | 'published'
}) {
  const [open,    setOpen]    = useState(false)
  const [isPending, start]    = useTransition()
  const ref                   = useRef<HTMLDivElement>(null)
  const router                = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleToggle() {
    setOpen(false)
    start(async () => {
      const res = await toggleBlogStatus(id)
      if (res.ok) router.refresh()
      else alert(res.error ?? 'Có lỗi xảy ra.')
    })
  }

  async function handleDelete() {
    setOpen(false)
    if (!confirm('Xóa bài viết này? Hành động không thể hoàn tác.')) return
    start(async () => {
      const res = await deleteBlog(id)
      if (res.ok) router.refresh()
      else alert(res.error ?? 'Có lỗi xảy ra.')
    })
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen(v => !v)}
        aria-label="Thao tác"
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400
                   transition-colors hover:bg-gray-100 hover:text-gray-700
                   disabled:opacity-40"
      >
        {isPending ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5"  r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="19" r="1.5"/>
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 min-w-[180px] overflow-hidden rounded-2xl
                        border border-gray-100 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <Link
            href={`/admin/blogs/${id}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700
                       no-underline transition-colors hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Chỉnh sửa
          </Link>

          <button
            type="button"
            onClick={handleToggle}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px]
                       text-gray-700 transition-colors hover:bg-gray-50"
          >
            {status === 'published' ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Chuyển sang Nháp
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Xuất bản ngay
              </>
            )}
          </button>

          <div className="mx-3 my-1 h-px bg-gray-100" />

          <button
            type="button"
            onClick={handleDelete}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px]
                       text-red-600 transition-colors hover:bg-red-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Xóa bài viết
          </button>
        </div>
      )}
    </div>
  )
}
