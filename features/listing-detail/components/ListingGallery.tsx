'use client'

import { useState } from 'react'
import type { ListingMedia } from '@/entities/listing'

interface ListingGalleryProps {
  images:    ListingMedia[]
  title:     string
  className?: string
}

export function ListingGallery({ images, title, className = '' }: ListingGalleryProps) {
  const [active, setActive] = useState(0)

  if (images.length === 0) {
    return (
      <div className={[
        'flex items-center justify-center',
        'aspect-[16/9] w-full',
        'bg-gray-100 dark:bg-gray-800 rounded-3xl',
        className,
      ].join(' ')}>
        <span className="select-none text-6xl opacity-20" aria-hidden="true">📷</span>
      </div>
    )
  }

  const current = images[active]

  return (
    <div className={className}>
      {/* Main image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-800">
        {current.type === 'video' ? (
          <video
            src={current.url}
            controls
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            aria-label={current.alt ?? title}
          />
        ) : (
          <img
            src={current.url}
            alt={current.alt ?? title}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
            loading="eager"
          />
        )}

        {/* Prev/Next navigation — only show when multiple images */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive(i => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60"
              aria-label="Ảnh trước"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 1L3 7l6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActive(i => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60"
              aria-label="Ảnh tiếp theo"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 1l6 6-6 6" />
              </svg>
            </button>

            {/* Counter pill */}
            <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={[
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-xl',
                'transition-all duration-150',
                i === active
                  ? 'ring-2 ring-[#0071E3] ring-offset-1'
                  : 'opacity-60 hover:opacity-90',
              ].join(' ')}
              aria-label={`Xem ảnh ${i + 1}`}
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
