'use client'

import type { DraftListing } from './ListingWizard'
import { LAND_TYPE_LABELS }  from '@/entities/listing'

// ── Shared input styles ───────────────────────────────────────────────────────

export const INPUT = [
  'h-12 w-full rounded-2xl border border-neutral-200 bg-white',
  'px-4 text-[15px] text-[#1d1d1f] placeholder:text-neutral-400',
  'outline-none transition-colors',
  'focus:border-vio-forest focus:ring-2 focus:ring-vio-forest/10',
].join(' ')

export const LABEL = 'block mb-2 text-[13px] font-semibold text-[#1d1d1f]'

export const HELPER = 'mt-1.5 text-[11.5px] text-neutral-400'

export const SECTION = 'rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'

// ── Land types ────────────────────────────────────────────────────────────────

const LAND_TYPE_ENTRIES = Object.entries(LAND_TYPE_LABELS) as [string, string][]

// ── WizardStep1 ───────────────────────────────────────────────────────────────

export function WizardStep1({
  draft,
  onChange,
}: {
  draft:    DraftListing
  onChange: (p: Partial<DraftListing>) => void
}) {
  return (
    <div className="space-y-6">

      {/* Heading */}
      <div>
        <h1 className="text-[22px] font-black tracking-tight text-[#1d1d1f]">
          Thông tin cơ bản
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          Mô tả ngắn gọn về mảnh đất của bạn.
        </p>
      </div>

      {/* Section: Tiêu đề & Giá */}
      <div className={SECTION}>
        <h2 className="mb-5 text-[15px] font-bold text-[#1d1d1f]">Tiêu đề &amp; Giá</h2>

        <div className="space-y-4">

          {/* Tiêu đề */}
          <div>
            <label htmlFor="title" className={LABEL}>
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={draft.title}
              onChange={e => onChange({ title: e.target.value })}
              placeholder="VD: Bán 5.000 m² đất cây lâu năm tại Đắk Lắk"
              maxLength={200}
              className={INPUT}
              autoFocus
            />
            <p className={HELPER}>{draft.title.length}/200 ký tự</p>
          </div>

          {/* Giá */}
          <div>
            <label htmlFor="price" className={LABEL}>Giá</label>
            <input
              id="price"
              type="text"
              value={draft.price_text}
              onChange={e => onChange({ price_text: e.target.value })}
              placeholder="VD: 1,5 tỷ · 300 triệu/ha · Thương lượng"
              className={INPUT}
            />
            <p className={HELPER}>Nhập dạng tự do — hiển thị đúng như bạn gõ.</p>
          </div>
        </div>
      </div>

      {/* Section: Loại giao dịch + Loại đất */}
      <div className={SECTION}>
        <h2 className="mb-5 text-[15px] font-bold text-[#1d1d1f]">Phân loại</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Loại giao dịch */}
          <div>
            <p className={LABEL}>Loại giao dịch</p>
            <div className="flex gap-2.5">
              {[
                { value: 'ban',     label: 'Bán' },
                { value: 'cho_thue', label: 'Cho thuê' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ transaction_type: opt.value as 'ban' | 'cho_thue' })}
                  className={[
                    'flex-1 h-12 rounded-2xl border text-[14px] font-semibold transition-colors',
                    draft.transaction_type === opt.value
                      ? 'border-vio-forest bg-vio-forest/8 text-vio-forest'
                      : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loại đất */}
          <div>
            <label htmlFor="land_type" className={LABEL}>Loại đất</label>
            <div className="relative">
              <select
                id="land_type"
                value={draft.land_type}
                onChange={e => onChange({ land_type: e.target.value })}
                className={[INPUT, 'appearance-none cursor-pointer pr-10'].join(' ')}
              >
                <option value="">— Chọn loại đất —</option>
                {LAND_TYPE_ENTRIES.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Mô tả */}
      <div className={SECTION}>
        <h2 className="mb-5 text-[15px] font-bold text-[#1d1d1f]">Mô tả</h2>

        <div>
          <label htmlFor="description" className={LABEL}>Mô tả ngắn</label>
          <textarea
            id="description"
            value={draft.description}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Mô tả vị trí, hiện trạng, tiện ích nổi bật, lý do bán…"
            rows={5}
            maxLength={2000}
            className={[
              'w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3',
              'text-[15px] text-[#1d1d1f] placeholder:text-neutral-400',
              'outline-none transition-colors resize-none',
              'focus:border-vio-forest focus:ring-2 focus:ring-vio-forest/10',
            ].join(' ')}
          />
          <p className={`${HELPER} flex justify-between`}>
            <span>Người mua thường quyết định dựa trên mô tả đầu tiên.</span>
            <span>{draft.description.length}/2000</span>
          </p>
        </div>
      </div>

    </div>
  )
}
