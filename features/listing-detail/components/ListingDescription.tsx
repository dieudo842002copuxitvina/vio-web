'use client'

import { useState } from 'react'

interface ListingDescriptionProps {
  content:    string | null | undefined
  // Lines to show when collapsed (Tailwind line-clamp)
  clampLines?: 6 | 8 | 10 | 12
  className?: string
}

const CLAMP: Record<number, string> = {
  6:  'line-clamp-6',
  8:  'line-clamp-8',
  10: 'line-clamp-10',
  12: 'line-clamp-12',
}

export function ListingDescription({
  content,
  clampLines = 8,
  className = '',
}: ListingDescriptionProps) {
  const [expanded, setExpanded] = useState(false)

  if (!content?.trim()) return null

  // Detect whether content is long enough to need clamping
  // Heuristic: >400 chars is likely multi-line and benefits from expand/collapse
  const isLong = content.length > 400

  return (
    <section className={['flex flex-col gap-3', className].join(' ')}>
      <h2 className="m-0 text-[1.0625rem] font-semibold text-gray-900 dark:text-white">
        Mô tả chi tiết
      </h2>

      <div
        className={[
          'text-[0.9375rem] leading-relaxed text-gray-700 dark:text-gray-300',
          'whitespace-pre-line',
          isLong && !expanded ? CLAMP[clampLines] : '',
        ].join(' ')}
      >
        {content}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className={[
            'self-start text-[0.875rem] font-semibold',
            'text-[#0071E3] dark:text-[#409CFF]',
            'hover:underline focus:outline-none focus-visible:underline',
          ].join(' ')}
        >
          {expanded ? 'Thu gọn ↑' : 'Xem thêm ↓'}
        </button>
      )}
    </section>
  )
}
