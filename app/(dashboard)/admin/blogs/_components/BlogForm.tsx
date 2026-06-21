'use client'

import { useState, useTransition } from 'react'
import { useRouter }                from 'next/navigation'
import { createBlog, updateBlog }   from '@/features/blog/api/blog.server'
import { blogSchema }               from '@/features/blog/schemas/blog.schema'
import type { BlogRow }             from '@/features/blog/api/blog.server'

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

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-gray-700">
      {children}{required && <span className="ml-0.5 text-red-400">*</span>}
    </label>
  )
}

// ── BlogForm ──────────────────────────────────────────────────────────────────

export function BlogForm({ blog }: { blog?: BlogRow }) {
  const isEdit = Boolean(blog)

  const [title,        setTitle]        = useState(blog?.title         ?? '')
  const [slug,         setSlug]         = useState(blog?.slug          ?? '')
  const [slugEdited,   setSlugEdited]   = useState(isEdit)
  const [excerpt,      setExcerpt]      = useState(blog?.excerpt       ?? '')
  const [content,      setContent]      = useState(blog?.content       ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(blog?.thumbnail_url ?? '')
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [serverError,  setServerError]  = useState<string | null>(null)
  const [pendingBtn,   setPendingBtn]   = useState<'draft' | 'published' | null>(null)

  const [isPending, start] = useTransition()
  const router = useRouter()

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!slugEdited) setSlug(toSlug(val))
  }

  function handleSlugChange(val: string) {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugEdited(true)
  }

  async function handleSubmit(status: 'draft' | 'published') {
    const parsed = blogSchema.safeParse({
      title,
      slug,
      excerpt:       excerpt       || undefined,
      content:       content       || undefined,
      thumbnail_url: thumbnailUrl  || undefined,
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
      let res: { ok: boolean; error?: string }

      if (isEdit && blog) {
        res = await updateBlog(blog.id, parsed.data)
      } else {
        const createRes = await createBlog(parsed.data)
        res = createRes
      }

      setPendingBtn(null)

      if (!res.ok) {
        setServerError(res.error ?? 'Có lỗi xảy ra. Vui lòng thử lại.')
        return
      }

      router.push('/admin/blogs')
      router.refresh()
    })
  }

  const isSubmitting = isPending

  return (
    <form
      onSubmit={e => e.preventDefault()}
      className="space-y-5"
      noValidate
    >
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

      {/* Slug */}
      <div>
        <Label htmlFor="slug" required>Slug (URL)</Label>
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-vio-forest focus-within:bg-white focus-within:ring-2 focus-within:ring-vio-forest/15">
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

      {/* Thumbnail URL */}
      <div>
        <Label htmlFor="thumbnail_url">URL ảnh đại diện</Label>
        <input
          id="thumbnail_url"
          type="url"
          value={thumbnailUrl}
          onChange={e => setThumbnailUrl(e.target.value)}
          placeholder="https://example.com/anh-bai-viet.jpg"
          className={[
            'block w-full rounded-2xl border bg-white px-4 py-3 text-[14px] text-gray-900',
            'placeholder-gray-400 outline-none transition-all',
            'focus:border-vio-forest focus:ring-2 focus:ring-vio-forest/15',
            errors.thumbnail_url ? 'border-red-400' : 'border-gray-200',
          ].join(' ')}
        />
        {thumbnailUrl && !errors.thumbnail_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={thumbnailUrl} alt="Preview" className="mt-2 h-28 w-full rounded-xl object-cover" />
        )}
        <FieldError msg={errors.thumbnail_url} />
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
          <span className="text-[11px] text-gray-400">{excerpt.length} / 500</span>
        </div>
      </div>

      {/* Content */}
      <div>
        <Label htmlFor="content">Nội dung bài viết (HTML)</Label>
        <textarea
          id="content"
          rows={20}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="<h2>Tiêu đề phụ</h2>&#10;<p>Nội dung đoạn văn...</p>"
          spellCheck={false}
          className={[
            'block w-full rounded-2xl border bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-gray-900',
            'placeholder-gray-400 outline-none transition-all',
            'focus:border-vio-forest focus:ring-2 focus:ring-vio-forest/15',
            errors.content ? 'border-red-400' : 'border-gray-200',
          ].join(' ')}
        />
        <p className="mt-1.5 text-[11px] text-gray-400">
          Nhập HTML trực tiếp. Rich Text Editor sẽ được tích hợp sau.
        </p>
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
          {pendingBtn === 'draft' && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          )}
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
          {pendingBtn === 'published' && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          )}
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
