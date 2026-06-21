'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image                             from 'next/image'
import { createClient }                  from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/shared/ui/card'
import { Input }                         from '@/shared/ui/input'
import { Button }                        from '@/shared/ui/button'
import type { Storefront }               from '@/features/storefronts/types'
import { toSlug }                         from '@/entities/search/model/normalize'

// ── Types ─────────────────────────────────────────────────────────────────────

type GeoOption = { id: number; name: string }
type Toast     = { type: 'success' | 'error'; message: string } | null

interface FormState {
  business_name: string
  phone:         string
  description:   string
  zalo_url:      string
  facebook_url:  string
  tiktok_url:    string
  province_id:   string
  district_id:   string
  ward_id:       string
}

const BLANK: FormState = {
  business_name: '', phone: '', description: '',
  zalo_url: '', facebook_url: '', tiktok_url: '',
  province_id: '', district_id: '', ward_id: '',
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

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastBanner({ toast, onDismiss }: { toast: NonNullable<Toast>; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 4000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div
      role="alert"
      className={[
        'fixed bottom-24 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap',
        'flex items-center gap-2.5 rounded-2xl px-5 py-3.5',
        'text-sm font-semibold shadow-xl',
        toast.type === 'success' ? 'bg-[#34C759] text-white' : 'bg-red-500 text-white',
      ].join(' ')}
    >
      <span aria-hidden="true">{toast.type === 'success' ? '✓' : '✕'}</span>
      {toast.message}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HoSoPage() {
  const [form, setForm]                       = useState<FormState>(BLANK)
  const [existingId, setExistingId]           = useState<string | null>(null)
  const [existingSlug, setExistingSlug]       = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl]             = useState<string | null>(null)
  const [coverUrl, setCoverUrl]               = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview]     = useState<string | null>(null)
  const [coverPreview, setCoverPreview]       = useState<string | null>(null)
  const [provinces, setProvinces]             = useState<GeoOption[]>([])
  const [districts, setDistricts]             = useState<GeoOption[]>([])
  const [wards, setWards]                     = useState<GeoOption[]>([])
  const [isBusy, setIsBusy]                   = useState(false)
  const [isInit, setIsInit]                   = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover]   = useState(false)
  const [toast, setToast]                     = useState<Toast>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const coverRef  = useRef<HTMLInputElement>(null)

  // Load provinces on mount
  useEffect(() => {
    createClient()
      .from('provinces')
      .select('id, name')
      .order('name', { ascending: true })
      .then(({ data }: { data: GeoOption[] | null }) => { if (data) setProvinces(data) })
  }, [])

  // Load existing storefront for this user
  useEffect(() => {
    async function init() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setIsInit(false); return }

      const { data } = await sb
        .from('storefronts')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (data) {
        const sf = data as unknown as Storefront
        setExistingId(sf.id)
        setExistingSlug(sf.slug)
        setForm({
          business_name: sf.business_name,
          phone:         sf.phone        ?? '',
          description:   sf.description  ?? '',
          zalo_url:      sf.zalo_url     ?? '',
          facebook_url:  sf.facebook_url ?? '',
          tiktok_url:    sf.tiktok_url   ?? '',
          province_id:   sf.province_id != null ? String(sf.province_id) : '',
          district_id:   sf.district_id != null ? String(sf.district_id) : '',
          ward_id:       sf.ward_id     != null ? String(sf.ward_id)     : '',
        })
        setAvatarUrl(sf.avatar_url)
        setCoverUrl(sf.cover_image_url)
      }
      setIsInit(false)
    }
    init()
  }, [])

  // Cascade: province → districts
  useEffect(() => {
    if (!form.province_id) {
      void Promise.resolve().then(() => { setDistricts([]); setWards([]) })
      return
    }
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
    if (!form.district_id) {
      void Promise.resolve().then(() => setWards([]))
      return
    }
    createClient()
      .from('wards')
      .select('id, name')
      .eq('district_id', Number(form.district_id))
      .order('name', { ascending: true })
      .then(({ data }: { data: GeoOption[] | null }) => { if (data) setWards(data) })
  }, [form.district_id])

  function set<K extends keyof FormState>(key: K, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const sb = createClient()
    const { error } = await sb.storage
      .from('business-images')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) return null
    return sb.storage.from('business-images').getPublicUrl(path).data.publicUrl
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    setUploadingAvatar(true)
    const { data: { user } } = await createClient().auth.getUser()
    if (user) {
      const url = await uploadFile(file, `${user.id}/avatar`)
      if (url) setAvatarUrl(url)
    }
    setUploadingAvatar(false)
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverPreview(URL.createObjectURL(file))
    setUploadingCover(true)
    const { data: { user } } = await createClient().auth.getUser()
    if (user) {
      const url = await uploadFile(file, `${user.id}/cover`)
      if (url) setCoverUrl(url)
    }
    setUploadingCover(false)
  }

  const dismissToast = useCallback(() => setToast(null), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.business_name.trim()) return
    setIsBusy(true)
    setToast(null)

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setIsBusy(false); return }

    const payload = {
      owner_id:        user.id,
      slug:            existingSlug ?? toSlug(form.business_name),
      business_name:   form.business_name.trim(),
      phone:           form.phone.trim()        || null,
      description:     form.description.trim()  || null,
      zalo_url:        form.zalo_url.trim()     || null,
      facebook_url:    form.facebook_url.trim() || null,
      tiktok_url:      form.tiktok_url.trim()   || null,
      province_id:     form.province_id ? Number(form.province_id) : null,
      district_id:     form.district_id ? Number(form.district_id) : null,
      ward_id:         form.ward_id     ? Number(form.ward_id)     : null,
      avatar_url:      avatarUrl      ?? null,
      cover_image_url: coverUrl       ?? null,
    }

    let errMsg: string | null = null

    if (existingId) {
      const { error } = await sb.from('storefronts').update(payload).eq('id', existingId)
      if (error) errMsg = error.message
    } else {
      const { data, error } = await sb.from('storefronts').insert(payload).select('id').single()
      if (error) errMsg = error.message
      else if (data) {
        const row = data as { id: string }
        setExistingId(row.id)
        setExistingSlug(payload.slug)
      }
    }

    setIsBusy(false)
    setToast(
      errMsg
        ? { type: 'error',   message: `Lỗi: ${errMsg}` }
        : { type: 'success', message: 'Đã lưu hồ sơ thành công!' },
    )
  }

  // ── Init skeleton ─────────────────────────────────────────────────────────────
  if (isInit) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-40 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl p-4 pb-28 md:p-8">

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Hồ sơ doanh nghiệp
      </h1>

      {toast && <ToastBanner toast={toast} onDismiss={dismissToast} />}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* ── Hình ảnh ── */}
        <Card>
          <CardHeader>
            <p className="m-0 text-[0.9375rem] font-bold text-gray-900 dark:text-white">Hình ảnh</p>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Cover — rectangular banner */}
            <div>
              <p className="mb-2 text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">Ảnh bìa</p>
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                className="relative h-32 w-full overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-vio-primary hover:bg-vio-primary/5 dark:border-white/[0.1] dark:bg-[#1C1C1E]"
                aria-label="Tải ảnh bìa"
              >
                {(coverPreview ?? coverUrl) ? (
                  <Image src={coverPreview ?? coverUrl!} alt="Ảnh bìa" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-400">
                    <span className="text-2xl" aria-hidden="true">🖼</span>
                    <span className="text-xs font-medium">Nhấn để tải ảnh bìa</span>
                  </div>
                )}
                {uploadingCover && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-sm font-semibold text-white">Đang tải...</span>
                  </div>
                )}
              </button>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </div>

            {/* Avatar — circular */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-vio-primary dark:border-white/[0.1] dark:bg-[#1C1C1E]"
                aria-label="Tải ảnh đại diện"
              >
                {(avatarPreview ?? avatarUrl) ? (
                  <Image src={avatarPreview ?? avatarUrl!} alt="Avatar" fill className="object-cover" unoptimized />
                ) : (
                  <span className="select-none text-2xl" aria-hidden="true">🏪</span>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <span className="text-[0.625rem] font-bold text-white">...</span>
                  </div>
                )}
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <div>
                <p className="m-0 text-[0.875rem] font-semibold text-gray-900 dark:text-white">Ảnh đại diện</p>
                <p className="m-0 mt-0.5 text-xs text-gray-400">JPG, PNG — tối đa 2 MB</p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── Thông tin cơ bản ── */}
        <Card>
          <CardHeader>
            <p className="m-0 text-[0.9375rem] font-bold text-gray-900 dark:text-white">Thông tin cơ bản</p>
          </CardHeader>
          <CardContent className="space-y-4">

            <Input
              id="business_name"
              label="Tên doanh nghiệp"
              hint="Bắt buộc"
              placeholder="VD: Vật tư nông nghiệp Nghĩa Trung"
              value={form.business_name}
              onChange={e => set('business_name', e.target.value)}
              required
            />

            <Input
              id="phone"
              label="Số điện thoại"
              type="tel"
              placeholder="0912 345 678"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                Giới thiệu
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="Mô tả ngắn về doanh nghiệp của bạn..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className={TEXTAREA_CLS}
              />
            </div>

          </CardContent>
        </Card>

        {/* ── Mạng xã hội ── */}
        <Card>
          <CardHeader>
            <p className="m-0 text-[0.9375rem] font-bold text-gray-900 dark:text-white">Mạng xã hội</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input id="zalo_url"     label="Zalo"     placeholder="https://zalo.me/..."         value={form.zalo_url}     onChange={e => set('zalo_url', e.target.value)} />
            <Input id="facebook_url" label="Facebook" placeholder="https://facebook.com/..."    value={form.facebook_url} onChange={e => set('facebook_url', e.target.value)} />
            <Input id="tiktok_url"   label="TikTok"   placeholder="https://tiktok.com/@..."    value={form.tiktok_url}   onChange={e => set('tiktok_url', e.target.value)} />
          </CardContent>
        </Card>

        {/* ── Khu vực hoạt động ── */}
        <Card>
          <CardHeader>
            <p className="m-0 text-[0.9375rem] font-bold text-gray-900 dark:text-white">Khu vực hoạt động</p>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="flex flex-col gap-1.5">
              <label htmlFor="province_id" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                Tỉnh / Thành phố
              </label>
              <select
                id="province_id"
                value={form.province_id}
                onChange={e => { set('province_id', e.target.value); set('district_id', ''); set('ward_id', '') }}
                className={SELECT_CLS}
              >
                <option value="">-- Chọn tỉnh / thành phố --</option>
                {provinces.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="district_id" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                Quận / Huyện
              </label>
              <select
                id="district_id"
                value={form.district_id}
                disabled={districts.length === 0}
                onChange={e => { set('district_id', e.target.value); set('ward_id', '') }}
                className={SELECT_CLS}
              >
                <option value="">-- Chọn quận / huyện --</option>
                {districts.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ward_id" className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400">
                Phường / Xã
              </label>
              <select
                id="ward_id"
                value={form.ward_id}
                disabled={wards.length === 0}
                onChange={e => set('ward_id', e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">-- Chọn phường / xã --</option>
                {wards.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
              </select>
            </div>

          </CardContent>
        </Card>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isBusy}
          disabled={!form.business_name.trim() || uploadingAvatar || uploadingCover}
          className="w-full rounded-full"
        >
          {existingId ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
        </Button>

      </form>
    </div>
  )
}
