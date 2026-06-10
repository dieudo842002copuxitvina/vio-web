'use client'

import Image                                 from 'next/image'
import { useState }                          from 'react'
import { LAND_TYPE_LABELS }                  from '@/entities/listing'
import type { DraftListing }                 from './ListingWizard'

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── FactRow ───────────────────────────────────────────────────────────────────

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="text-[13px] text-neutral-500">{label}</span>
      <span className="text-right text-[13px] font-semibold text-[#1d1d1f]">{value}</span>
    </div>
  )
}

// ── Gallery ───────────────────────────────────────────────────────────────────

function PreviewGallery({ images, coverIndex }: { images: DraftListing['images']; coverIndex: number }) {
  const [active, setActive] = useState(coverIndex)

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-neutral-100 flex items-center justify-center">
        <p className="text-[13px] text-neutral-400">Chưa có ảnh</p>
      </div>
    )
  }

  const main = images[active] ?? images[0]!

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-neutral-100">
        <Image
          src={main.url}
          alt={`Ảnh ${active + 1}`}
          fill
          sizes="(max-width:768px) 100vw, 600px"
          className="object-cover"
          unoptimized
        />
        <span className="absolute bottom-3 right-3 rounded-xl bg-black/40 px-2 py-1
                          text-[11px] font-semibold text-white backdrop-blur-sm">
          {active + 1}/{images.length}
        </span>
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={[
                'relative h-14 w-20 shrink-0 overflow-hidden rounded-xl transition-all',
                i === active
                  ? 'ring-2 ring-vio-forest ring-offset-1'
                  : 'opacity-60 hover:opacity-80',
              ].join(' ')}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" unoptimized/>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── WizardStep5 ───────────────────────────────────────────────────────────────

