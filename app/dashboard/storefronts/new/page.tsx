'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  business_name: string
  description:   string
  phone:         string
  zalo_url:      string
  facebook_url:  string
}

const EMPTY: FormState = {
  business_name: '',
  description:   '',
  phone:         '',
  zalo_url:      '',
  facebook_url:  '',
}

export default function NewStorefrontPage() {
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

    const slug = `${toSlug(form.business_name)}-${Date.now().toString(36)}`

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/dang-nhap'); return }

    setLoading(true)
    const { error: insertError } = await supabase
      .from('storefronts')
      .insert({
        owner_id:      user.id,
        slug,
        business_name: form.business_name.trim(),
        description:   form.description.trim()   || null,
        phone:         form.phone.trim()         || null,
        zalo_url:      form.zalo_url.trim()      || null,
        facebook_url:  form.facebook_url.trim()  || null,
        is_public:     false,
        is_verified:   false,
      })
    setLoading(false)

    if (insertError) {
      setError(
        insertError.code === '23505'
          ? 'Tên cửa hàng đã tồn tại, vui lòng chọn tên khác.'
          : insertError.message,
      )
      return
    }

    router.push(`/ho-kinh-doanh/${slug}`)
  }

  return (
    <main className="page-wrap py-10 max-w-2xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--muted)] mb-8">
        <Link href="/dashboard" className="text-[var(--muted)] no-underline hover:text-[var(--sea-ink)]">Dashboard</Link>
        <span>/</span>
        <span className="text-[var(--sea-ink)]">Thêm cửa hàng mới</span>
      </nav>

      <header className="mb-8">
        <p className="island-kicker mb-1.5">Hộ kinh doanh</p>
        <h1 className="text-[1.75rem] font-bold text-[var(--sea-ink)] m-0">Thêm cửa hàng mới</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Sau khi tạo, cửa hàng sẽ ở chế độ ẩn cho đến khi bạn kích hoạt.
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

        {/* Card: Thông tin cơ bản */}
        <section className="island-shell rounded-2xl p-6 flex flex-col gap-5">
          <h2 className="m-0 text-base font-semibold text-[var(--sea-ink)]">Thông tin cơ bản</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="business_name" className="text-sm font-medium text-[var(--sea-ink-soft)]">
              Tên cửa hàng <span className="text-[#c0392b]">*</span>
            </label>
            <input
              id="business_name" type="text"
              value={form.business_name}
              onChange={e => set('business_name', e.target.value)}
              placeholder="VD: Vựa trái cây Bà Ba"
              required maxLength={120}
              className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors"
            />
            {form.business_name && (
              <p className="text-[0.6875rem] text-[var(--muted)] mt-0.5">
                URL: /ho-kinh-doanh/<span className="text-[var(--sea-ink-soft)]">{toSlug(form.business_name)}-…</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium text-[var(--sea-ink-soft)]">
              Mô tả ngắn
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Giới thiệu về sản phẩm và dịch vụ của bạn..."
              rows={3} maxLength={500}
              className="px-4 py-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors resize-none"
            />
            <p className="text-[0.6875rem] text-[var(--muted)] mt-0.5 self-end">
              {form.description.length}/500
            </p>
          </div>
        </section>

        {/* Card: Liên hệ */}
        <section className="island-shell rounded-2xl p-6 flex flex-col gap-5">
          <h2 className="m-0 text-base font-semibold text-[var(--sea-ink)]">Thông tin liên hệ</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-[var(--sea-ink-soft)]">Số điện thoại</label>
              <input
                id="phone" type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="0901 234 567"
                className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="zalo_url" className="text-sm font-medium text-[var(--sea-ink-soft)]">Zalo</label>
              <input
                id="zalo_url" type="text"
                value={form.zalo_url}
                onChange={e => set('zalo_url', e.target.value)}
                placeholder="https://zalo.me/..."
                className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="facebook_url" className="text-sm font-medium text-[var(--sea-ink-soft)]">Facebook</label>
            <input
              id="facebook_url" type="url"
              value={form.facebook_url}
              onChange={e => set('facebook_url', e.target.value)}
              placeholder="https://facebook.com/..."
              className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors"
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Link href="/dashboard" className="btn-secondary px-5">Hủy</Link>
          <button
            type="submit"
            disabled={loading || !form.business_name.trim()}
            className="btn-primary px-6"
          >
            {loading
              ? <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
                  </svg>
                  Đang lưu...
                </span>
              : 'Tạo cửa hàng'
            }
          </button>
        </div>

      </form>
    </main>
  )
}
