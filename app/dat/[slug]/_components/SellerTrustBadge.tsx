// Server component — no 'use client'
// Renders seller trust tier + response metrics from merchant_metrics table.

interface SellerTrustBadgeProps {
  trustScore:        number | null   // 0-100 from merchant_metrics.trust_score
  responseRate:      number | null   // 0-1 ratio
  avgResponseHours:  number | null
  isVerified:        boolean
  totalListings:     number | null
}

// ── Trust tier ────────────────────────────────────────────────────────────────

type Tier = 'new' | 'trusted' | 'reliable' | 'top'

interface TierConfig {
  label:   string
  color:   string
  bg:      string
  border:  string
  ring:    string
  desc:    string
}

function getTier(score: number | null): { tier: Tier; cfg: TierConfig } {
  const s = score ?? 0
  if (s >= 85) return { tier: 'top',      cfg: { label: 'Người bán Top',   color: '#1A4D2E', bg: '#F0F6F2', border: '#2D7A4F', ring: '#2D7A4F', desc: 'Xác thực đầy đủ, phản hồi nhanh'   } }
  if (s >= 65) return { tier: 'reliable', cfg: { label: 'Người bán uy tín', color: '#2D7A4F', bg: '#F0F6F2', border: '#4A9B6F', ring: '#4A9B6F', desc: 'Hồ sơ đầy đủ, tỉ lệ phản hồi cao' } }
  if (s >= 40) return { tier: 'trusted',  cfg: { label: 'Người bán tin cậy', color: '#555555', bg: '#F7F7F7', border: '#D0D0D0', ring: '#AAAAAA', desc: 'Đã xác thực thông tin cơ bản'       } }
  return               { tier: 'new',     cfg: { label: 'Người bán mới',    color: '#888888', bg: '#F9F9F9', border: '#E0E0E0', ring: '#CCCCCC', desc: 'Mới tham gia nền tảng'             } }
}

function fmtResponseRate(r: number | null): string {
  if (r == null) return '—'
  return `${Math.round(r * 100)}%`
}

function fmtResponseTime(h: number | null): string {
  if (h == null) return '—'
  if (h < 1)   return '< 1 giờ'
  if (h < 24)  return `${Math.round(h)} giờ`
  const d = Math.round(h / 24)
  return `${d} ngày`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SellerTrustBadge({
  trustScore, responseRate, avgResponseHours, isVerified, totalListings,
}: SellerTrustBadgeProps) {
  const { cfg } = getTier(trustScore)
  const score   = trustScore ?? 0

  // Arc path for SVG score ring (cx=28,cy=28,r=22, start=top, 230° sweep)
  const RADIUS  = 22
  const CX = 28, CY = 28
  const CIRCUM  = 2 * Math.PI * RADIUS
  const GAP_DEG = 130 // degrees of empty arc at bottom
  const SWEEP   = ((360 - GAP_DEG) / 360) * CIRCUM
  const offset  = SWEEP - (score / 100) * SWEEP
  const startAngle = -90 + GAP_DEG / 2 // start at left of gap
  return (
    <div
      className="rounded-[20px] border px-4 py-4"
      style={{ borderColor: cfg.border, background: cfg.bg }}
    >
      <div className="flex items-center gap-3">

        {/* Score ring */}
        <div className="relative shrink-0">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            {/* Track */}
            <circle
              cx={CX} cy={CY} r={RADIUS}
              fill="none" stroke="#E0E0E0" strokeWidth="4"
              strokeDasharray={`${SWEEP} ${CIRCUM - SWEEP}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform={`rotate(${startAngle} ${CX} ${CY})`}
            />
            {/* Fill */}
            <circle
              cx={CX} cy={CY} r={RADIUS}
              fill="none" stroke={cfg.ring} strokeWidth="4"
              strokeDasharray={`${SWEEP} ${CIRCUM - SWEEP}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(${startAngle} ${CX} ${CY})`}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x={CX} y={CY + 5} textAnchor="middle"
                  fontSize="12" fontWeight="700" fill={cfg.color}>
              {score}
            </text>
          </svg>
          {isVerified && (
            <div
              className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center
                         justify-center rounded-full"
              style={{ background: cfg.color }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-label="Xác thực">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>

        {/* Tier info */}
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[12px] font-bold" style={{ color: cfg.color }}>
            {cfg.label}
          </p>
          <p className="m-0 mt-0.5 text-[11px] leading-tight text-neutral-500">
            {cfg.desc}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3"
           style={{ borderColor: cfg.border }}>
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Phản hồi
          </p>
          <p className="m-0 mt-0.5 text-[13px] font-bold" style={{ color: cfg.color }}>
            {fmtResponseRate(responseRate)}
          </p>
        </div>
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Thời gian
          </p>
          <p className="m-0 mt-0.5 text-[13px] font-bold" style={{ color: cfg.color }}>
            {fmtResponseTime(avgResponseHours)}
          </p>
        </div>
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Tin đăng
          </p>
          <p className="m-0 mt-0.5 text-[13px] font-bold" style={{ color: cfg.color }}>
            {totalListings != null ? totalListings : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
