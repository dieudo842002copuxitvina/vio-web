import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InternalLinksProps {
  provinceSlug:  string | null
  provinceName:  string | null
  districtSlug:  string | null
  districtName:  string | null
  landType:      string | null   // raw key: lua | rau_mau | cay_lau_nam | …
  landTypeLabel: string | null
}

// ── Land type labels ──────────────────────────────────────────────────────────

const LAND_TYPE_LABELS: Record<string, string> = {
  lua:         'Đất lúa',
  rau_mau:     'Rau màu',
  cay_lau_nam: 'Cây lâu năm',
  an_trai:     'Ăn trái',
  lam_nghiep:  'Lâm nghiệp',
  mat_nuoc:    'Nuôi thuỷ sản',
  hon_hop:     'Hỗn hợp',
}

// Slug version for URLs (underscores → hyphens)
function toSlug(key: string): string {
  return key.replace(/_/g, '-')
}

// Related land types for cross-linking
const RELATED_TYPES: Record<string, string[]> = {
  lua:         ['rau_mau', 'cay_lau_nam'],
  rau_mau:     ['lua', 'cay_lau_nam'],
  cay_lau_nam: ['an_trai', 'lua'],
  an_trai:     ['cay_lau_nam', 'rau_mau'],
  lam_nghiep:  ['cay_lau_nam', 'hon_hop'],
  mat_nuoc:    ['lua', 'hon_hop'],
  hon_hop:     ['lam_nghiep', 'mat_nuoc'],
}

// ── LinkChip ──────────────────────────────────────────────────────────────────

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200
                 bg-white px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 no-underline
                 transition-colors hover:border-[#1A4D2E]/30 hover:bg-[#E8F0EB]
                 hover:text-[#1A4D2E]"
    >
      {label}
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  )
}

// ── InternalLinks ─────────────────────────────────────────────────────────────

export function InternalLinks({
  provinceSlug, provinceName,
  districtSlug, districtName,
  landType,
}: InternalLinksProps) {
  const landLabel  = landType ? (LAND_TYPE_LABELS[landType] ?? null) : null
  const relatedKeys = landType ? (RELATED_TYPES[landType] ?? []) : []

  // Nothing to link to
  if (!provinceSlug && !landType) return null

  return (
    <section aria-labelledby="internal-links-heading" className="space-y-5">
      <h2
        id="internal-links-heading"
        className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
      >
        Đất liên quan
      </h2>

      {/* Geographic links */}
      {(provinceSlug || districtSlug) && (
        <div>
          <p className="mb-2.5 text-[13px] font-semibold text-neutral-600">
            Theo khu vực
          </p>
          <div className="flex flex-wrap gap-2">
            {provinceSlug && provinceName && (
              <LinkChip
                href={`/dat-nong-nghiep/${provinceSlug}`}
                label={`Đất tại ${provinceName}`}
              />
            )}
            {provinceSlug && districtSlug && districtName && (
              <LinkChip
                href={`/dat-nong-nghiep/${provinceSlug}/${districtSlug}`}
                label={`Đất tại ${districtName}`}
              />
            )}
            {provinceSlug && landType && (
              <LinkChip
                href={`/dat-nong-nghiep/${provinceSlug}?loai=${toSlug(landType)}`}
                label={`${landLabel ?? 'Đất'} tại ${provinceName ?? 'khu vực này'}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Land-type links */}
      {landType && (
        <div>
          <p className="mb-2.5 text-[13px] font-semibold text-neutral-600">
            Theo loại đất
          </p>
          <div className="flex flex-wrap gap-2">
            {landLabel && (
              <LinkChip
                href={`/dat-nong-nghiep/loai/${toSlug(landType)}`}
                label={`${landLabel} toàn quốc`}
              />
            )}
            {relatedKeys.map(key => {
              const label = LAND_TYPE_LABELS[key]
              if (!label) return null
              return (
                <LinkChip
                  key={key}
                  href={`/dat-nong-nghiep/loai/${toSlug(key)}`}
                  label={label}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Browse CTA */}
      <div className="flex items-center gap-3">
        <Link
          href="/dat-nong-nghiep"
          className="text-[13px] font-semibold text-[#1A4D2E] no-underline
                     transition-opacity hover:opacity-70"
        >
          Xem tất cả đất nông nghiệp →
        </Link>
        <span className="text-neutral-200">|</span>
        <Link
          href="/ban-do"
          className="text-[13px] font-semibold text-neutral-500 no-underline
                     transition-opacity hover:opacity-70"
        >
          Xem trên bản đồ →
        </Link>
      </div>
    </section>
  )
}
