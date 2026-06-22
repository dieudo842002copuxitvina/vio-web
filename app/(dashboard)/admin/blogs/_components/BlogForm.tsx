'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter }                        from 'next/navigation'
import { createBlog, updateBlog, uploadThumbnail } from '@/features/blog/api/blog.server'
import { blogSchema }                       from '@/features/blog/schemas/blog.schema'
import { TiptapEditor }                     from './TiptapEditor'
import type { BlogRow }                     from '@/features/blog/api/blog.server'

// ── Vietnamese → slug ─────────────────────────────────────────────────────────

const VI_MAP: Record<string, string> = {
  à:'a',á:'a',ả:'a',ã:'a',ạ:'a',
  ă:'a',ắ:'a',ằ:'a',ẳ:'a',ẵ:'a',ặ:'a',
  â:'a',ấ:'a',ầ:'a',ẩ:'a',ẫ:'a',ậ:'a',
  đ:'d',
  è:'e',é:'e',ẻ:'e',ẽ:'e',ẹ:'e',
  ê:'e',ế:'e',ề:'e',ể:'e',ễ:'e',ệ:'e',
  ì:'i',í:'i',ỉ:'i',ĩ:'i',ị:'i',
  ò:'o',ó:'o',ỏ:'o',õ:'o',ọ:'o',
  ô:'o',ố:'o',ồ:'o',ổ:'o',ỗ:'o',ộ:'o',
  ơ:'o',ớ:'o',ờ:'o',ở:'o',ỡ:'o',ợ:'o',
  ù:'u',ú:'u',ủ:'u',ũ:'u',ụ:'u',
  ư:'u',ứ:'u',ừ:'u',ử:'u',ữ:'u',ự:'u',
  ỳ:'y',ý:'y',ỷ:'y',ỹ:'y',ỵ:'y',
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(c => VI_MAP[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200)
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[12px] text-red-500">{msg}</p>
}

function Label({
  htmlFor, children, required,
}: {
  htmlFor: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-gray-700">
      {children}
      {required && <span className="ml-0.5 text-red-400">*</span>}
    </label>
  )
}

// ── Category options ──────────────────────────────────────────────────────────

const CATEGORIES = [
  'Kiến thức đất đai',
  'Thị trường',
  'Pháp lý',
  'Nông nghiệp',
  'Tin tức',
  'Hướng dẫn',
] as const

// ── BlogForm ──────────────────────────────────────────────────────────────────

export function BlogForm({ blog }: { blog?: BlogRow }) {
  const isEdit = Boolean(blog)

  const [title,        setTitle]        = useState(blog?.title         ?? '')
  const [slug,         setSlug]         = useState(blog?.slug          ?? '')
  const [slugEdited,   setSlugEdited]   = useState(isEdit)
  const [category,     setCategory]     = useState(blog?.category      ?? '')
  const [excerpt,      setExcerpt]      = useState(blog?.excerpt       ?? '')
  const [content,      setContent]      = useState(blog?.content       ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(blog?.thumbnail_url ?? '')
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [serverError,  setServerError]  = useState<string | null>(null)
  const [pendingBtn,   setPendingBtn]   = useState<'draft' | 'published' | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, start] = useTransition()
  const router = useRouter()

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!slugEdited) setSlug(toSlug(val))
  }

  function handleSlugChange(val: string) {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugEdited(true)
  }

  async function handleThumbnailFile(file: File | undefined) {
    if (!file) return
    setUploadError(null)
    setUploading(true)

    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadThumbnail(fd)

    setUploading(false)
    if (!res.ok) { setUploadError(res.error ?? 'Upload thất bại.'); return }
    setThumbnailUrl(res.url ?? '')
  }

  async function handleSubmit(status: 'draft' | 'published') {
    const parsed = blogSchema.safeParse({
      title,
      slug,
      excerpt:       excerpt       || undefined,
      content:       content       || undefined,
      thumbnail_url: thumbnailUrl  || undefined,
      category:      category      || undefined,
      status,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'root')
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setServerError(null)
    setPendingBtn(status)

    start(async () => {
      const res = isEdit && blog
        ? await updateBlog(blog.id, parsed.data)
        : await createBlog(parsed.data)

      setPendingBtn(null)

      if (!res.ok) {
        setServerError(res.error ?? 'Có lỗi xảy ra. Vui lòng thử lại.')
        return
      }

      router.push('/admin/blogs')
      router.refresh()
    })
  }

  const isSubmitting = isPending || uploading

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={e => e.preventDefault()} className="space-y-6" noValidate>

      {/* Title */}
      <div>
        <Label htmlFor="title" required>Tiêu đề bài viết</Label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Ví dụ: Xu hướng đất nông nghiệp 2025 tại Tây Nguyên"
          className={[
            'block w-full rounded-2xl border bg-white px-4 py-3 text-[14px] text-gray-900',
            'placeholder-gray-400 outline-none transition-all',
            'focus:border-vio-forest focus:ring-2 focus:ring-vio-forest/15',
            errors.title ? 'border-red-400' : 'border-gray-200',
          ].join(' ')}
        />
        <FieldError msg={errors.title} />
      </div>

      {/* Two-column: Slug + Category */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Slug */}
        <div>
          <Label htmlFor="slug" required>Slug (URL)</Label>
          <div className={[
            'flex items-center gap-2 rounded-2xl border px-4 py-3',
            'bg-gray-50 transition-all',
            'focus-within:border-vio-forest focus-within:bg-white focus-within:ring-2 focus-within:ring-vio-forest/15',
            errors.slug ? 'border-red-400' : 'border-gray-200',
          ].join(' ')}>
            <span className="shrink-0 text-[13px] text-gray-400">/blog/</span>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="xu-huong-dat-nong-nghiep-2025"
              className={[
                'min-w-0 flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder-gray-400',
                errors.slug ? 'text-red-600' : '',
              ].join(' ')}
            />
          </div>
          <FieldError msg={errors.slug} />
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category">Chuyên mục</Label>
          <select
            id="category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            className={[
              'block w-full appearance-none rounded-2xl border bg-white px-4 py-3 text-[14px] text-gray-900',
              'outline-none transition-all cursor-pointer',
              'focus:border-vio-forest focus:ring-2 focus:ring-vio-forest/15',
              errors.category ? 'border-red-400' : 'border-gray-200',
            ].join(' ')}
          >
            <option value="">— Chọn chuyên mục —</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <FieldError msg={errors.category} />
        </div>
      </div>

      {/* Thumbnail upload */}
      <div>
        <Label htmlFor="thumbnail-file">Ảnh đại diện</Label>

        {/* Hidden real file input */}
        <input
          ref={fileInputRef}
          id="thumbnail-file"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={e => handleThumbnailFile(e.target.files?.[0])}
        />

        {thumbnailUrl ? (
          /* Preview with replace/remove actions */
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt="Ảnh đại diện"
              className="h-40 w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2
                            bg-black/0 opacity-0 transition-all
                            group-hover:bg-black/30 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 shadow"
              >
                Đổi ảnh
              </button>
              <button
                type="button"
                onClick={() => { setThumbnailUrl(''); setUploadError(null) }}
                className="rounded-full bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white shadow"
              >
                Xoá
              </button>
            </div>
          </div>
        ) : (
          /* Drop zone / click to upload */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={[
              'flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed',
              'py-8 text-center transition-colors hover:border-vio-forest hover:bg-vio-forest/5',
              uploading ? 'cursor-wait opacity-60' : 'cursor-pointer',
              errors.thumbnail_url ? 'border-red-300' : 'border-gray-200',
            ].join(' ')}
          >
            {uploading ? (
              <svg className="h-6 w-6 animate-spin text-vio-forest" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 15l5-5 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity=".5"/>
              </svg>
            )}
            <p className="text-[13px] text-gray-500">
              {uploading ? 'Đang tải ảnh lên…' : 'Nhấn để chọn ảnh (JPG, PNG, WebP — tối đa 5 MB)'}
            </p>
          </button>
        )}

        {uploadError && (
          <p className="mt-1 text-[12px] text-red-500">{uploadError}</p>
        )}
      </div>

      {/* Excerpt */}
      <div>
        <Label htmlFor="excerpt">Tóm tắt (SEO description)</Label>
        <textarea
          id="excerpt"
          rows={3}
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          placeholder="Mô tả ngắn về bài viết, hiển thị trên trang danh sách và trong kết quả tìm kiếm…"
          className={[
            'block w-full resize-none rounded-2xl border bg-white px-4 py-3 text-[14px] text-gray-900',
            'placeholder-gray-400 outline-none transition-all',
            'focus:border-vio-forest focus:ring-2 focus:ring-vio-forest/15',
            errors.excerpt ? 'border-red-400' : 'border-gray-200',
          ].join(' ')}
        />
        <div className="mt-1 flex justify-between">
          <FieldError msg={errors.excerpt} />
          <span className="ml-auto text-[11px] text-gray-400">{excerpt.length} / 500</span>
        </div>
      </div>

      {/* Content — Rich Text Editor */}
      <div>
        <Label htmlFor="content">Nội dung bài viết</Label>
        <TiptapEditor
          value={content}
          onChange={setContent}
          hasError={Boolean(errors.content)}
        />
        <FieldError msg={errors.content} />
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-600">
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={() => handleSubmit('draft')}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5
                     text-[14px] font-semibold text-gray-700 transition-colors
                     hover:bg-gray-50 disabled:opacity-50"
        >
          {pendingBtn === 'draft' && <Spinner />}
          {pendingBtn === 'draft' ? 'Đang lưu…' : 'Lưu bản nháp'}
        </button>

        <button
          type="button"
          onClick={() => handleSubmit('published')}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-full bg-vio-forest px-5 py-2.5
                     text-[14px] font-bold text-white transition-opacity
                     hover:opacity-90 disabled:opacity-50"
        >
          {pendingBtn === 'published' && <Spinner />}
          {pendingBtn === 'published' ? 'Đang xuất bản…' : 'Xuất bản'}
        </button>

        <a
          href="/admin/blogs"
          className="ml-auto text-[13px] text-gray-400 no-underline hover:text-gray-600"
        >
          ← Quay lại danh sách
        </a>
      </div>
    </form>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}
