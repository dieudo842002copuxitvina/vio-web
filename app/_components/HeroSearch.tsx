'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search }    from 'lucide-react'
import Link          from 'next/link'

const LAND_CATEGORIES = [
  { label: '🌾 Tất cả đất',                       href: '/dat-nong-nghiep' },
  { label: '🌳 Đất trồng cây ăn trái',            href: '/dat-nong-nghiep?loai=an_trai' },
  { label: '🌲 Đất lâm nghiệp',                   href: '/dat-nong-nghiep?loai=lam_nghiep' },
  { label: '🚜 Trang trại',                        href: '/dat-nong-nghiep?loai=trang_trai' },
  { label: '🌾 Đất lúa',                           href: '/dat-nong-nghiep?loai=lua' },
  { label: '🏭 Đất khu công nghiệp nông nghiệp',  href: '/dat-nong-nghiep?loai=cong_nghiep' },
] as const

export function HeroSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/dat-nong-nghiep?q=${encodeURIComponent(q)}` : '/dat-nong-nghiep')
  }

  return (
    <section className="bg-gradient-to-b from-green-50/70 to-white pt-5 pb-3">
      <div className="mx-auto max-w-2xl px-4">

        {/* Floating pill search */}
        <form
          onSubmit={handleSubmit}
          role="search"
          className="flex items-center rounded-full border border-gray-200 bg-white
                     px-1 shadow-md shadow-green-900/5"
        >
          <Search size={17} className="ml-3.5 shrink-0 text-gray-400" aria-hidden="true" />

          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm đất rẫy, đất vườn, trang trại..."
            aria-label="Tìm kiếm bất động sản nông nghiệp"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[15px] text-gray-800
                       placeholder:text-gray-400 outline-none
                       [font-size:16px]"
          />

          <button
            type="submit"
            className="m-0.5 shrink-0 rounded-full bg-green-600 px-4 py-2
                       text-sm font-semibold text-white
                       transition-colors hover:bg-green-700 active:scale-[0.97]"
          >
            Tìm
          </button>
        </form>

        {/* Land-only category strip */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {LAND_CATEGORIES.map(cat => (
            <Link
              key={cat.href}
              href={cat.href}
              className="whitespace-nowrap rounded-full border border-gray-200 bg-white
                         px-3.5 py-1.5 text-[13px] font-medium text-gray-600
                         no-underline shadow-sm
                         transition-colors hover:border-green-400 hover:text-green-700
                         active:scale-[0.97]"
            >
              {cat.label}
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
