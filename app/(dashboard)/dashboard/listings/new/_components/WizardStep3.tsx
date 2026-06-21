'use client'

import { useRef, useState, useCallback } from 'react'
import Image                              from 'next/image'
import type { DraftListing, DraftImage }  from './ListingWizard'
import { SECTION }                        from './WizardStep1'

// ── Icons ─────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
    </svg>
  )
}

function StarFilled() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function StarOutline() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" strokeLinecap="round"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 11v6M14 11v6" strokeLinecap="round"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinejoin="round"/>
    </svg>
  )
}

// ── WizardStep3 ───────────────────────────────────────────────────────────────

export function WizardStep3({
  draft,
  onChange,
}: {
  draft:    DraftListing
  onChange: (p: Partial<DraftListing>) => void
}) {
  const fileRef      = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const dragIdx      = useRef<number | null>(null)
  const [activeDragIdx, setActiveDragIdx] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)

  function addFiles(files: FileList) {
    const newImages: DraftImage[] = []
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      newImages.push({
        id:    Math.random().toString(36).slice(2),
        file,
        url:   URL.createObjectURL(file),
        order: draft.images.length + newImages.length,
      })
    })
    if (newImages.length === 0) return
    onChange({ images: [...draft.images, ...newImages] })
  }

  function removeImage(idx: number) {
    const next = draft.images.filter((_, i) => i !== idx)
    const newCover = draft.cover_index >= next.length
      ? Math.max(0, next.length - 1)
      : draft.cover_index === idx ? 0 : draft.cover_index > idx ? draft.cover_index - 1 : draft.cover_index
    onChange({ images: next, cover_index: newCover })
  }

  function setCover(idx: number) {
    onChange({ cover_index: idx })
  }

  // ── Drag-and-drop reorder ──────────────────────────────────────────────────

  const onDragStart = useCallback((i: number) => { dragIdx.current = i; setActiveDragIdx(i) }, [])
  const onDragOver  = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault(); setDropTarget(i)
  }, [])
  const onDrop      = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    const fromIdx = dragIdx.current
    if (fromIdx === null || fromIdx === targetIdx) {
      dragIdx.current = null; setActiveDragIdx(null); setDropTarget(null); return
    }

    const next = [...draft.images]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(targetIdx, 0, moved!)

    // Adjust cover index
    let newCover = draft.cover_index
    if (draft.cover_index === fromIdx) newCover = targetIdx
    else if (fromIdx < draft.cover_index && targetIdx >= draft.cover_index) newCover -= 1
    else if (fromIdx > draft.cover_index && targetIdx <= draft.cover_index) newCover += 1

    dragIdx.current = null
    setActiveDragIdx(null)
    setDropTarget(null)
    onChange({ images: next, cover_index: newCover })
  }, [draft.images, draft.cover_index, onChange])
  const onDragEnd   = useCallback(() => { dragIdx.current = null; setActiveDragIdx(null); setDropTarget(null) }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  const MIN_IMAGES = 3

  return (
    <div className="space-y-6">

      {/* Heading */}
      <div>
        <h1 className="text-[22px] font-black tracking-tight text-[#1d1d1f]">Hình ảnh</h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          Ảnh chất lượng cao giúp tăng tỷ lệ liên hệ lên đến 3×.
          Tối thiểu {MIN_IMAGES} ảnh, đề xuất 10 ảnh trở lên.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragEnter={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => fileRef.current?.click()}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed',
          'py-12 cursor-pointer transition-colors',
          dragOver
            ? 'border-vio-forest bg-vio-forest/5'
            : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50',
        ].join(' ')}
        role="button"
        aria-label="Tải lên ảnh"
      >
        <span className={dragOver ? 'text-vio-forest' : 'text-neutral-400'}>
          <UploadIcon/>
        </span>
        <div className="text-center">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">
            Kéo thả ảnh vào đây
          </p>
          <p className="mt-0.5 text-[12.5px] text-neutral-500">
            hoặc nhấp để chọn từ thiết bị · JPG, PNG, WEBP
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(e.target.files) }}
        />
      </div>

      {/* Image grid */}
      {draft.images.length > 0 && (
        <div className={SECTION}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#1d1d1f]">
              {draft.images.length} ảnh
              {draft.images.length < MIN_IMAGES && (
                <span className="ml-2 text-[12px] font-normal text-amber-500">
                  · thêm {MIN_IMAGES - draft.images.length} ảnh nữa
                </span>
              )}
            </h2>
            <p className="text-[12px] text-neutral-400">Kéo để sắp xếp · ★ để chọn ảnh bìa</p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
            {draft.images.map((img, i) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={e => onDragOver(e, i)}
                onDrop={e => onDrop(e, i)}
                onDragEnd={onDragEnd}
                className={[
                  'group relative aspect-square overflow-hidden rounded-2xl',
                  'cursor-grab active:cursor-grabbing',
                  'transition-all duration-100',
                  dropTarget === i && activeDragIdx !== i
                    ? 'ring-2 ring-vio-forest ring-offset-2 scale-95'
                    : '',
                  i === draft.cover_index
                    ? 'ring-2 ring-amber-400 ring-offset-1'
                    : 'ring-1 ring-neutral-100',
                ].join(' ')}
              >
                <Image
                  src={img.url}
                  alt={`Ảnh ${i + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                />

                {/* Cover badge */}
                {i === draft.cover_index && (
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full
                                   bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    <StarFilled/> Bìa
                  </span>
                )}

                {/* Overlay actions */}
                <div className="absolute inset-0 flex items-center justify-center gap-1.5
                                bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {i !== draft.cover_index && (
                    <button
                      onClick={e => { e.stopPropagation(); setCover(i) }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90
                                 text-amber-500 transition-colors hover:bg-white"
                      title="Đặt làm ảnh bìa"
                    >
                      <StarOutline/>
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); removeImage(i) }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90
                               text-red-500 transition-colors hover:bg-white"
                    title="Xóa ảnh"
                  >
                    <TrashIcon/>
                  </button>
                </div>
              </div>
            ))}

            {/* Add more button */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl
                         border-2 border-dashed border-neutral-200 bg-neutral-50
                         text-neutral-400 transition-colors hover:border-neutral-300"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/>
                <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/>
              </svg>
              <span className="text-[10px] font-semibold">Thêm</span>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
