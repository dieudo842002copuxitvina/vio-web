'use client'

import type { DraftListing } from './ListingWizard'
import { INPUT, LABEL, HELPER, SECTION } from './WizardStep1'

// ── Shared field ──────────────────────────────────────────────────────────────

function Field({
  id, label, value, onChange, placeholder, helper,
}: {
  id:          string
  label:       string
  value:       string
  onChange:    (v: string) => void
  placeholder: string
  helper?:     string
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={INPUT}
      />
      {helper && <p className={HELPER}>{helper}</p>}
    </div>
  )
}

// ── WizardStep4 ───────────────────────────────────────────────────────────────

export function WizardStep4({
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
        <h1 className="text-[22px] font-black tracking-tight text-[#1d1d1f]">Thông tin đất</h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          Điền các thông số kỹ thuật. Càng chi tiết càng tạo niềm tin với người mua.
        </p>
      </div>

      {/* Section: Diện tích & Pháp lý */}
      <div className={SECTION}>
        <h2 className="mb-5 text-[15px] font-bold text-[#1d1d1f]">Diện tích &amp; Pháp lý</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="area_m2"
            label="Diện tích"
            value={draft.area_m2}
            onChange={v => onChange({ area_m2: v })}
            placeholder="VD: 5.000 m²  hoặc  0,5 ha"
            helper="Diện tích theo giấy tờ pháp lý."
          />
          <Field
            id="legal_status"
            label="Pháp lý"
            value={draft.legal_status}
            onChange={v => onChange({ legal_status: v })}
            placeholder="VD: Sổ đỏ · Sổ hồng · Giấy tay"
          />
        </div>
      </div>

      {/* Section: Cơ sở hạ tầng */}
      <div className={SECTION}>
        <h2 className="mb-5 text-[15px] font-bold text-[#1d1d1f]">Cơ sở hạ tầng</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="frontage"
            label="Mặt tiền"
            value={draft.frontage}
            onChange={v => onChange({ frontage: v })}
            placeholder="VD: 20 m · Không có mặt tiền"
          />
          <Field
            id="road_access"
            label="Đường vào"
            value={draft.road_access}
            onChange={v => onChange({ road_access: v })}
            placeholder="VD: Đường nhựa 6 m · Đường đất"
          />
          <Field
            id="water_source"
            label="Nguồn nước"
            value={draft.water_source}
            onChange={v => onChange({ water_source: v })}
            placeholder="VD: Giếng khoan · Kênh mương · Nước máy"
          />
          <Field
            id="electricity"
            label="Điện"
            value={draft.electricity}
            onChange={v => onChange({ electricity: v })}
            placeholder="VD: Điện 3 pha · Điện 1 pha · Chưa có"
          />
        </div>
      </div>

      {/* Section: Canh tác */}
      <div className={SECTION}>
        <h2 className="mb-5 text-[15px] font-bold text-[#1d1d1f]">Canh tác</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="current_crops"
            label="Hiện trạng canh tác"
            value={draft.current_crops}
            onChange={v => onChange({ current_crops: v })}
            placeholder="VD: Sầu riêng · Cà phê · Đất trống"
          />
          <Field
            id="planting_year"
            label="Năm trồng"
            value={draft.planting_year}
            onChange={v => onChange({ planting_year: v })}
            placeholder="VD: 2018 · 5 năm tuổi"
            helper="Để trống nếu đất trống."
          />
        </div>
      </div>

    </div>
  )
}