export function WizardStep5({
  draft,
  saving,
  saveError,
  onDraft,
  onPublish,
}: {
  draft:      DraftListing
  saving:     'idle' | 'saving' | 'error'
  saveError:  string | null
  onDraft:    () => void
  onPublish:  () => void
}) {
  const landTypeLabel = draft.land_type
    ? (LAND_TYPE_LABELS as Record<string, string>)[draft.land_type] ?? draft.land_type
    : null

  const txLabel = draft.transaction_type === 'ban' ? 'Bán' : draft.transaction_type === 'cho_thue' ? 'Cho thuê' : null

  const locationParts = [draft.ward_name, draft.district_name, draft.province_name].filter(Boolean)

  const facts: Array<{ label: string; value: string }> = [
    draft.area_m2       && { label: 'Diện tích',           value: draft.area_m2 },
    landTypeLabel       && { label: 'Loại đất',             value: landTypeLabel },
    txLabel             && { label: 'Giao dịch',            value: txLabel },
    draft.legal_status  && { label: 'Pháp lý',              value: draft.legal_status },
    draft.frontage      && { label: 'Mặt tiền',             value: draft.frontage },
    draft.road_access   && { label: 'Đường vào',            value: draft.road_access },
    draft.water_source  && { label: 'Nguồn nước',           value: draft.water_source },
    draft.electricity   && { label: 'Điện',                 value: draft.electricity },
    draft.current_crops && { label: 'Hiện trạng canh tác',  value: draft.current_crops },
    draft.planting_year && { label: 'Năm trồng',            value: draft.planting_year },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <div className="space-y-8">

      {/* Heading */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-vio-forest/8 px-3 py-1 text-[11px] font-bold uppercase
                            tracking-widest text-vio-forest">
            Xem trước
          </span>
          <span className="text-[12px] text-neutral-400">
            Đây là giao diện người mua sẽ thấy
          </span>
        </div>
        <h1 className="text-[22px] font-black tracking-tight text-[#1d1d1f]">
          {draft.title || 'Chưa có tiêu đề'}
        </h1>
        {locationParts.length > 0 && (
          <p className="mt-1 text-[14px] text-neutral-500">{locationParts.join(', ')}</p>
        )}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">

        {/* ── Left column ────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Gallery */}
          <PreviewGallery images={draft.images} coverIndex={draft.cover_index}/>

          {/* Key facts */}
          {facts.length > 0 && (
            <div className="rounded-3xl border border-neutral-100 bg-white p-5
                            shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <h2 className="mb-1 text-[15px] font-bold text-[#1d1d1f]">Thông tin đất</h2>
              <div className="divide-y divide-neutral-100">
                {facts.map(f => <FactRow key={f.label} label={f.label} value={f.value}/>)}
              </div>
            </div>
          )}

          {/* Description */}
          {draft.description && (
            <div className="rounded-3xl border border-neutral-100 bg-white p-5
                            shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <h2 className="mb-3 text-[15px] font-bold text-[#1d1d1f]">Mô tả</h2>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-neutral-600">
                {draft.description}
              </p>
            </div>
          )}
        </div>

        {/* ── Right column: price card + actions ─────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">

          {/* Price card */}
          <div className="rounded-3xl border border-neutral-100 bg-white p-5
                          shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            {draft.price_text ? (
              <p className="text-[24px] font-black tracking-tight text-vio-forest">
                {draft.price_text}
              </p>
            ) : (
              <p className="text-[15px] text-neutral-400">Chưa có giá</p>
            )}
            {txLabel && (
              <span className="mt-1.5 inline-block rounded-full bg-neutral-100 px-2.5 py-0.5
                               text-[12px] font-semibold text-neutral-600">
                {txLabel}
              </span>
            )}

            {/* Placeholder contact buttons */}
            <div className="mt-4 space-y-2">
              <div className="h-11 rounded-2xl bg-vio-forest opacity-30"/>
              <div className="h-11 rounded-2xl bg-neutral-100 opacity-60"/>
            </div>
            <p className="mt-2 text-center text-[11px] text-neutral-400">
              Nút liên hệ hiển thị sau khi đăng
            </p>
          </div>

          {/* Trust checks */}
          <div className="rounded-2xl border border-neutral-100 bg-white p-4">
            {[
              'Đã xác minh danh tính',
              'Thông tin pháp lý đầy đủ',
              'Ảnh thực tế từ chủ đất',
            ].map(t => (
              <div key={t} className="flex items-center gap-2.5 py-1.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                                 bg-vio-forest/8 text-vio-forest">
                  <CheckIcon/>
                </span>
                <span className="text-[12.5px] text-neutral-600">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Save / Publish section ─────────────────────────────────── */}
      <div className="rounded-3xl border border-neutral-100 bg-white p-6
                      shadow-[0_1px_4px_rgba(0,0,0,0.04)]">

        {saveError && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3
                          text-[13px] text-red-600">
            {saveError}
          </div>
        )}

        <div className="mb-5">
          <h2 className="text-[17px] font-bold text-[#1d1d1f]">Sẵn sàng đăng tin?</h2>
          <p className="mt-1 text-[13px] text-neutral-500">
            Tin sẽ được kiểm duyệt trong vòng 24 giờ trước khi hiển thị công khai.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          {/* Draft */}
          <div className="rounded-2xl border border-neutral-200 p-4">
            <p className="text-[14px] font-bold text-[#1d1d1f]">Lưu nháp</p>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Lưu lại, tiếp tục chỉnh sửa sau.
            </p>
            <button
              onClick={onDraft}
              disabled={saving === 'saving'}
              className="mt-4 w-full h-11 rounded-2xl border border-neutral-200 text-[14px]
                         font-semibold text-neutral-600 transition-colors
                         hover:border-neutral-300 hover:bg-neutral-50
                         disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving === 'saving' ? 'Đang lưu…' : 'Lưu nháp'}
            </button>
          </div>

          {/* Publish */}
          <div className="rounded-2xl border border-vio-forest/20 bg-vio-forest/4 p-4">
            <p className="text-[14px] font-bold text-vio-forest">Đăng tin ngay</p>
            <p className="mt-0.5 text-[12.5px] text-vio-forest/70">
              Gửi kiểm duyệt, hiển thị khi duyệt xong.
            </p>
            <button
              onClick={onPublish}
              disabled={saving === 'saving' || !draft.title.trim() || !draft.province_id}
              className="mt-4 w-full h-11 rounded-2xl bg-vio-forest text-[14px]
                         font-bold text-white transition-opacity
                         hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving === 'saving' ? 'Đang đăng…' : 'Đăng tin'}
            </button>
            {(!draft.title.trim() || !draft.province_id) && (
              <p className="mt-2 text-center text-[11px] text-vio-forest/60">
                Cần có tiêu đề và tỉnh/thành để đăng.
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
