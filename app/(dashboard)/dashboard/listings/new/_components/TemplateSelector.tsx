'use client'

import { LISTING_TEMPLATES } from '@/features/listing-templates/templates'
import type { ListingTemplate } from '@/features/listing-templates/templates'

// ─────────────────────────────────────────────────────────────────────────────

function TemplateCard({
  t,
  onClick,
}: {
  t:       ListingTemplate
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex flex-col items-start gap-3 rounded-3xl border border-neutral-200 bg-white p-5',
        'text-left transition-all duration-150',
        'hover:border-vio-forest/40 hover:shadow-[0_4px_20px_rgba(26,77,46,0.10)]',
        'active:scale-[0.98]',
      ].join(' ')}
    >
      <span className="text-3xl leading-none" aria-hidden="true">{t.emoji}</span>
      <div>
        <p className="text-[15px] font-bold text-[#1d1d1f] group-hover:text-vio-forest">
          {t.label}
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
          {t.description}
        </p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-vio-forest opacity-0 transition-opacity group-hover:opacity-100">
        Dùng mẫu này
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function TemplateSelector({
  onSelect,
  onSkip,
}: {
  onSelect: (templateId: string) => void
  onSkip:   () => void
}) {
  return (
    <div className="space-y-8">

      {/* Heading */}
      <div>
        <h1 className="text-[22px] font-black tracking-tight text-[#1d1d1f]">
          Bắt đầu bằng mẫu sẵn có
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          Chọn loại đất phù hợp để điền sẵn thông tin mô tả. Bạn có thể chỉnh sửa mọi thứ sau.
        </p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LISTING_TEMPLATES.map(t => (
          <TemplateCard key={t.id} t={t} onClick={() => onSelect(t.id)} />
        ))}
      </div>

      {/* Skip */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-neutral-100"/>
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] font-semibold text-neutral-400 transition-colors hover:text-neutral-700"
        >
          Bắt đầu từ đầu (không dùng mẫu)
        </button>
        <div className="h-px flex-1 bg-neutral-100"/>
      </div>
    </div>
  )
}
