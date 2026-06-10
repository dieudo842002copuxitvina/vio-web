// ── ListingQualityScore ────────────────────────────────────────────────────────
// Server component.  Computes a 0-100 trust score from listing attributes and
// renders a visual breakdown.  Visible to ALL buyers on the listing detail page.
// Score tiers: <50 red, 50-74 amber, 75-89 green, 90+ vio-forest.

// ── Score computation ─────────────────────────────────────────────────────────

export interface QualityInputs {
  mediaCount:      number
  hasPrice:        boolean
  hasArea:         boolean
  hasLegalStatus:  boolean
  descriptionLen:  number
  ownerVerified:   boolean
  hasLocation:     boolean
  hasLandType:     boolean
  hasContact:      boolean
}

interface ScoreItem {
  label:  string
  points: number
  earned: number
  pass:   boolean
}

function computeScore(i: QualityInputs): { total: number; items: ScoreItem[] } {
  const items: ScoreItem[] = [
    {
      label:  'Hình ảnh',
      points: 20,
      earned: i.mediaCount >= 5 ? 20 : i.mediaCount >= 2 ? 14 : i.mediaCount >= 1 ? 8 : 0,
      pass:   i.mediaCount >= 2,
    },
    {
      label:  'Giá bán rõ ràng',
      points: 15,
      earned: i.hasPrice ? 15 : 0,
      pass:   i.hasPrice,
    },
    {
      label:  'Pháp lý (sổ đỏ/hồng)',
      points: 20,
      earned: i.hasLegalStatus ? 20 : 0,
      pass:   i.hasLegalStatus,
    },
    {
      label:  'Diện tích',
      points: 15,
      earned: i.hasArea ? 15 : 0,
      pass:   i.hasArea,
    },
    {
      label:  'Mô tả chi tiết',
      points: 12,
      earned: i.descriptionLen >= 300 ? 12 : i.descriptionLen >= 80 ? 7 : i.descriptionLen > 0 ? 3 : 0,
      pass:   i.descriptionLen >= 80,
    },
    {
      label:  'Chủ đất xác thực',
      points: 10,
      earned: i.ownerVerified ? 10 : 0,
      pass:   i.ownerVerified,
    },
    {
      label:  'Vị trí',
      points: 5,
      earned: i.hasLocation ? 5 : 0,
      pass:   i.hasLocation,
    },
    {
      label:  'Loại đất',
      points: 3,
      earned: i.hasLandType ? 3 : 0,
      pass:   i.hasLandType,
    },
  ]

  const total = items.reduce((s, it) => s + it.earned, 0)
  return { total, items }
}

function scoreColor(n: number): string {
  if (n >= 90) return '#1A4D2E'
  if (n >= 75) return '#2D7A4F'
  if (n >= 50) return '#FF9500'
  return '#FF3B30'
}

function scoreBg(n: number): string {
  if (n >= 90) return 'bg-[#E8F0EB]'
  if (n >= 75) return 'bg-[#EAF5EE]'
  if (n >= 50) return 'bg-[#FFF5E6]'
  return 'bg-[#FFF0EF]'
}

function scoreLabel(n: number): string {
  if (n >= 90) return 'Tin chất lượng cao'
  if (n >= 75) return 'Tin tốt'
  if (n >= 50) return 'Có thể cải thiện'
  return 'Tin thiếu thông tin'
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ListingQualityScoreProps {
  inputs: QualityInputs
}

export function ListingQualityScore({ inputs }: ListingQualityScoreProps) {
  const { total, items } = computeScore(inputs)
  const color   = scoreColor(total)
  const bgClass = scoreBg(total)
  const label   = scoreLabel(total)
  const pct     = Math.round((total / 100) * 100)

  const passing = items.filter(it => it.pass)
  const failing = items.filter(it => !it.pass)

  return (
    <section
      aria-labelledby="quality-heading"
      className={`rounded-2xl border border-neutral-100 p-5 ${bgClass}`}
    >
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p
            id="quality-heading"
            className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400"
          >
            Chất lượng tin đăng
          </p>
          <p className="m-0 mt-0.5 text-[13px] font-semibold" style={{ color }}>
            {label}
          </p>
        </div>

        {/* Score ring — CSS-only, no canvas */}
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full
                     border-[3px] text-[17px] font-black"
          style={{ borderColor: color, color }}
          aria-label={`${total} trên 100`}
        >
          {total}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/70">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color }}
          role="progressbar"
          aria-valuenow={total}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Passing items — compact grid */}
      {passing.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {passing.map(it => (
            <div key={it.label} className="flex items-center gap-1.5">
              <div
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${color}20` }}
                aria-hidden="true"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="3"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[12px] font-medium text-neutral-600">{it.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Failing items — what's missing */}
      {failing.length > 0 && (
        <div className="rounded-xl border border-neutral-200/80 bg-white/60 px-3.5 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Còn thiếu để nâng điểm
          </p>
          <div className="flex flex-col gap-1.5">
            {failing.map(it => (
              <div key={it.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 shrink-0 rounded-full border border-neutral-200 bg-white"
                    aria-hidden="true"
                  />
                  <span className="text-[12px] text-neutral-400">{it.label}</span>
                </div>
                <span className="text-[11px] font-semibold text-neutral-400">
                  +{it.points}đ
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
