'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { ListingMediaItem } from '@/entities/listing/api/listing.server'

interface ListingGalleryProps {
  media:  ListingMediaItem[]
  title:  string
  backHref?: string
}

// ── Lightbox overlay ──────────────────────────────────────────────────────────

function LightboxOverlay({
  media, currentIdx, onClose, onChange,
}: {
  media:      ListingMediaItem[]
  currentIdx: number
  onClose:    () => void
  onChange:   (idx: number) => void
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')   onClose()
      if (e.key === 'ArrowLeft')  onChange(Math.max(0, currentIdx - 1))
      if (e.key === 'ArrowRight') onChange(Math.min(media.length - 1, currentIdx + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentIdx, media.length, onClose, onChange])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh toàn màn hình"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-white/70">
          {currentIdx + 1} / {media.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10
                     text-white transition-colors hover:bg-white/20"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Current image */}
      <div className="relative flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media[currentIdx]?.url}
          alt={media[currentIdx]?.alt ?? ''}
          className="absolute inset-0 h-full w-full object-contain"
        />

        {/* Prev / Next */}
        {currentIdx > 0 && (
          <button
            type="button"
            onClick={() => onChange(currentIdx - 1)}
            aria-label="Ảnh trước"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center
                       justify-center rounded-full bg-black/50 text-white
                       transition-colors hover:bg-black/70"
          >
            ←
          </button>
        )}
        {currentIdx < media.length - 1 && (
          <button
            type="button"
            onClick={() => onChange(currentIdx + 1)}
            aria-label="Ảnh tiếp"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center
                       justify-center rounded-full bg-black/50 text-white
                       transition-colors hover:bg-black/70"
          >
            →
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
          {media.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onChange(i)}
              className={[
                'h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                i === currentIdx ? 'border-white' : 'border-transparent opacity-50 hover:opacity-75',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ListingGallery ────────────────────────────────────────────────────────────

export function ListingGallery({ media, title, backHref = '/dat-nong-nghiep' }: ListingGalleryProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const openLightbox  = useCallback((idx: number) => setLightboxIdx(idx), [])
  const closeLightbox = useCallback(() => setLightboxIdx(null), [])

  const hasMedia = media.length > 0

  return (
    <>
      {/* Gallery grid */}
      <div
        className={[
          'relative h-[56vw] max-h-[520px] min-h-[260px] overflow-hidden bg-neutral-100',
          'grid rounded-b-[2rem]',
        ].join(' ')}
        style={{
          gridTemplateColumns: hasMedia && media.length > 1 ? '2fr 1fr' : '1fr',
          gridTemplateRows:    hasMedia && media.length > 2 ? '1fr 1fr' : '1fr',
        }}
      >
        {hasMedia ? (
          <>
            {/* Hero image */}
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="relative row-span-2 overflow-hidden group cursor-zoom-in"
              aria-label="Xem ảnh 1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media[0].url}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                loading="eager"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            </button>

            {/* Thumbnails */}
            {media.slice(1, 3).map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => openLightbox(i + 1)}
                className={[
                  'relative overflow-hidden group cursor-zoom-in',
                  i === 1 && media.length > 1 ? 'border-l border-t border-white/30' : 'border-l border-white/30',
                ].join(' ')}
                aria-label={`Xem ảnh ${i + 2}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  loading="lazy"
                />
                {/* Show all overlay on last visible thumbnail */}
                {i === 1 && media.length > 3 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                    <span className="text-2xl font-black text-white">+{media.length - 3}</span>
                    <span className="text-[0.75rem] font-semibold text-white/80">ảnh</span>
                  </div>
                )}
              </button>
            ))}
          </>
        ) : (
          /* No media placeholder */
          <div className="flex h-full w-full items-center justify-center bg-neutral-100">
            <span className="select-none text-8xl opacity-[0.08]" aria-hidden="true">🌾</span>
          </div>
        )}

        {/* Back button — always present */}
        <Link
          href={backHref}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center
                     rounded-full bg-black/30 text-white no-underline backdrop-blur-md
                     transition-colors hover:bg-black/50"
          aria-label="Quay lại"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M11.5 3.5L6 9l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        {/* Photo count badge */}
        {hasMedia && (
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="absolute bottom-4 right-4 flex items-center gap-1.5
                       rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md
                       text-[0.75rem] font-bold text-white transition-colors hover:bg-black/60"
            aria-label={`Xem tất cả ${media.length} ảnh`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="9.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
              <path d="M1 8.5l3-2.5 2.5 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {media.length} ảnh
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <LightboxOverlay
          media={media}
          currentIdx={lightboxIdx}
          onClose={closeLightbox}
          onChange={setLightboxIdx}
        />
      )}
    </>
  )
}
