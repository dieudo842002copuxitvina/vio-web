'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LAND_TYPE_LABELS } from '@/entities/listing'
import type { LandType } from '@/entities/listing'

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

interface FormState {
  title:             string
  description:       string
  land_type:         LandType | ''
  land_area_text:    string
  price_text:        string
  crop_type:         string
  legal_status_text: string
  coordinates_text:  string
  phone:             string
}

const EMPTY: FormState = {
  title:             '',
  description:       '',
  land_type:         '',
  land_area_text:    '',
  price_text:        '',
  crop_type:         '',
  legal_status_text: '',
  coordinates_text:  '',
  phone:             '',
}

const LAND_TYPES = Object.entries(LAND_TYPE_LABELS) as [LandType, string][]

const INPUT_CLS =
  'h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors w-full'

export default function NewLandListingPage() {
  const [form,    setForm]    = useState<FormState>(EMPTY)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const slug = `${toSlug(form.title)}-${Date.now().toString(36)}`

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/dang-nhap'); return }

    setLoading(true)
    const { data: listing, error: insertError } = await supabase
      .from('listings')
      .insert({
        type:              'land',
        owner_id:          user.id,
        slug,
        title:             form.title.trim(),
        description:       form.description.trim()  || null,
        price_text:        form.price_text.trim()   || null,
        contact_phone:     form.phone.trim()        || null,
        status:            'draft',
        is_public:         false,
        moderation_status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      setLoading(false)
      setError(insertError.message)
      return
    }

    const attrRows = [
      form.land_area_text.trim()    ? { listing_id: listing.id, key: 'area_m2',       value_text: form.land_area_text.trim() }    : null,
      form.land_type                ? { listing_id: listing.id, key: 'land_type',     value_text: form.land_type }                : null,
      form.legal_status_text.trim() ? { listing_id: listing.id, key: 'legal_status',  value_text: form.legal_status_text.trim() } : null,
      form.crop_type.trim()         ? { listing_id: listing.id, key: 'current_crops', value_text: form.crop_type.trim() }         : null,
      form.coordinates_text.trim()  ? { listing_id: listing.id, key: 'coordinates',   value_text: form.coordinates_text.trim() }  : null,
    ].filter(Boolean)
    if (attrRows.length) await supabase.from('listing_attribute_values').insert(attrRows)

    setLoading(false)

    router.push(`/dat-nong-nghiep/chi-tiet/${slug}`)
  }

  return (
    <main className="page-wrap py-10 max-w-2xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--muted)] mb-8">
        <Link href="/dashboard" className="text-[var(--muted)] no-underline hover:text-[var(--sea-ink)]">Dashboard</Link>
        <span>/</span>
        <span className="text-[var(--sea-ink)]">Đăng tin đất nông nghiệp</span>
      </nav>

      <header className="mb-8">
        <p className="island-kicker mb-1.5">Đất nông nghiệp</p>
        <h1 className="text-[1.75rem] font-bold text-[var(--sea-ink)] m-0">Đăng tin mới</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Tin sẽ được duyệt trước khi hiển thị công khai (thường trong 24h).
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

        {error && (
          <div role="alert" className="flex items-start gap-2 px-4 py-3 rounded-xl bg-[#fff1f0] border border-[#ffc9c3] text-sm text-[#c0392b]">
            <svg className="shrink-0 mt-0.5" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="7.5" cy="7.5" r="6.5" /><path d="M7.5 4.5v3M7.5 10h.01" />
            </svg>
            {error}
          </div>
        )}

        {/* Card: Thông tin chính */}
        <section className="island-shell rounded-2xl p-6 flex flex-col gap-5">
          <h2 className="m-0 text-base font-semibold text-[var(--sea-ink)]">Thông tin chính</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-medium text-[var(--sea-ink-soft)]">
              Tiêu đề tin đăng <span className="text-[#c0392b]">*</span>
            </label>
            <input
              id="title" type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="VD: Bán 5000m² đất cây lâu năm Đắk Lắk"
              required maxLength={200}
              className={INPUT_CLS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="land_type" className="text-sm font-medium text-[var(--sea-ink-soft)]">Loại đất</label>
              <select
                id="land_type"
                value={form.land_type}
                onChange={e => set('land_type', e.target.value)}
                className={`${INPUT_CLS} appearance-none cursor-pointer`}
              >
                <option value="">— Chọn loại đất —</option>
                {LAND_TYPES.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="land_area_text" className="text-sm font-medium text-[var(--sea-ink-soft)]">Diện tích</label>
              <input
                id="land_area_text" type="text"
                value={form.land_area_text}
                onChange={e => set('land_area_text', e.target.value)}
                placeholder="VD: 5.000 m²  hoặc  0.5 ha"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="price_text" className="text-sm font-medium text-[var(--sea-ink-soft)]">Giá</label>
              <input
                id="price_text" type="text"
                value={form.price_text}
                onChange={e => set('price_text', e.target.value)}
                placeholder="VD: 1.2 tỷ  hoặc  15 triệu/tháng"
                className={INPUT_CLS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="crop_type" className="text-sm font-medium text-[var(--sea-ink-soft)]">Cây trồng hiện tại</label>
              <input
                id="crop_type" type="text"
                value={form.crop_type}
                onChange={e => set('crop_type', e.target.value)}
                placeholder="VD: Sầu riêng, cà phê..."
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium text-[var(--sea-ink-soft)]">Mô tả chi tiết</label>
            <textarea
              id="description"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Mô tả vị trí, hiện trạng, tiện ích xung quanh..."
              rows={4} maxLength={2000}
              className="px-4 py-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors resize-none w-full"
            />
            <p className="text-[0.6875rem] text-[var(--muted)] self-end">{form.description.length}/2000</p>
          </div>
        </section>

        {/* Card: Pháp lý & vị trí */}
        <section className="island-shell rounded-2xl p-6 flex flex-col gap-5">
          <h2 className="m-0 text-base font-semibold text-[var(--sea-ink)]">Pháp lý &amp; vị trí</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="legal_status_text" className="text-sm font-medium text-[var(--sea-ink-soft)]">Tình trạng pháp lý</label>
            <input
              id="legal_status_text" type="text"
              value={form.legal_status_text}
              onChange={e => set('legal_status_text', e.target.value)}
              placeholder="VD: Sổ đỏ chính chủ, đất thổ cư..."
              className={INPUT_CLS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="coordinates_text" className="text-sm font-medium text-[var(--sea-ink-soft)]">Tọa độ / Địa chỉ</label>
            <input
              id="coordinates_text" type="text"
              value={form.coordinates_text}
              onChange={e => set('coordinates_text', e.target.value)}
              placeholder="VD: 12.123, 108.456  hoặc  Xã Ea Tu, TP Buôn Ma Thuột"
              className={INPUT_CLS}
            />
          </div>
        </section>

        {/* Card: Liên hệ */}
        <section className="island-shell rounded-2xl p-6 flex flex-col gap-5">
          <h2 className="m-0 text-base font-semibold text-[var(--sea-ink)]">Liên hệ</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-[var(--sea-ink-soft)]">
              Số điện thoại <span className="text-[#c0392b]">*</span>
            </label>
            <input
              id="phone" type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="0901 234 567"
              required
              className={INPUT_CLS}
            />
            <p className="text-[0.6875rem] text-[var(--muted)]">
              Hiển thị công khai để người mua liên hệ trực tiếp.
            </p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end pb-2">
          <Link href="/dashboard" className="btn-secondary px-5">Hủy</Link>
          <button
            type="submit"
            disabled={loading || !form.title.trim() || !form.phone.trim()}
            className="btn-primary px-6"
          >
            {loading
              ? <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
                  </svg>
                  Đang đăng...
                </span>
              : 'Đăng tin'
            }
          </button>
        </div>

      </form>
    </main>
  )
}
