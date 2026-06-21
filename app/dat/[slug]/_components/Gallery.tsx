'use client'

import { useState, useEffect, useCallback } from 'react'
import Image                                 from 'next/image'
import Link                                  from 'next/link'
import type { ListingMediaItem }             from '@/entities/listing/api/listing.server'

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  media, idx, onClose, onChange,
}: {
  media:    ListingMediaItem[]
  idx:      number
  onClose:  () => void
  onChange: (i: number) => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowLeft')   onChange(Math.max(0, idx - 1))
      if (e.key === 'ArrowRight')  onChange(Math.min(media.length - 1, idx + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [idx, media.length, onClose, onChange])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/96"
      role="dialog" aria-modal="true" aria-label="Xem ảnh toàn màn hình"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4">
        <span className="text-[13px] font-medium text-white/60">
          {idx + 1} / {media.length}
        </span>
        <button
          type="button" onClick={onClose} aria-label="Đóng"
          className="flex h-9 w-9 items-center justify-center rounded-full
                     bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Main image */}
      <div className="relative min-h-0 flex-1">
        <Image
          src={media[idx]?.url ?? ''}
          alt={media[idx]?.alt ?? ''}
          fill
          className="object-contain"
          sizes="100vw"
        />
        {idx > 0 && (
          <button
            type="button" onClick={() => onChange(idx - 1)} aria-label="Ảnh trước"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center
                       justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
              <path d="M8.5 1L2 8l6.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {idx < media.length - 1 && (
          <button
            type="button" onClick={() => onChange(idx + 1)} aria-label="Ảnh tiếp"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center
                       justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
              <path d="M1.5 1L8 8l-6.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {media.map((img, i) => (
            <button
              key={img.id} type="button" onClick={() => onChange(i)}
              className={[
                'relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-150',
                i === idx ? 'border-white opacity-100' : 'border-transparent opacity-40 hover:opacity-65',
              ].join(' ')}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Gallery ───────────────────────────────────────────────────────────────────

interface GalleryProps {
  media:    ListingMediaItem[]
  title:    string
  backHref?: string
}

export function Gallery({ media, title, backHref = '/tim-kiem' }: GalleryProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const open  = useCallback((i: number) => setLightboxIdx(i), [])
  const close = useCallback(() => setLightboxIdx(null), [])

  const images = media.filter(m => m.type !== 'video')
  const has    = images.length > 0

  return (
    <>
      {/* Gallery grid: 1 large left + 2×2 thumbnails right */}
      <div className="relative overflow-hidden bg-neutral-100 sm:rounded-b-3xl">
        {has ? (
          <div
            className="grid h-[52vw] max-h-[500px] min-h-[240px]"
            style={{ gridTemplateColumns: images.length > 1 ? '2fr 1fr' : '1fr' }}
          >
            {/* Main image — priority: above-the-fold LCP candidate */}
            <button
              type="button" onClick={() => open(0)} aria-label="Xem ảnh 1"
              className="group relative row-span-2 cursor-zoom-in overflow-hidden"
            >
              <Image
                src={images[0].url}
                alt={title}
                fill
                priority
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 100vw, 66vw"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </button>

            {/* 2×2 thumbnail grid */}
            {images.length > 1 && (
              <div className="grid grid-rows-2">
                {[1, 2, 3, 4].map(n => {
                  const img    = images[n]
                  const isLast = n === 4 && images.length > 5
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => open(img ? n : 0)}
                      aria-label={`Xem ảnh ${n + 1}`}
                      className={[
                        'group relative cursor-zoom-in overflow-hidden border-l border-t border-white/20',
                        n >= 3 ? 'hidden sm:block' : '',
                      ].join(' ')}
                    >
                      {img ? (
                        <>
                          <Image
                            src={img.url}
                            alt=""
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            sizes="(max-width: 640px) 50vw, 17vw"
                          />
                          {isLast && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55">
                              <span className="text-[22px] font-black text-white">+{images.length - 4}</span>
                              <span className="text-[11px] font-semibold text-white/75">ảnh</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="h-full w-full bg-neutral-100" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[52vw] max-h-[500px] min-h-[240px] items-center justify-center bg-neutral-100">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-neutral-300">
              <rect x="4" y="8" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 30l10-10 8 8 7-7 15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="33" cy="18" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        )}

        {/* Back button */}
        <Link
          href={backHref}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center
                     rounded-full bg-black/30 text-white no-underline backdrop-blur-md
                     transition-colors hover:bg-black/50"
          aria-label="Quay lại"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        {/* Photo count badge */}
        {has && (
          <button
            type="button" onClick={() => open(0)}
            aria-label={`Xem tất cả ${images.length} ảnh`}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full
                       bg-black/40 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-md
                       transition-colors hover:bg-black/60"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <rect x="0.75" y="2.5" width="11.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M0.75 8L4 5.5l3 2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.25"/>
            </svg>
            {images.length} ảnh
          </button>
        )}
      </div>

      {lightboxIdx !== null && (
        <Lightbox media={images} idx={lightboxIdx} onClose={close} onChange={setLightboxIdx}/>
      )}
    </>
  )
}
