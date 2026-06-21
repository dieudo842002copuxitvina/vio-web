// Listing improvement recommendation engine.
// Pure TS compute — no Supabase calls. All inputs come from already-fetched data.
// Returns prioritized actions sellers can take to improve their listing's score.

import type {
  ListingCompleteness,
  ListingInfrastructure,
  ListingAgriculture,
  ListingLegal,
} from '../model/normalized-types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'
export type RecommendationCategory =
  | 'media'
  | 'location'
  | 'legal'
  | 'infrastructure'
  | 'agriculture'
  | 'text'

export interface ListingRecommendation {
  id:           string            // stable key, e.g. 'add_gps'
  priority:     RecommendationPriority
  category:     RecommendationCategory
  title:        string
  description:  string
  score_gain:   number            // approximate points this would add
  action_label: string            // CTA button text
  action_href?: string            // optional deep-link to edit tab
}

export interface RecommendationInput {
  listingId:      string
  completeness:   ListingCompleteness | null
  infrastructure: ListingInfrastructure | null
  agriculture:    ListingAgriculture | null
  legal:          ListingLegal | null
  photoCount:     number
  videoCount:     number
  hasDescription: boolean
  hasTitle:       boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// computeRecommendations
// ─────────────────────────────────────────────────────────────────────────────

export function computeRecommendations(
  input: RecommendationInput,
): ListingRecommendation[] {
  const recs: ListingRecommendation[] = []
  const c = input.completeness

  // ── Media ───────────────────────────────────────────────────────────────────

  if (input.photoCount < 3) {
    recs.push({
      id:           'add_photos_min',
      priority:     'critical',
      category:     'media',
      title:        'Thêm ít nhất 3 ảnh',
      description:  `Tin đăng có ít nhất 3 ảnh nhận được gấp 4× lượt xem. Hiện tại: ${input.photoCount} ảnh.`,
      score_gain:   input.photoCount === 0 ? 20 : 12,
      action_label: 'Thêm ảnh',
      action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=media`,
    })
  } else if (input.photoCount < 8) {
    recs.push({
      id:           'add_photos_more',
      priority:     'high',
      category:     'media',
      title:        'Thêm ảnh để đạt điểm tối đa',
      description:  `Cần ≥ 8 ảnh để đạt điểm ảnh tối đa. Hiện tại: ${input.photoCount} ảnh.`,
      score_gain:   8,
      action_label: 'Thêm ảnh',
      action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=media`,
    })
  }

  if (input.videoCount === 0) {
    recs.push({
      id:           'add_video',
      priority:     'medium',
      category:     'media',
      title:        'Thêm video/drone để tăng 5 điểm',
      description:  'Video toàn cảnh hoặc drone giúp người mua hiểu rõ thửa đất. Tăng 5 điểm hoàn chỉnh.',
      score_gain:   5,
      action_label: 'Upload video',
      action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=media`,
    })
  }

  // ── Location / GPS ──────────────────────────────────────────────────────────

  const hasGps = !!(input.infrastructure?.lat && input.infrastructure?.lng)
  if (!hasGps) {
    recs.push({
      id:           'add_gps',
      priority:     'critical',
      category:     'location',
      title:        'Đánh dấu GPS vị trí thửa đất',
      description:  'GPS cho phép hiển thị trên bản đồ và tăng 10 điểm hoàn chỉnh. Hầu hết người mua lọc theo bản đồ.',
      score_gain:   10,
      action_label: 'Cắm GPS',
      action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=location`,
    })
  }

  // ── Infrastructure ──────────────────────────────────────────────────────────

  if (!input.infrastructure) {
    recs.push({
      id:           'add_infrastructure',
      priority:     'high',
      category:     'infrastructure',
      title:        'Bổ sung thông tin hạ tầng',
      description:  'Đường xe, điện, nước, địa hình — 5 trường này tăng 15 điểm và giúp người mua đánh giá đúng giá trị đất.',
      score_gain:   15,
      action_label: 'Bổ sung hạ tầng',
      action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=infrastructure`,
    })
  } else {
    const infra = input.infrastructure
    if (infra.road_access === null) {
      recs.push({
        id:           'fill_road_access',
        priority:     'medium',
        category:     'infrastructure',
        title:        'Xác nhận thông tin đường vào',
        description:  'Cho biết có đường xe hơi vào đất không. Đây là tiêu chí lọc phổ biến nhất.',
        score_gain:   4,
        action_label: 'Cập nhật',
        action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=infrastructure`,
      })
    }
    if (infra.water_source === null) {
      recs.push({
        id:           'fill_water_source',
        priority:     'medium',
        category:     'infrastructure',
        title:        'Thêm nguồn nước tưới',
        description:  'Kênh, giếng hay nước mưa — người trồng cây cần biết để lên kế hoạch canh tác.',
        score_gain:   4,
        action_label: 'Cập nhật',
        action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=infrastructure`,
      })
    }
    if (infra.flood_risk === null) {
      recs.push({
        id:           'fill_flood_risk',
        priority:     'low',
        category:     'infrastructure',
        title:        'Ghi rõ mức độ ngập lụt',
        description:  'Người mua ở ĐBSCL đặc biệt quan tâm. Ghi "Không ngập" giúp lọc tốt hơn.',
        score_gain:   3,
        action_label: 'Cập nhật',
        action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=infrastructure`,
      })
    }
  }

