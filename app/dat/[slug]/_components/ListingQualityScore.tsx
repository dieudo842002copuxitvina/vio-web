// ListingQualityScore — displays the completeness score on listing detail pages.
// Accepts either a persisted ListingCompleteness row (preferred, from DB) or
// falls back to computing the score client-side from QualityInputs.
// Server component — no 'use client' needed.

import type { ListingCompleteness, CompletenessTier } from '@/entities/listing/model/normalized-types'
import { TIER_CONFIG } from '@/entities/listing/api/completeness.server'

// ── Legacy QualityInputs (for listings pre-migration 030 with no sub-entities) ─

export interface QualityInputs {
  // Media
  mediaCount:     number
  // Listing fields
  hasPrice:       boolean
  hasArea:        boolean
  hasLegalStatus: boolean
  descriptionLen: number
  // Seller
  ownerVerified:  boolean
  // Location
  hasLocation:    boolean
  hasLandType:    boolean
  hasContact:     boolean
  // New fields from normalized tables (optional — present post-migration 030)
  hasGps?:           boolean
  hasRoadAccess?:    boolean
  hasWaterSource?:   boolean
  hasSoilType?:      boolean
  hasCurrentCrops?:  boolean
  hasCertifications?: boolean
  mediaVideoCount?:  number
}

interface ScoreItem {
  label:  string
  points: number
  earned: number
  pass:   boolean
}

// ── Legacy score computation (EAV-based, pre-migration 030 listings) ──────────

function computeLegacyScore(i: QualityInputs): { total: number; items: ScoreItem[] } {
  const items: ScoreItem[] = [
    {
      label:  'Hình ảnh',
      points: 20,
      earned: i.mediaCount >= 5 ? 20 : i.mediaCount >= 3 ? 16 : i.mediaCount >= 2 ? 12 : i.mediaCount >= 1 ? 6 : 0,
      pass:   i.mediaCount >= 2,
    },
    {
      label:  'Toạ độ GPS',
      points: 10,
      earned: i.hasGps ? 10 : 0,
      pass:   !!i.hasGps,
    },
    {
      label:  'Pháp lý (sổ đỏ/hồng)',
      points: 15,
      earned: i.hasLegalStatus ? 12 : 0,
      pass:   i.hasLegalStatus,
    },
    {
      label:  'Chủ đất xác thực',
      points: 10,
      earned: i.ownerVerified ? 10 : 3,
      pass:   i.ownerVerified,
    },
    {
      label:  'Đường vào & nguồn nước',
      points: 10,
      earned: (i.hasRoadAccess ? 5 : 0) + (i.hasWaterSource ? 5 : 0),
      pass:   !!i.hasRoadAccess && !!i.hasWaterSource,
    },
    {
      label:  'Loại đất & cây trồng',
      points: 10,
      earned: (i.hasSoilType ? 5 : 0) + (i.hasCurrentCrops ? 5 : 0),
      pass:   !!i.hasSoilType,
    },
    {
      label:  'Diện tích',
      points: 10,
      earned: i.hasArea ? 10 : 0,
      pass:   i.hasArea,
    },
    {
      label:  'Mô tả chi tiết',
      points: 5,
      earned: i.descriptionLen >= 300 ? 5 : i.descriptionLen >= 80 ? 3 : i.descriptionLen > 0 ? 1 : 0,
      pass:   i.descriptionLen >= 80,
    },
    {
      label:  'Video thực địa',
      points: 5,
      earned: (i.mediaVideoCount ?? 0) > 0 ? 5 : 0,
      pass:   (i.mediaVideoCount ?? 0) > 0,
    },
    {
      label:  'Chứng nhận (VietGAP...)',
      points: 5,
      earned: i.hasCertifications ? 5 : 0,
      pass:   !!i.hasCertifications,
    },
  ]

  const total = items.reduce((s, it) => s + it.earned, 0)
  return { total, items }
}

// ── Convert persisted ListingCompleteness → ScoreItem[] ──────────────────────

function completenessToItems(c: ListingCompleteness): ScoreItem[] {
  return [
    { label: 'Hình ảnh',                points: 20, earned: c.photo_score,  pass: c.photo_score  >= 12 },
    { label: 'Toạ độ GPS',              points: 10, earned: c.gps_score,    pass: c.gps_score    > 0  },
    { label: 'Pháp lý',                 points: 15, earned: c.legal_score,  pass: c.legal_score  >= 12 },
    { label: 'Chủ đất xác thực',        points: 10, earned: c.seller_score, pass: c.seller_score >= 10 },
    { label: 'Hạ tầng (đường / nước)',  points: 15, earned: c.infra_score,  pass: c.infra_score  >= 10 },
    { label: 'Nông nghiệp (đất / cây)', points: 20, earned: c.agri_score,   pass: c.agri_score   >= 15 },
    { label: 'Mô tả',                   points: 5,  earned: c.text_score,   pass: c.text_score   >= 3  },
    { label: 'Video thực địa',          points: 5,  earned: c.video_score,  pass: c.video_score  > 0  },
  ]
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ListingQualityScoreProps {
  // At least one must be provided.
  // If persisted is present, it takes precedence over inputs.
  inputs?:    QualityInputs
  persisted?: ListingCompleteness | null
}

export function ListingQualityScore({ inputs, persisted }: ListingQualityScoreProps) {
  let total: number
  let tier: CompletenessTier
  let items: ScoreItem[]

  if (persisted) {
    total = persisted.total_score
    tier  = persisted.tier
    items = completenessToItems(persisted)
  } else if (inputs) {
    const r = computeLegacyScore(inputs)
    total   = Math.min(r.total, 100)
    tier    = total >= 90 ? 'platinum' : total >= 75 ? 'gold' : total >= 55 ? 'silver' : 'bronze'
    items   = r.items
  } else {
    return null
  }

  const cfg     = TIER_CONFIG[tier]
  const passing = items.filter(it => it.pass)
  const failing = items.filter(it => !it.pass && it.points > 0)

  return (
    <section
      aria-labelledby="quality-heading"
      className={`rounded-2xl border border-neutral-100 p-5 ${cfg.bgClass}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p
            id="quality-heading"
            className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400"
          >
            Chất lượng tin đăng
          </p>
          <p className="m-0 mt-0.5 text-[13px] font-semibold" style={{ color: cfg.color }}>
            {cfg.label}
          </p>
        </div>

        {/* Score ring */}
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full
                     border-[3px] text-[17px] font-black"
          style={{ borderColor: cfg.color, color: cfg.color }}
          aria-label={`${total} trên 100`}
        >
          {total}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/70">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${total}%`, background: cfg.color }}
          role="progressbar"
          aria-valuenow={total}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Passing items */}
      {passing.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {passing.map(it => (
            <div key={it.label} className="flex items-center gap-1.5">
              <div
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${cfg.color}20` }}
                aria-hidden="true"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke={cfg.color} strokeWidth="3"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[12px] font-medium text-neutral-600">{it.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Failing items */}
      {failing.length > 0 && (
        <div className="rounded-xl border border-neutral-200/80 bg-white/60 px-3.5 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Còn thiếu để nâng điểm
          </p>
          <div className="flex flex-col gap-1.5">
            {failing.map(it => (
              <div key={it.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 shrink-0 rounded-full border border-neutral-200 bg-white" aria-hidden="true" />
                  <span className="text-[12px] text-neutral-400">{it.label}</span>
                </div>
                <span className="text-[11px] font-semibold text-neutral-400">
                  +{it.points - it.earned}đ
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
