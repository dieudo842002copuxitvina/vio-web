'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient }                from '@/lib/supabase/client'
import { LAND_TYPE_LABELS }            from '@/features/land-listings/types'
import type { LandType }               from '@/features/land-listings/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36)
}

function formatPriceText(n: number): string {
  if (n >= 1_000_000_000) {
    const ty = n / 1_000_000_000
    return `${ty % 1 === 0 ? ty : ty.toFixed(1).replace(/\.0$/, '')} Tỷ`
  }
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} Triệu`
  return `${n.toLocaleString('vi-VN')} đ`
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category { id: number; name: string; slug: string }
interface ImagePreview { file: File; objectUrl: string }
type SubmitPhase = 'idle' | 'uploading' | 'saving' | 'done' | 'error'

const BLANK = {
  title:       '',
  price:       '',
  area:        '',
  categoryId:  '',
  landType:    '' as LandType | '',
  soilType:    '',
  waterSource: '',
  legalStatus: '',
  crops:       '',
  description: '',
  phone:       '',
}

// ── Shared class strings ──────────────────────────────────────────────────────

const INPUT = [
  'w-full rounded-xl border border-gray-200 bg-gray-50 p-4',
  'text-[0.9375rem] text-gray-900 placeholder:text-gray-400',
  'outline-none transition-colors',
  'focus:border-gray-400 focus:bg-white',
  'dark:border-white/[0.1] dark:bg-[#2C2C2E] dark:text-white',
  'dark:focus:border-white/30 dark:focus:bg-[#3A3A3C]',
].join(' ')

const BLOCK = [
  'rounded-3xl border border-gray-100 bg-white p-6 shadow-sm',
  'dark:border-white/[0.06] dark:bg-[#1C1C1E]',
].join(' ')

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">{text}</span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label text={label} hint={hint} />
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DangTinPage() {
  const [form, setForm]       = useState(BLANK)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages]   = useState<ImagePreview[]>([])
  const [isDragging, setDrag] = useState(false)
  const [phase, setPhase]     = useState<SubmitPhase>('idle')
  const [uploadProg, setUploadProg] = useState({ done: 0, total: 0 })
  const [errorMsg, setError]  = useState<string | null>(null)
  const fileInput             = useRef<HTMLInputElement>(null)

  // Fetch categories once
  useEffect(() => {
    const sb = createClient()
    sb.from('land_categories')
      .select('id, name, slug')
      .order('sort_order', { ascending: true })
      .then(({ data }) => { if (data) setCategories(data as Category[]) })
  }, [])

  // Revoke object URLs on unmount / image list change
  useEffect(() => {
    return () => images.forEach(i => URL.revokeObjectURL(i.objectUrl))
  }, [images])

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function set<K extends keyof typeof BLANK>(key: K, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  // ── Image helpers ─────────────────────────────────────────────────────────────

  function addFiles(files: FileList | null) {
    if (!files) return
    const next: ImagePreview[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({ file, objectUrl: URL.createObjectURL(file) }))
    setImages(prev => [...prev, ...next])
  }

  function removeImage(idx: number) {
    setImages(prev => {
      URL.revokeObjectURL(prev[idx].objectUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    addFiles(e.dataTransfer.files)
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phase === 'uploading' || phase === 'saving') return

    setError(null)

    if (!form.title.trim()) {
      setError('Vui lòng nhập tiêu đề tin đăng.')
      return
    }

    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setError('Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.'); return }

      // ── Step 1: Upload images ──────────────────────────────────────────────
      const publicUrls: string[] = []

      if (images.length > 0) {
        setPhase('uploading')
        setUploadProg({ done: 0, total: images.length })

        for (let i = 0; i < images.length; i++) {
          const { file } = images[i]
          const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
          const path = `${user.id}/${Date.now()}-${i}.${ext}`

          const { error: upErr } = await sb.storage
            .from('land_images')
            .upload(path, file, { cacheControl: '2592000', upsert: false })

          if (upErr) throw new Error(`Ảnh ${i + 1}: ${upErr.message}`)

          const { data: { publicUrl } } = sb.storage.from('land_images').getPublicUrl(path)
          publicUrls.push(publicUrl)
          setUploadProg({ done: i + 1, total: images.length })
        }
      }

      // ── Step 2: Insert listing ─────────────────────────────────────────────
      setPhase('saving')

      const priceNum = form.price ? Number(form.price) : null
      const areaNum  = form.area  ? Number(form.area)  : null
      const cropsArr = form.crops
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      const { data: listing, error: insErr } = await sb
        .from('land_listings')
        .insert({
          owner_id:          user.id,
          slug:              slugify(form.title),
          title:             form.title.trim(),
          description:       form.description.trim() || null,
          price_text:        priceNum ? formatPriceText(priceNum) : null,
          land_area_text:    areaNum  ? `${areaNum.toLocaleString('vi-VN')} m²` : null,
          land_type:         form.landType  || null,
          legal_status_text: form.legalStatus.trim()  || null,
          // crop_type stores a single value; current_crops stores the full array (PostGIS schema)
          crop_type:         cropsArr[0] ?? null,
          current_crops:     cropsArr.length > 0 ? cropsArr : null,
          soil_type:         form.soilType.trim()     || null,
          water_source:      form.waterSource.trim()  || null,
          phone:             form.phone.trim()         || null,
          category_id:       form.categoryId           || null,
          moderation_status: 'pending',
          is_public:         false,
          is_featured:       false,
        })
        .select('id')
        .single()

      if (insErr) throw new Error(insErr.message)

      // ── Step 3: Insert image records ───────────────────────────────────────
      if (publicUrls.length > 0) {
        await sb.from('land_listing_images').insert(
          publicUrls.map((image_url, sort_order) => ({
            land_listing_id: listing.id,
            image_url,
            sort_order,
          }))
        )
      }

      // ── Done ───────────────────────────────────────────────────────────────
      setPhase('done')
      setForm(BLANK)
      images.forEach(i => URL.revokeObjectURL(i.objectUrl))
      setImages([])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.')
      setPhase('error')
    }
  }

  const isBusy = phase === 'uploading' || phase === 'saving'

  // ── Success screen ─────────────────────────────────────────────────────────

  if (phase === 'done') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-10 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="24" fill="#34C759" />
            <path d="M13 24.5l7.5 7.5 14.5-15" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Đăng tin thành công!
          </p>
          <p className="m-0 mt-2 text-[0.9375rem] text-gray-500 dark:text-gray-400">
            Tin đang chờ kiểm duyệt và sẽ xuất hiện sau khi được xét duyệt.
          </p>
        </div>
        <button
          onClick={() => setPhase('idle')}
          className="rounded-full bg-black px-8 py-3 font-bold text-white transition-opacity hover:opacity-80 active:scale-95 dark:bg-white dark:text-black"
        >
          Đăng tin khác
        </button>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Cổng nhập liệu
          </p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Đăng tin Bất động sản
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* ── Block 1: Thông tin cơ bản ── */}
          <div className={BLOCK}>
            <p className="mb-5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
              Thông tin cơ bản
            </p>
            <div className="space-y-4">

              <Field label="Tiêu đề *">
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="VD: Vườn Sầu Riêng 3ha Định Quán, Năng Suất Cao"
                  className={INPUT}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Giá (VNĐ)">
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="3500000000"
                    className={INPUT}
                  />
                  {form.price && !isNaN(Number(form.price)) && Number(form.price) > 0 && (
                    <p className="mt-1 text-xs font-semibold text-[#0071E3] dark:text-[#409CFF]">
                      ≈ {formatPriceText(Number(form.price))}
                    </p>
                  )}
                </Field>

                <Field label="Diện tích (m²)">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.area}
                    onChange={e => set('area', e.target.value)}
                    placeholder="30000"
                    className={INPUT}
                  />
                  {form.area && !isNaN(Number(form.area)) && Number(form.area) > 0 && (
                    <p className="mt-1 text-xs font-semibold text-[#0071E3] dark:text-[#409CFF]">
                      {Number(form.area).toLocaleString('vi-VN')} m²
                      &nbsp;·&nbsp;
                      {(Number(form.area) / 10_000).toFixed(2)} ha
                    </p>
                  )}
                </Field>
              </div>

              <Field label="Danh mục đất">
                <select
                  value={form.categoryId}
                  onChange={e => set('categoryId', e.target.value)}
                  className={INPUT}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </Field>

            </div>
          </div>

          {/* ── Block 2: Chi tiết Nông nghiệp ── */}
          <div className={BLOCK}>
            <p className="mb-5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
              Chi tiết Nông nghiệp
            </p>
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <Field label="Loại đất">
                  <select
                    value={form.landType}
                    onChange={e => set('landType', e.target.value)}
                    className={INPUT}
                  >
                    <option value="">-- Chọn loại đất --</option>
                    {(Object.entries(LAND_TYPE_LABELS) as [LandType, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Chất đất">
                  <input
                    type="text"
                    value={form.soilType}
                    onChange={e => set('soilType', e.target.value)}
                    placeholder="VD: Đất đỏ bazan, phù sa"
                    className={INPUT}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nguồn nước">
                  <input
                    type="text"
                    value={form.waterSource}
                    onChange={e => set('waterSource', e.target.value)}
                    placeholder="VD: Giếng khoan, hồ, mưa"
                    className={INPUT}
                  />
                </Field>

                <Field label="Tình trạng pháp lý">
                  <input
                    type="text"
                    value={form.legalStatus}
                    onChange={e => set('legalStatus', e.target.value)}
                    placeholder="VD: Sổ đỏ riêng"
                    className={INPUT}
                  />
                </Field>
              </div>

              <Field label="Cây trồng hiện tại" hint="phân cách bằng dấu phẩy">
                <input
                  type="text"
                  value={form.crops}
                  onChange={e => set('crops', e.target.value)}
                  placeholder="VD: Sầu riêng, Bơ, Cà phê"
                  className={INPUT}
                />
                {/* Live tag preview */}
                {form.crops.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.crops.split(',').map(s => s.trim()).filter(Boolean).map(tag => (
                      <span
                        key={tag}
                        className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      >
                        🌿 {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Số điện thoại liên hệ">
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="VD: 0912 345 678"
                    className={INPUT}
                  />
                </Field>
              </div>

              <Field label="Mô tả chi tiết">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Vị trí, đặc điểm nổi bật, lưu ý cho người mua..."
                  className={`${INPUT} resize-none`}
                />
              </Field>

            </div>
          </div>

          {/* ── Block 3: Hình ảnh ── */}
          <div className={BLOCK}>
            <p className="mb-5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
              Hình ảnh
            </p>

            {/* Drop zone */}
            <button
              type="button"
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileInput.current?.click()}
              className={[
                'w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center',
                'transition-colors focus:outline-none',
                isDragging
                  ? 'border-black bg-gray-50 dark:border-white dark:bg-white/[0.04]'
                  : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500',
              ].join(' ')}
              aria-label="Chọn hoặc kéo thả ảnh vào đây"
            >
              <span className="text-4xl" aria-hidden="true">
                {isDragging ? '📂' : '🖼'}
              </span>
              <p className="m-0 mt-3 font-semibold text-gray-700 dark:text-gray-300">
                {isDragging ? 'Thả ảnh vào đây' : 'Kéo & thả hoặc bấm để chọn ảnh'}
              </p>
              <p className="m-0 mt-1.5 text-xs text-gray-400">
                PNG · JPG · WEBP — tối đa 10 MB mỗi ảnh
              </p>
            </button>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = '' }}
            />

            {/* Previews */}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((img, idx) => (
                  <div
                    key={img.objectUrl}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.objectUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      aria-label={`Xóa ảnh ${idx + 1}`}
                    >
                      ×
                    </button>

                    {/* Cover badge */}
                    {idx === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                        Bìa
                      </span>
                    )}

                    {/* Upload progress overlay */}
                    {phase === 'uploading' && idx >= uploadProg.done && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Spinner />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload progress bar */}
            {phase === 'uploading' && uploadProg.total > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
                  <span>Đang upload ảnh…</span>
                  <span className="font-semibold">{uploadProg.done}/{uploadProg.total}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-black transition-all duration-300 dark:bg-white"
                    style={{ width: `${(uploadProg.done / uploadProg.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error alert */}
          {errorMsg && (
            <p
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400"
            >
              <span aria-hidden="true" className="mt-px shrink-0">⚠️</span>
              {errorMsg}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isBusy}
            className="flex w-full items-center justify-center gap-2.5 rounded-full bg-black py-4 text-lg font-bold text-white transition-all active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {phase === 'uploading' && (
              <><Spinner /> Đang upload {uploadProg.done}/{uploadProg.total} ảnh…</>
            )}
            {phase === 'saving' && (
              <><Spinner /> Đang lưu tin đăng…</>
            )}
            {(phase === 'idle' || phase === 'error') && '🏷 Đăng tin ngay'}
          </button>

          <p className="m-0 text-center text-xs text-gray-400 dark:text-gray-600">
            Tin đăng sẽ được kiểm duyệt trước khi xuất hiện công khai.
          </p>

        </form>
      </div>
    </div>
  )
}
