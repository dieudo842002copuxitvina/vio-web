// Server component — no 'use client'
// Comprehensive land facts sheet: all known attributes in a structured grid.
// Designed for data transparency — shows "Chưa cập nhật" for missing fields.

// ── Types ─────────────────────────────────────────────────────────────────────

interface FactEntry {
  label:    string
  value:    string | null | undefined
  unit?:    string
  verified?: boolean
  href?:    string
}

interface FactGroup {
  title: string
  icon:  React.ReactNode
  facts: FactEntry[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtArea(m2: string | null | undefined): string | null {
  if (!m2) return null
  const n = parseFloat(m2)
  if (isNaN(n)) return m2
  const parts: string[] = [`${n.toLocaleString('vi-VN')} m²`]
  const sao = n / 360
  if (sao >= 0.5) parts.push(`≈ ${sao.toFixed(1)} sào`)
  if (n >= 10000) parts.push(`≈ ${(n / 10000).toFixed(2)} ha`)
  return parts.join(' · ')
}

// ── Cell ─────────────────────────────────────────────────────────────────────

function FactCell({ label, value, unit, verified }: FactEntry) {
  const isEmpty = !value
  return (
    <div className="flex flex-col gap-0.5 py-3 [&:not(:last-child)]:border-b border-neutral-50">
      <span className="text-[10.5px] font-semibold text-neutral-400">{label}</span>
      <span className={[
        'flex items-center gap-1.5 text-[13px] font-semibold',
        isEmpty ? 'italic text-neutral-300' : 'text-neutral-800',
      ].join(' ')}>
        {isEmpty ? 'Chưa cập nhật' : (
          <>
            {value}
            {unit && <span className="font-normal text-neutral-400">{unit}</span>}
            {verified && (
              <span title="Đã xác thực" aria-label="Đã xác thực">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     className="text-[#2D7A4F]" aria-hidden="true">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </>
        )}
      </span>
    </div>
  )
}

function GroupIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                     bg-neutral-100 text-neutral-500">
      {children}
    </span>
  )
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

const ICONS = {
  area: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
    </svg>
  ),
  legal: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
            stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
      <path d="M14 2v6h6M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round"/>
    </svg>
  ),
  infra: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
            stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
      <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="1.75"
                strokeLinejoin="round"/>
    </svg>
  ),
  agri: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2a10 10 0 0 1 10 10c0 3.5-1.5 6.5-4 8.5"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M12 22V12M12 12C12 7 7 4 2 6" stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round"/>
    </svg>
  ),
  location: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            fill="currentColor" fillOpacity="0.15"/>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            stroke="currentColor" strokeWidth="1.75"/>
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  ),
}

// ── Main component ────────────────────────────────────────────────────────────

export interface LandFactsSheetProps {
  // Core
  areaM2:       string | null
  price_text:   string | null
  pricePerM2:   string | null
  // Legal
  legalStatus:  string | null
  landType:     string | null
  landTypeLabel: string | null
  // Infrastructure
  roadAccess:   string | null
  waterSource:  string | null
  electricity:  string | null
  irrigation:   string | null
  // Agriculture
  soilType:     string | null
  currentCrops: string | null
  frontage:     string | null
  slope:        string | null
  elevation:    string | null
  // Location
  provinceName: string | null
  districtName: string | null
  locationText: string | null
  coordinates:  { lat: number | null; lng: number | null } | null
  // Status
  isVerified:   boolean
  isPro:        boolean
}

export function LandFactsSheet({
  areaM2, price_text, pricePerM2,
  legalStatus, landType, landTypeLabel,
  roadAccess, waterSource, electricity, irrigation,
  soilType, currentCrops, frontage, slope, elevation,
  provinceName, districtName, locationText,
  coordinates, isVerified,
}: LandFactsSheetProps) {

  const groups: FactGroup[] = [
    {
      title: 'Diện tích & Giá',
      icon:  <GroupIcon>{ICONS.area}</GroupIcon>,
      facts: [
        { label: 'Diện tích',      value: fmtArea(areaM2)              },
        { label: 'Mặt tiền',       value: frontage, unit: frontage ? 'm' : undefined },
        { label: 'Giá bán',        value: price_text                   },
        { label: 'Giá/m²',         value: pricePerM2                   },
      ],
    },
    {
      title: 'Pháp lý & Phân loại',
      icon:  <GroupIcon>{ICONS.legal}</GroupIcon>,
      facts: [
        { label: 'Tình trạng pháp lý', value: legalStatus, verified: isVerified },
        { label: 'Loại đất (DB)',       value: landTypeLabel ?? landType         },
        { label: 'Độ dốc',             value: slope                             },
        { label: 'Độ cao',             value: elevation                         },
      ],
    },
    {
      title: 'Hạ tầng',
      icon:  <GroupIcon>{ICONS.infra}</GroupIcon>,
      facts: [
        { label: 'Đường vào',    value: roadAccess  },
        { label: 'Nguồn nước',   value: waterSource },
        { label: 'Điện lưới',    value: electricity },
        { label: 'Hệ thống tưới', value: irrigation },
      ],
    },
    {
      title: 'Nông nghiệp',
      icon:  <GroupIcon>{ICONS.agri}</GroupIcon>,
      facts: [
        { label: 'Loại đất canh tác', value: soilType     },
        { label: 'Cây trồng hiện tại', value: currentCrops },
      ],
    },
    {
      title: 'Vị trí',
      icon:  <GroupIcon>{ICONS.location}</GroupIcon>,
      facts: [
        { label: 'Tỉnh/TP',    value: provinceName             },
        { label: 'Huyện/Q',    value: districtName             },
        { label: 'Địa chỉ',    value: locationText             },
        { label: 'Tọa độ GPS', value: coordinates?.lat && coordinates?.lng
          ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`
          : null },
      ],
    },
  ]

  // Only show groups that have at least one non-empty value
  const visibleGroups = groups.filter(g => g.facts.some(f => !!f.value))

  if (visibleGroups.length === 0) return null

  return (
    <section aria-labelledby="land-facts-heading">
      <h2
        id="land-facts-heading"
        className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
      >
        Dữ liệu thửa đất
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleGroups.map(g => (
          <div
            key={g.title}
            className="rounded-[20px] border border-neutral-100 bg-white px-4 py-1"
          >
            <div className="flex items-center gap-2.5 border-b border-neutral-50 py-3">
              {g.icon}
              <span className="text-[12px] font-bold text-neutral-700">{g.title}</span>
            </div>
            {g.facts.map((f, i) => (
              <FactCell key={i} {...f}/>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
