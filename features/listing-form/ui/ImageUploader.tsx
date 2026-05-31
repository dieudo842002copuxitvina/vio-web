'use client'

import { useRef, useState, useCallback } from 'react'

interface ImageUploaderProps {
  value:      string[]             // current list of image URLs
  onChange:   (urls: string[]) => void
  maxImages?: number               // default 8
  error?:     string | null
}

export function ImageUploader({
  value,
  onChange,
  maxImages = 8,
  error,
}: ImageUploaderProps) {
  const inputRef          = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const canAdd = value.length < maxImages

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || !canAdd) return

    const urls: string[] = []
    const remaining = maxImages - value.length

    Array.from(files).slice(0, remaining).forEach(file => {
      if (!file.type.startsWith('image/')) return
      // blob URL for preview — replace with Supabase storage URL on upload in production
      urls.push(URL.createObjectURL(file))
    })

    if (urls.length > 0) onChange([...value, ...urls])
  }, [value, onChange, maxImages, canAdd])

  const remove = (idx: number) => {
    const next = value.filter((_, i) => i !== idx)
    onChange(next)
  }

  const setCover = (idx: number) => {
    if (idx === 0) return
    const next = [...value]
    const [moved] = next.splice(idx, 1)
    next.unshift(moved)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      {canAdd && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Tải ảnh lên"
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          className={[
            'flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center gap-2',
            'rounded-2xl border-2 border-dashed transition-colors duration-150',
            dragging
              ? 'border-[#0071E3] bg-[#0071E3]/5'
              : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 dark:border-white/[0.1] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]',
            error ? 'border-red-300 dark:border-red-500/50' : '',
          ].join(' ')}
        >
          <div className={[
            'flex h-10 w-10 items-center justify-center rounded-full',
            'bg-gray-200 dark:bg-white/10',
          ].join(' ')}>
            <CameraIcon />
          </div>
          <div className="text-center">
            <p className="text-[0.875rem] font-medium text-gray-700 dark:text-gray-300">
              Nhấn để chọn ảnh
            </p>
            <p className="text-[0.75rem] text-gray-400">
              hoặc kéo thả vào đây · tối đa {maxImages} ảnh
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={e => addFiles(e.target.files)}
          />
        </div>
      )}

      {/* Thumbnail grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {value.map((url, idx) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Ảnh ${idx + 1}`}
                className="h-full w-full object-cover"
              />

              {/* Cover badge */}
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white">
                  Bìa
                </span>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {idx !== 0 && (
                  <button
                    type="button"
                    title="Đặt làm ảnh bìa"
                    onClick={() => setCover(idx)}
                    className="rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-medium text-white hover:bg-white/30"
                  >
                    Đặt bìa
                  </button>
                )}
                <button
                  type="button"
                  title="Xoá ảnh"
                  onClick={() => remove(idx)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-600"
                >
                  <XIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-[0.8125rem] text-red-500 dark:text-red-400">{error}</p>
      )}

      <p className="text-[0.75rem] text-gray-400 dark:text-gray-500">
        {value.length} / {maxImages} ảnh ·{' '}
        {value.length === 0
          ? 'Ảnh đầu tiên sẽ là ảnh bìa'
          : 'Ảnh đầu tiên là ảnh bìa'}
      </p>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round"/>
    </svg>
  )
}
