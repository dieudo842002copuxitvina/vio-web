// Legal documents section for land detail page.
// Shows legal status badge and a locked "view documents" CTA.
// When no documents are uploaded, renders placeholder cards + upgrade CTA.

import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

interface LegalDocumentsProps {
  legalStatus: string | null
  landType:    string | null
  isPro:       boolean
  listingId:   string
}

// ── Status badge config ────────────────────────────────────────────────────────

function LegalBadge({ status }: { status: string | null }) {
  if (!status) return null

  const lower = status.toLowerCase()
  const isSoDo   = lower.includes('sổ đỏ') || lower.includes('so_do')
  const isSoHong = lower.includes('sổ hồng') || lower.includes('so_hong')
  const isDangLam = lower.includes('đang làm') || lower.includes('dang_lam')

  let color = '#86868b'
  let bg    = 'rgba(142,142,147,0.1)'
  let icon  = null

  if (isSoDo) {
    color = '#1A4D2E'
    bg    = 'rgba(26,77,46,0.08)'
    icon  = (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  } else if (isSoHong) {
    color = '#D44000'
    bg    = 'rgba(212,64,0,0.08)'
    icon  = (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  } else if (isDangLam) {
    color = '#FF9500'
    bg    = 'rgba(255,149,0,0.1)'
    icon  = (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold"
      style={{ color, background: bg }}
    >
      {icon}
      {status}
    </span>
  )
}

// ── Placeholder doc card ───────────────────────────────────────────────────────

function DocCard({ label, locked }: { label: string; locked: boolean }) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-2 rounded-[14px] border p-6 text-center ${
        locked
          ? 'border-dashed border-[rgba(60,60,67,0.2)] bg-[#F2F2F7]'
          : 'border-[rgba(60,60,67,0.12)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
      }`}
    >
      {locked && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="#8E8E93" strokeWidth="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
              stroke={locked ? '#C7C7CC' : '#1A4D2E'} strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M14 2v6h6M9 13l2 2 4-4"
              stroke={locked ? '#C7C7CC' : '#1A4D2E'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <p className={`text-[12px] font-semibold ${locked ? 'text-[#C7C7CC]' : 'text-[#1d1d1f]'}`}>
        {label}
      </p>
    </div>
  )
}

// ── LegalDocuments ─────────────────────────────────────────────────────────────

export function LegalDocuments({
  legalStatus, landType, isPro,
}: LegalDocumentsProps) {
  const docLabels = [
    'Giấy chứng nhận quyền sử dụng đất',
    'Bản đồ địa chính',
    'Hợp đồng chuyển nhượng',
  ]

  return (
    <section aria-labelledby="legal-heading" className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2
          id="legal-heading"
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
        >
          Pháp lý & Giấy tờ
        </h2>
        {legalStatus && <LegalBadge status={legalStatus} />}
        {landType && (
          <span className="rounded-full bg-[rgba(26,77,46,0.06)] px-2.5 py-1 text-[11px] font-semibold text-[#1A4D2E]">
            {landType}
          </span>
        )}
      </div>

      {/* Document cards */}
      <div className="grid grid-cols-3 gap-3">
        {docLabels.map((label, i) => (
          <DocCard key={i} label={label} locked={!isPro} />
        ))}
      </div>

      {/* CTA */}
      {!isPro && (
        <div className="flex items-center gap-4 rounded-[14px] bg-[#F2F2F7] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#1A4D2E" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#1A4D2E" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="m-0 text-[13px] font-semibold text-[#1d1d1f]">
              Xem giấy tờ pháp lý với gói Pro
            </p>
            <p className="m-0 text-[12px] text-[#6e6e73]">
              Sổ đỏ, bản đồ địa chính và hợp đồng mẫu
            </p>
          </div>
          <Link
            href="/goi-thanh-vien"
            className="shrink-0 rounded-full bg-[#1A4D2E] px-4 py-2 text-[13px] font-bold text-white no-underline hover:opacity-90"
          >
            Nâng cấp
          </Link>
        </div>
      )}
    </section>
  )
}
