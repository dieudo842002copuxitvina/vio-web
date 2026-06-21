// Pure composite land quality scoring.
// Reuses existing sub-entity data — no external API calls.
// Weights: completeness 30% + infrastructure 25% + agriculture 25% + legal 20%

import type { ListingDetailResult } from '@/entities/listing/api/listing.server'

export type LandGrade = 'A' | 'B' | 'C' | 'D'

export interface LandScoreBreakdown {
  completeness:    number  // 0–100
  infrastructure:  number  // 0–100
  agriculture:     number  // 0–100
  legal:           number  // 0–100
}

export interface LandScore {
  total:       number       // 0–100
  grade:       LandGrade
  breakdown:   LandScoreBreakdown
  summary_vi:  string
}

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreInfrastructure(infra: ListingDetailResult['infrastructure']): number {
  if (!infra) return 0
  let score = 0
  if (infra.road_access)       score += 30
  if (infra.road_width_m && infra.road_width_m >= 4)  score += 15
  if (infra.electricity_access) score += 20
  if (infra.water_source && infra.water_source !== 'none') score += 20
  if (infra.internet_access)   score += 10
  if (infra.flood_risk === 'none' || infra.flood_risk === 'low') score += 5
  return Math.min(score, 100)
}

function scoreAgriculture(agri: ListingDetailResult['agriculture']): number {
  if (!agri) return 0
  let score = 0
  if (agri.soil_type)                              score += 20
  if (agri.current_crops && agri.current_crops.length > 0) score += 20
  if (agri.irrigation_type && agri.irrigation_type !== 'none') score += 20
  if (agri.crop_cycles_per_year && agri.crop_cycles_per_year >= 2) score += 15
  if (agri.certifications && agri.certifications.length > 0) score += 20
  if (agri.annual_yield_estimate)                  score += 5
  return Math.min(score, 100)
}

function scoreLegal(legal: ListingDetailResult['legal']): number {
  if (!legal) return 0
  let score = 0
  if (legal.legal_doc_type === 'so_do' || legal.legal_doc_type === 'so_hong') score += 50
  else if (legal.legal_doc_type === 'contract')                                score += 20
  else if (legal.legal_doc_type === 'giay_tay')                                score += 5
  if (legal.doc_verified)     score += 30
  if (!legal.is_disputable)   score += 10
  if (!legal.is_in_planning_zone) score += 10
  return Math.min(score, 100)
}

function gradeFromScore(score: number): LandGrade {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

function summarize(grade: LandGrade): string {
  const grades: Record<LandGrade, string> = {
    A: 'Thửa đất chất lượng xuất sắc — đầy đủ thông tin, pháp lý rõ ràng và cơ sở hạ tầng tốt.',
    B: 'Thửa đất chất lượng tốt — thông tin cơ bản đầy đủ, một vài điểm cần bổ sung thêm.',
    C: 'Thửa đất mức trung bình — cần bổ sung thêm thông tin pháp lý hoặc cơ sở hạ tầng.',
    D: 'Thửa đất chưa đầy đủ thông tin — nên bổ sung ảnh, GPS, pháp lý và chi tiết canh tác.',
  }
  return grades[grade]
}

// ── computeLandScore ──────────────────────────────────────────────────────────

export function computeLandScore(listing: ListingDetailResult): LandScore {
  const completenessScore   = listing.completeness?.total_score   ?? 0
  const infrastructureScore = scoreInfrastructure(listing.infrastructure)
  const agricultureScore    = scoreAgriculture(listing.agriculture)
  const legalScore          = scoreLegal(listing.legal)

  const breakdown: LandScoreBreakdown = {
    completeness:   Math.round(completenessScore),
    infrastructure: Math.round(infrastructureScore),
    agriculture:    Math.round(agricultureScore),
    legal:          Math.round(legalScore),
  }

  const total = Math.round(
    completenessScore   * 0.30 +
    infrastructureScore * 0.25 +
    agricultureScore    * 0.25 +
    legalScore          * 0.20,
  )

  const grade = gradeFromScore(total)

  return {
    total,
    grade,
    breakdown,
    summary_vi: summarize(grade),
  }
}
