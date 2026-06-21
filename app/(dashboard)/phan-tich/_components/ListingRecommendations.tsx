// Server component. Renders improvement recommendations for all of a seller's
// published listings using persisted listing_completeness scores.

import Link from 'next/link'
import type { ListingCompleteness } from '@/entities/listing/model/normalized-types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingWithCompleteness {
  id:    string
  title: string | null
  slug:  string | null
  completeness: ListingCompleteness | null
}

interface Rec {
  id:           string
  title:        string
  description:  string
  scoreGain:    number
  priority:     'critical' | 'high' | 'medium'
  href:         string
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure logic — derive recommendations from completeness flags
// ─────────────────────────────────────────────────────────────────────────────

function buildRecs(listingId: string, c: ListingCompleteness | null): Rec[] {
  const recs: Rec[] = []
  const base = `/dashboard/tin-dang/chinh-sua/${listingId}`

  if (!c) {
    recs.push({
      id:          'no_data',
      title:       'Bổ sung thông tin để nhận điểm',
      description: 'Tin đăng chưa có dữ liệu hoàn chỉnh. Bắt đầu bằng ảnh và GPS.',
      scoreGain:   100,
      priority:    'critical',
      href:        base,
    })
    return recs
  }

  if (c.photo_score < 10) {
    const current = c.photo_score === 0 ? 0 : c.photo_score < 8 ? 2 : 5
    recs.push({
      id:          'photos',
      title:       current === 0 ? 'Thêm ảnh — không có ảnh = 0 lượt xem' : 'Thêm ảnh để đạt điểm tối đa',
      description: `Cần ≥ 8 ảnh để đạt 20 điểm. Thiếu ảnh giảm lượt xem lên tới 4×.`,
      scoreGain:   20 - c.photo_score,
      priority:    c.photo_score === 0 ? 'critical' : 'high',
      href:        `${base}?tab=media`,
    })
  }

  if (!c.has_gps) {
    recs.push({
      id:          'gps',
      title:       'Cắm GPS — hiển thị trên bản đồ',
      description: 'Người mua lọc theo bản đồ. Không có GPS = không xuất hiện trong 60% tìm kiếm.',
      scoreGain:   10 - c.gps_score,
      priority:    'critical',
      href:        `${base}?tab=location`,
    })
  }

  if (c.legal_score < 10) {
    recs.push({
      id:          'legal',
      title:       'Xác nhận loại giấy tờ đất',
      description: 'Sổ đỏ / Sổ hồng / Giấy tay — đây là điều đầu tiên người mua kiểm tra.',
      scoreGain:   15 - c.legal_score,
      priority:    c.legal_score === 0 ? 'critical' : 'high',
      href:        `${base}?tab=legal`,
    })
  }

  if (!c.has_infra) {
    recs.push({
      id:          'infra',
      title:       'Bổ sung hạ tầng (đường, điện, nước)',
      description: 'Đường xe hơi và nguồn nước là 2 tiêu chí lọc phổ biến nhất của người mua.',
      scoreGain:   15 - c.infra_score,
      priority:    'high',
      href:        `${base}?tab=infrastructure`,
    })
  }

  if (!c.has_agriculture) {
    recs.push({
      id:          'agri',
      title:       'Thêm dữ liệu canh tác (loại đất, cây trồng)',
      description: 'Thông tin nông nghiệp đặc trưng giúp xuất hiện trong tìm kiếm chuyên sâu và tăng 20 điểm.',
      scoreGain:   20 - c.agri_score,
      priority:    'high',
      href:        `${base}?tab=agriculture`,
    })
  }

  if (!c.has_video) {
    recs.push({
      id:          'video',
      title:       'Thêm video / drone',
      description: 'Tin có video drone thu hút 2× thời gian xem và tăng tỷ lệ liên hệ.',
      scoreGain:   5,
      priority:    'medium',
      href:        `${base}?tab=media`,
    })
  }

  if (c.text_score < 5) {
    recs.push({
      id:          'text',
      title:       'Viết mô tả ≥ 200 chữ',
      description: 'Mô tả chi tiết giúp SEO và tăng tỷ lệ lưu tin.',
      scoreGain:   5 - c.text_score,
      priority:    'medium',
      href:        `${base}?tab=basic`,
    })
  }

  const PRIO: Record<string, number> = { critical: 0, high: 1, medium: 2 }
  return recs
    .sort((a, b) => PRIO[a.priority] - PRIO[b.priority] || b.scoreGain - a.scoreGain)
    .slice(0, 4)
}

// ─────────────────────────────────────────────────────────────────────────────
// Priority chip
// ─────────────────────────────────────────────────────────────────────────────

function PriorityChip({ p }: { p: Rec['priority'] }) {
  const cfg = {
    critical: { label: 'Quan trọng', cls: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
    high:     { label: 'Cao',        cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
    medium:   { label: 'TB',         cls: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
  }[p]

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TierBadge
// ─────────────────────────────────────────────────────────────────────────────

function TierBadge({ tier, score }: { tier: string; score: number }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    platinum: { label: 'Platinum', cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700/30' },
    gold:     { label: 'Gold',     cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/30' },
    silver:   { label: 'Silver',   cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/[0.06] dark:text-gray-300 dark:border-white/[0.1]' },
    bronze:   { label: 'Bronze',   cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700/30' },
  }
  const c = cfg[tier] ?? cfg.bronze

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${c.cls}`}>
      {c.label}
      <span className="tabular-nums">{score}</span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ListingRecommendationCard
// ─────────────────────────────────────────────────────────────────────────────

function ListingRecommendationCard({ item }: { item: ListingWithCompleteness }) {
  const recs        = buildRecs(item.id, item.completeness)
  const potentialGain = recs.reduce((s, r) => s + r.scoreGain, 0)
  const currentScore  = item.completeness?.total_score ?? 0
  const tier          = item.completeness?.tier ?? 'bronze'

  if (recs.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_1px_6px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          {item.slug ? (
            <Link
              href={`/dat/${item.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-[0.9375rem] font-bold text-gray-900 no-underline hover:underline dark:text-white"
            >
              {item.title ?? item.id}
            </Link>
          ) : (
            <p className="m-0 truncate text-[0.9375rem] font-bold text-gray-900 dark:text-white">
              {item.title ?? item.id}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TierBadge tier={tier} score={currentScore} />
          {potentialGain > 0 && (
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[0.6875rem] font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400">
              +{potentialGain} điểm
            </span>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="mx-5 mb-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]">
          <div
            className={[
              'h-full rounded-full',
              tier === 'platinum' ? 'bg-violet-500'
              : tier === 'gold'   ? 'bg-amber-400'
              : tier === 'silver' ? 'bg-gray-400'
              : 'bg-orange-400',
            ].join(' ')}
            style={{ width: `${currentScore}%` }}
          />
        </div>
      </div>

      <div className="mx-5 h-px bg-gray-100 dark:bg-white/[0.06]" />

      {/* ── Recommendations ── */}
      <ul className="m-0 list-none space-y-0 p-0">
        {recs.map((rec, idx) => (
          <li key={rec.id}>
            {idx > 0 && <div className="mx-5 h-px bg-gray-100/70 dark:bg-white/[0.04]" />}
            <Link
              href={rec.href}
              className="flex items-start gap-3 px-5 py-3 no-underline transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
            >
              <div className="mt-0.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityChip p={rec.priority} />
                  <span className="text-[0.875rem] font-semibold text-gray-900 dark:text-white">
                    {rec.title}
                  </span>
                </div>
                <p className="m-0 mt-0.5 text-[0.8125rem] leading-snug text-gray-500 dark:text-gray-400">
                  {rec.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[0.75rem] font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                +{rec.scoreGain}
              </span>
            </Link>
          </li>
        ))}
      </ul>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ListingRecommendations — exported section
// ─────────────────────────────────────────────────────────────────────────────

export function ListingRecommendations({
  listings,
}: {
  listings: ListingWithCompleteness[]
}) {
  // Only show listings that have recommendations
  const withRecs = listings.filter(l => buildRecs(l.id, l.completeness).length > 0)
  if (withRecs.length === 0) return null

  // Sort: lowest completeness score first (most improvement needed)
  const sorted = [...withRecs].sort(
    (a, b) => (a.completeness?.total_score ?? 0) - (b.completeness?.total_score ?? 0),
  )

  return (
    <section aria-labelledby="recs-heading">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Phase 17 — Seller Economics
          </p>
          <h2 id="recs-heading" className="m-0 mt-0.5 text-[1.125rem] font-bold text-gray-900 dark:text-white">
            Cải thiện tin đăng
          </h2>
        </div>
        <span className="text-[0.8125rem] text-gray-400">
          {withRecs.length} tin cần cập nhật
        </span>
      </div>
      <div className="space-y-4">
        {sorted.map(item => (
          <ListingRecommendationCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
