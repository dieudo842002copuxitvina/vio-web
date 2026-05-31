'use client'

import { useState, useEffect, useRef }   from 'react'
import { useRouter }                      from 'next/navigation'
import { createClient }                   from '@/lib/supabase/client'
import { LAND_TYPE_LABELS }               from '@/entities/listing'
import type { LandType }                  from '@/entities/listing'
import { Card, CardHeader, CardContent }  from '@/shared/ui/card'
import { Input }                          from '@/shared/ui/input'
import { Button }                         from '@/shared/ui/button'
import { toSlug }                         from '@/entities/search/model/normalize'

function slugify(text: string): string {
  return toSlug(text) + '-' + Date.now().toString(36)
}

function formatPriceText(n: number): string {
  if (n >= 1_000_000_000) {
    const ty = n / 1_000_000_000
    return `${ty % 1 === 0 ? ty : ty.toFixed(1)} Tỷ`
  }
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} Triệu`
  return `${n.toLocaleString('vi-VN')} đ`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type GeoOption  = { id: number; name: string }
type Business   = { id: string; business_name: string }
type ImageItem  = { file: File; objectUrl: string }
type SubmitPhase = 'idle' | 'uploading' | 'saving' | 'done' | 'error'

const SOIL_TYPES    = ['Đất đỏ basalt', 'Đất xám', 'Đất phù sa', 'Đất thịt', 'Đất cát', 'Đất than bùn']
const WATER_SOURCES = ['Giếng khoan', 'Suối', 'Hồ', 'Kênh tưới', 'Nước mưa', 'Nước ngầm']
const LEGAL_OPTIONS = ['Sổ đỏ (GCNQSDĐ)', 'Sổ hồng', 'Giấy tay', 'Đang làm thủ tục', 'Khác']

const BLANK = {
  title:       '',
  price:       '',
  area:        '',
  landType:    '' as LandType | '',
  soilType:    '',
  waterSource: '',
  legalStatus: '',
  crops:       '',
  description: '',
  phone:       '',
  province_id: '',
  district_id: '',
  ward_id:     '',
  business_id: '',
}

// ── Style constants ───────────────────────────────────────────────────────────

const SELECT_CLS = [
  'h-11 w-full rounded-xl border border-gray-200 bg-white/80 px-4',
  'text-base text-gray-900 outline-none transition-all duration-200',
  'focus:ring-2 focus:ring-vio-primary/20 focus:border-vio-primary',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'dark:bg-[#2C2C2E] dark:text-white dark:border-white/[0.1]',
].join(' ')

const TEXTAREA_CLS = [
  'w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3',
  'text-base text-gray-900 placeholder:text-gray-400 resize-none',
  'outline-none transition-all duration-200',
  'focus:ring-2 focus:ring-vio-primary/20 focus:border-vio-primary',
  'dark:bg-[#2C2C2E] dark:text-white dark:border-white/[0.1]',
].join(' ')

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DangTinDatPage() {
  const router = useRouter()

  const [form, setForm]             = useState(BLANK)
  const [images, setImages]         = useState<ImageItem[]>([])
  const [isDragging, setDrag]       = useState(false)
  const [phase, setPhase]           = useState<SubmitPhase>('idle')
  const [uploadProg, setUploadProg] = useState({ done: 0, total: 0 })
  const [errorMsg, setError]        = useState<string | null>(null)
  const [provinces, setProvinces]   = useState<GeoOption[]>([])
  const [districts, setDistricts]   = useState<GeoOption[]>([])
  const [wards, setWards]           = useState<GeoOption[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const fileInput                   = useRef<HTMLInputElement>(null)

  // Load provinces
  useEffect(() => {
    createClient()
      .from('provinces')
      .select('id, name')
      .order('name', { ascending: true })
      .then(({ data }: { data: GeoOption[] | null }) => { if (data) setProvinces(data) })
  }, [])

  // Load user's businesses for linking
  useEffect(() => {
    async function loadBiz() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb
        .from('storefronts')
        .select('id, business_name')
        .eq('owner_id', user.id)
      if (data) setBusinesses(data as Business[])
    }
    loadBiz()
  }, [])

  // Cascade: province → districts
  useEffect(() => {
    if (!form.province_id) { setDistricts([]); setWards([]); return }
    createClient()
      .from('districts')
      .select('id, name')
      .eq('province_id', Number(form.province_id))
      .order('name', { ascending: true })
      .then(({ data }: { data: GeoOption[] | null }) => {
        if (data) setDistricts(data)
        setWards([])
      })
  }, [form.province_id])

  // Cascade: district → wards
  useEffect(() => {
    if (!form.district_id) { setWards([]); return }
    createClient()
      .from('wards')
      .select('id, name')
      .eq('district_id', Number(form.district_id))
      .order('name', { ascending: true })
      .then(({ data }: { data: GeoOption[] | null }) => { if (data) setWards(data) })
  }, [form.district_id])

  // Revoke object URLs on unmount
  useEffect(() => () => { images.forEach(i => URL.revokeObjectURL(i.objectUrl)) }, [images])

  function set<K extends keyof typeof BLANK>(key: K, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    const next: ImageItem[] = Array.from(files)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phase === 'uploading' || phase === 'saving') return
    setError(null)

    if (!form.title.trim()) { setError('Vui lòng nhập tiêu đề tin đăng.'); return }

    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setError('Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.'); return }

      // ── Phase 1: Upload images ─────────────────────────────────────────────
      const publicUrls: string[] = []
      if (images.length > 0) {
        setPhase('uploading')
        setUploadProg({ done: 0, total: images.length })
        for (let i = 0; i < images.length; i++) {
          const { file } = images[i]
          const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
          const path = `${user.id}/${Date.now()}-${i}.${ext}`
          const { error: upErr } = await sb.storage
            .from('listing-media')
            .upload(path, file, { cacheControl: '2592000', upsert: false })
          if (upErr) throw new Error(`Ảnh ${i + 1}: ${upErr.message}`)
          publicUrls.push(sb.storage.from('listing-media').getPublicUrl(path).data.publicUrl)
          setUploadProg({ done: i + 1, total: images.length })
        }
      }

      // ── Phase 2: Insert listing ────────────────────────────────────────────
      setPhase('saving')

      const priceNum = form.price ? Number(form.price) : null
      const areaNum  = form.area  ? Number(form.area)  : null
      const cropsArr = form.crops.split(',').map(s => s.trim()).filter(Boolean)

      const { data: listing, error: insErr } = await sb
        .from('listings')
        .insert({
          type:              'land',
          owner_id:          user.id,
          slug:              slugify(form.title),
          title:             form.title.trim(),
          description:       form.description.trim() || null,
          price_text:        priceNum ? formatPriceText(priceNum) : null,
          cover_url:         publicUrls[0] ?? null,
          contact_phone:     form.phone.trim() || null,
          province_id:       form.province_id  ? Number(form.province_id) : null,
          district_id:       form.district_id  ? Number(form.district_id) : null,
          storefront_id:     form.business_id  || null,
          status:            'draft',
          moderation_status: 'pending',
          is_public:         false,
          is_featured:       false,
        })
        .select('id')
        .single()

      if (insErr) throw new Error(insErr.message)

      // ── Phase 3: Insert attribute values ───────────────────────────────────
      const attrRows = [
        areaNum           ? { listing_id: listing.id, key: 'area_m2',       value_number: areaNum, value_text: `${areaNum.toLocaleString('vi-VN')} m²` } : null,
        form.landType     ? { listing_id: listing.id, key: 'land_type',     value_text: form.landType }     : null,
        form.legalStatus  ? { listing_id: listing.id, key: 'legal_status',  value_text: form.legalStatus }  : null,
        form.soilType     ? { listing_id: listing.id, key: 'soil_type',     value_text: form.soilType }     : null,
        form.waterSource  ? { listing_id: listing.id, key: 'water_source',  value_text: form.waterSource }  : null,
        cropsArr.length   ? { listing_id: listing.id, key: 'current_crops', value_json: cropsArr }          : null,
      ].filter(Boolean)
      if (attrRows.length) await sb.from('listing_attribute_values').insert(attrRows)

      // ── Phase 4: Insert media records ──────────────────────────────────────
      if (publicUrls.length > 0) {
        await sb.from('listing_media').insert(
          publicUrls.map((url, sort_order) => ({
            listing_id: listing.id,
            url,
            type:       'image',
            sort_order,
          }))
        )
      }

      setPhase('done')

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
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#34C759]/10">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="24" fill="#34C759" />
            <path d="M13 24.5l7.5 7.5 14.5-15" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="m-0 text-2xl font-bold tracking-tight text-gray-900">Đăng tin thành công!</p>
          <p className="m-0 mt-2 text-[0.9375rem] text-gray-500">
            Tin đất đang chờ kiểm duyệt và sẽ xuất hiện sau khi được xét duyệt.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" onClick={() => { setPhase('idle'); setForm(BLANK); setImages([]) }}>
            Đăng tin khác
          </Button>
          <Button variant="primary" size="lg" onClick={() => router.push('/dashboard')}>
            Về tổng quan
          </Button>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-2xl">

        <header className="mb-8">
          <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Cổng đăng tin đất nông nghiệp
          </p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Đăng tin Đất
          </h1>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* ── Thông tin cơ bản ── */}
          <Card>
            <CardHeader>
              <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Thông tin cơ bản</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="title"
                label="Tiêu đề"
                hint="Bắt buộc"
                placeholder="VD: Bán đất lúa 5ha tại Đồng Tháp"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="price"
                  label="Giá (đồng)"
                  type="number"
                  placeholder="500000000"
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                />
                <Input
                  id="area"
                  label="Diện tích (m²)"
                  type="number"
                  placeholder="5000"
                  value={form.area}
                  onChange={e => set('area', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="landType" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                  Loại đất
                </label>
                <select id="landType" value={form.landType} onChange={e => set('landType', e.target.value as LandType | '')} className={SELECT_CLS}>
                  <option value="">-- Chọn loại đất --</option>
                  {(Object.entries(LAND_TYPE_LABELS) as [LandType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="legalStatus" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                  Pháp lý
                </label>
                <select id="legalStatus" value={form.legalStatus} onChange={e => set('legalStatus', e.target.value)} className={SELECT_CLS}>
                  <option value="">-- Chọn tình trạng pháp lý --</option>
                  {LEGAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <Input
                id="phone"
                label="Số điện thoại liên hệ"
                type="tel"
                placeholder="0912 345 678"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </CardContent>
          </Card>

          {/* ── Đặc tính nông nghiệp ── */}
          <Card>
            <CardHeader>
              <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Đặc tính Nông nghiệp</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="soilType" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                  Loại đất (chất đất)
                </label>
                <select id="soilType" value={form.soilType} onChange={e => set('soilType', e.target.value)} className={SELECT_CLS}>
                  <option value="">-- Chọn loại đất --</option>
                  {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="waterSource" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                  Nguồn nước
                </label>
                <select id="waterSource" value={form.waterSource} onChange={e => set('waterSource', e.target.value)} className={SELECT_CLS}>
                  <option value="">-- Chọn nguồn nước --</option>
                  {WATER_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <Input
                id="crops"
                label="Cây trồng hiện tại"
                hint="Ngăn cách bằng dấu phẩy"
                placeholder="VD: Lúa, Bắp, Rau muống"
                value={form.crops}
                onChange={e => set('crops', e.target.value)}
              />
            </CardContent>
          </Card>

          {/* ── Vị trí ── */}
          <Card>
            <CardHeader>
              <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Vị trí</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: 'province_id', label: 'Tỉnh / Thành phố', opts: provinces, disabled: false,
                  val: form.province_id, placeholder: '-- Chọn tỉnh / thành phố --',
                  onChange: (v: string) => { set('province_id', v); set('district_id', ''); set('ward_id', '') } },
                { id: 'district_id', label: 'Quận / Huyện', opts: districts, disabled: districts.length === 0,
                  val: form.district_id, placeholder: '-- Chọn quận / huyện --',
                  onChange: (v: string) => { set('district_id', v); set('ward_id', '') } },
                { id: 'ward_id', label: 'Phường / Xã', opts: wards, disabled: wards.length === 0,
                  val: form.ward_id, placeholder: '-- Chọn phường / xã --',
                  onChange: (v: string) => set('ward_id', v) },
              ].map(({ id, label, opts, disabled, val, placeholder, onChange }) => (
                <div key={id} className="flex flex-col gap-1.5">
                  <label htmlFor={id} className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                    {label}
                  </label>
                  <select id={id} value={val} disabled={disabled} onChange={e => onChange(e.target.value)} className={SELECT_CLS}>
                    <option value="">{placeholder}</option>
                    {opts.map(o => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
                  </select>
                </div>
              ))}

              {businesses.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="business_id" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                    Liên kết doanh nghiệp <span className="font-normal text-gray-400">(tùy chọn)</span>
                  </label>
                  <select id="business_id" value={form.business_id} onChange={e => set('business_id', e.target.value)} className={SELECT_CLS}>
                    <option value="">-- Không liên kết --</option>
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                  Mô tả thêm
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Mô tả vị trí, đường đi vào, tiện ích xung quanh..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  className={TEXTAREA_CLS}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Hình ảnh ── */}
          <Card>
            <CardHeader>
              <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Hình ảnh</p>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Thả ảnh vào đây hoặc nhấn để chọn"
                className={[
                  'flex cursor-pointer flex-col items-center justify-center gap-2',
                  'rounded-2xl border-2 border-dashed p-8 text-center',
                  'transition-colors duration-200',
                  isDragging
                    ? 'border-vio-primary bg-vio-primary/5'
                    : 'border-gray-200 bg-gray-50/50 hover:border-vio-primary hover:bg-vio-primary/5 dark:bg-[#1C1C1E] dark:border-white/[0.1]',
                ].join(' ')}
                onClick={() => fileInput.current?.click()}
                onKeyDown={e => e.key === 'Enter' && fileInput.current?.click()}
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
              >
                <span className="text-3xl" aria-hidden="true">📷</span>
                <p className="m-0 text-[0.875rem] font-semibold text-gray-600 dark:text-gray-400">
                  Kéo thả ảnh vào đây
                </p>
                <p className="m-0 text-xs text-gray-400">hoặc nhấn để chọn ảnh từ thiết bị</p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />

              {/* Preview grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square overflow-hidden rounded-xl">
                      <img src={img.objectUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                        aria-label="Xóa ảnh"
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload progress */}
              {phase === 'uploading' && uploadProg.total > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Đang tải ảnh…</span>
                    <span>{uploadProg.done}/{uploadProg.total}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-vio-primary transition-all duration-300"
                      style={{ width: `${(uploadProg.done / uploadProg.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Error message */}
          {errorMsg && (
            <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20">
              {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isBusy}
            disabled={!form.title.trim()}
            className="w-full rounded-full"
          >
            {phase === 'uploading'
              ? `Đang tải ảnh ${uploadProg.done}/${uploadProg.total}…`
              : phase === 'saving'
                ? 'Đang lưu…'
                : 'Đăng tin đất'}
          </Button>

        </form>
      </div>
    </div>
  )
}