  // ── Agriculture ─────────────────────────────────────────────────────────────

  if (!input.agriculture) {
    recs.push({
      id:           'add_agriculture',
      priority:     'high',
      category:     'agriculture',
      title:        'Bổ sung thông tin canh tác',
      description:  'Loại đất, cây đang trồng, loại phân tưới — 20 điểm hoàn chỉnh đến từ dữ liệu nông nghiệp.',
      score_gain:   20,
      action_label: 'Bổ sung canh tác',
      action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=agriculture`,
    })
  } else {
    const agri = input.agriculture
    if (!agri.soil_type) {
      recs.push({
        id:           'fill_soil_type',
        priority:     'medium',
        category:     'agriculture',
        title:        'Chọn loại đất canh tác',
        description:  'Đất phù sa, đỏ bazan, cát pha... giúp người mua đánh giá phù hợp với cây trồng mục tiêu.',
        score_gain:   5,
        action_label: 'Cập nhật',
        action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=agriculture`,
      })
    }
    if (!agri.current_crops || agri.current_crops.length === 0) {
      recs.push({
        id:           'fill_current_crops',
        priority:     'medium',
        category:     'agriculture',
        title:        'Ghi cây trồng hiện tại',
        description:  'Lúa, cà phê, tiêu, sầu riêng... người mua chuyên cây nào sẽ lọc theo cây đó.',
        score_gain:   5,
        action_label: 'Cập nhật',
        action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=agriculture`,
      })
    }
    if (!agri.certifications || agri.certifications.length === 0) {
      recs.push({
        id:           'add_certification',
        priority:     'low',
        category:     'agriculture',
        title:        'Thêm chứng nhận (VietGAP, Organic...)',
        description:  'Chứng nhận tăng giá trị thương mại và mở rộng tệp người mua xuất khẩu.',
        score_gain:   3,
        action_label: 'Cập nhật',
        action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=agriculture`,
      })
    }
  }

  // ── Legal ────────────────────────────────────────────────────────────────────

  const legalScore = c?.legal_score ?? 0
  if (legalScore < 10) {
    if (!input.legal || !input.legal.legal_doc_type || input.legal.legal_doc_type === 'none') {
      recs.push({
        id:           'add_legal_doc_type',
        priority:     'critical',
        category:     'legal',
        title:        'Ghi rõ loại giấy tờ đất',
        description:  'Sổ đỏ, sổ hồng, hay giấy tay — đây là điều người mua xem đầu tiên. Tăng 15 điểm.',
        score_gain:   15,
        action_label: 'Cập nhật pháp lý',
        action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=legal`,
      })
    } else if (!input.legal?.parcel_number) {
      recs.push({
        id:           'add_parcel_number',
        priority:     'medium',
        category:     'legal',
        title:        'Bổ sung số thửa / số tờ bản đồ',
        description:  'Số thửa đất giúp người mua tra cứu quy hoạch và làm thủ tục chính xác hơn.',
        score_gain:   5,
        action_label: 'Cập nhật pháp lý',
        action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=legal`,
      })
    }
  }

  // ── Text ────────────────────────────────────────────────────────────────────

  const textScore = c?.text_score ?? 0
  if (textScore < 5) {
    recs.push({
      id:           'improve_description',
      priority:     'medium',
      category:     'text',
      title:        'Viết mô tả chi tiết hơn',
      description:  'Mô tả ≥ 200 từ với thông tin đặc trưng đất, vùng trồng và lợi thế đầu tư tăng 5 điểm và tỷ lệ click.',
      score_gain:   5,
      action_label: 'Chỉnh sửa mô tả',
      action_href:  `/dashboard/tin-dang/chinh-sua/${input.listingId}?tab=basic`,
    })
  }

  // ── Sort by priority ────────────────────────────────────────────────────────

  const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
    critical: 0,
    high:     1,
    medium:   2,
    low:      3,
  }

  return recs.sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      b.score_gain - a.score_gain,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// getPotentialScoreGain — sum of all recommendation score_gains
// ─────────────────────────────────────────────────────────────────────────────

export function getPotentialScoreGain(recs: ListingRecommendation[]): number {
  return recs.reduce((sum, r) => sum + r.score_gain, 0)
}
