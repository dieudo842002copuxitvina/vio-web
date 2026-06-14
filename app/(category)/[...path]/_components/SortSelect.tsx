'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export type SortMode = 'newest' | 'featured' | 'price_asc' | 'price_desc'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'newest',     label: 'Mới nhất' },
  { value: 'featured',   label: 'Nổi bật' },
  { value: 'price_asc',  label: 'Giá ↑' },
  { value: 'price_desc', label: 'Giá ↓' },
]

export function SortSelect({ current }: { current: SortMode }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  function navigate(sort: SortMode) {
    const next = new URLSearchParams(searchParams.toString())
    if (sort === 'newest') next.delete('sort')
    else next.set('sort', sort)
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[0.75rem] text-gray-400 sm:inline">Sắp xếp:</span>
      <div className="flex gap-1.5">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => navigate(opt.value)}
            className={[
              'rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-colors',
              current === opt.value
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
