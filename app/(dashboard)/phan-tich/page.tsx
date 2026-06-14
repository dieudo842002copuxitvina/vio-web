import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { getMerchantInsights }    from '@/features/merchant/api/merchant-insights.server'
import { getMerchantMetrics, getLeadStageCounts, getListingPerformances } from '@/features/merchant/api/merchant.server'
import { getSubscriptionFeatures } from '@/features/billing/api/subscription.server'
import { ListingRecommendations }  from './_components/ListingRecommendations'
import type { ListingInsight }     from '@/features/merchant/api/merchant-insights.server'
import type { MerchantMetrics, ListingPerformance } from '@/features/merchant/api/merchant.server'
import type { ListingCompleteness } from '@/entities/listing/model/normalized-types'

export const metadata: Metadata = { title: 'Phân tích Listing' }
export const revalidate = 0

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`
  return String(v)
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function fmtRank(n: number | null): string {
  return n != null ? `#${n}` : '—'
}

// ── Merchant-wide KPI bar ─────────────────────────────────────────────────────

function KpiTile({
  label, value, accent, highlight,
}: {
  label:      string
  value:      string
  accent?:    boolean
  highlight?: boolean
}) {
  return (
    <div className={[
      'flex flex-col gap-1.5 rounded-2xl border px-4 py-3',
      highlight
        ? 'border-[#0071E3]/20 bg-[#0071E3]/5 dark:border-[#409CFF]/20 dark:bg-[#409CFF]/10'
      : accent
        ? 'border-[#34C759]/20 bg-[#34C759]/5 dark:border-[#30D158]/20 dark:bg-[#30D158]/10'
      : 'border-gray-100 bg-white shadow-[0_1px_4px_rgb(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-[#1C1C1E]',
    ].join(' ')}>
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-gray-400">
        {label}
      </span>
      <span className={[
        'text-2xl font-bold tabular-nums leading-none',
        highlight ? 'text-[#0071E3] dark:text-[#409CFF]'
        : accent  ? 'text-[#34C759] dark:text-[#30D158]'
        : 'text-gray-900 dark:text-white',
      ].join(' ')}>
        {value}
      </span>
    </div>
  )
}

function MerchantKpiBar({ m }: { m: MerchantMetrics }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiTile label="Hiển thị 7d"  value={fmtNum(m.impressions_7d)} />
      <KpiTile label="Click 7d"     value={fmtNum(m.clicks_7d)} />
      <KpiTile label="CTR"          value={fmtPct(m.ctr_7d)}        accent />
      <KpiTile label="Liên hệ 7d"  value={String(m.inquiries_7d)}   highlight />
      <KpiTile label="Pipeline"     value={String(m.leads_active)} />
      <KpiTile label="Chốt 30d"    value={String(m.leads_won_30d)}  accent />
    </div>
  )
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function MetricCell({
  label,
  value,
  accent = false,
  highlight = false,
}: {
  label:     string
  value:     string
  accent?:   boolean
  highlight?: boolean
}) {
  return (
    <div className={[
      'flex flex-col gap-0.5 rounded-xl px-3 py-2.5',
      highlight ? 'bg-[#0071E3]/8 dark:bg-[#409CFF]/10'
      : accent  ? 'bg-[#34C759]/8 dark:bg-[#30D158]/10'
      : 'bg-gray-50 dark:bg-white/[0.04]',
    ].join(' ')}>
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">
        {label}
      </span>
      <span className={[
        'text-base font-bold leading-none',
        highlight ? 'text-[#0071E3] dark:text-[#409CFF]'
        : accent  ? 'text-[#34C759] dark:text-[#30D158]'
        : 'text-gray-900 dark:text-white',
      ].join(' ')}>
        {value}
      </span>
    </div>
  )
}

function RankBadge({ rank, label }: { rank: number | null; label: string }) {
  const isRanked = rank != null
  const isTop10  = rank != null && rank <= 10

  return (
    <div className={[
      'flex flex-col items-center gap-0.5 rounded-xl px-3 py-2',
      isTop10  ? 'bg-amber-50 dark:bg-amber-900/20'
      : isRanked ? 'bg-gray-50 dark:bg-white/[0.04]'
      : 'bg-gray-50/50 dark:bg-white/[0.02]',
    ].join(' ')}>
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">
        {label}
      </span>
      <span className={[
        'text-base font-bold leading-none',
        isTop10  ? 'text-amber-600 dark:text-amber-400'
        : isRanked ? 'text-gray-900 dark:text-white'
        : 'text-gray-300 dark:text-gray-600',
      ].join(' ')}>
        {fmtRank(rank)}
      </span>
    </div>
  )
}

function LeadPill({
  count,
  label,
  variant,
}: {
  count:   number
  label:   string
  variant: 'neutral' | 'hot' | 'very_hot'
}) {
  const base = 'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold'
  const cls  = variant === 'very_hot'
    ? `${base} bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400`
    : variant === 'hot'
    ? `${base} bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400`
    : `${base} bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300`

  return (
    <span className={cls}>
      {variant === 'very_hot' ? '🔥🔥' : variant === 'hot' ? '🔥' : '👥'}
      {count} {label}
    </span>
  )
}

// ── Completeness hints ───────────────────────────────────────────────────────

interface CompletenessData {
  hasCover:        boolean
  hasPrice:        boolean
  hasDescription:  boolean
  hasPhone:        boolean
  hasLocation:     boolean
  hasLandType:     boolean
}

interface ImprovementTip {
  label: string
  href:  string
  gain:  string
}

function buildTips(c: CompletenessData, listingId: string): ImprovementTip[] {
  const tips: ImprovementTip[] = []
  const edit = `/tin-dang-cua-toi/chinh-sua/${listingId}`

  if (!c.hasCover)
    tips.push({ label: 'Thêm ảnh', href: edit, gain: '+3x lượt xem' })
  if (!c.hasPrice)
    tips.push({ label: 'Thêm giá', href: edit, gain: '+2x liên hệ' })
  if (!c.hasDescription)
    tips.push({ label: 'Viết mô tả ≥200 chữ', href: edit, gain: '+60% lưu' })
  if (!c.hasLandType)
    tips.push({ label: 'Chọn loại đất', href: edit, gain: '+40% CTR' })
  if (!c.hasPhone)
    tips.push({ label: 'Thêm số điện thoại', href: edit, gain: 'Tăng tin cậy' })
  if (!c.hasLocation)
    tips.push({ label: 'Thêm địa chỉ', href: edit, gain: '+SEO' })

  return tips.slice(0, 3) // show top 3 actionable tips only
}

function CompletenessHints({
  completeness,
  listingId,
}: {
  completeness: CompletenessData
  listingId:    string
}) {
  const tips = buildTips(completeness, listingId)
  if (tips.length === 0) return null

  const filled = Object.values(completeness).filter(Boolean).length
  const total  = Object.values(completeness).length
  const pct    = Math.round((filled / total) * 100)

  return (
    <>
      <div className="mx-5 h-px bg-gray-100 dark:bg-white/[0.06]" />
      <div className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Cải thiện tin đăng
          </p>
          <span className={[
            'text-xs font-semibold tabular-nums',
            pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500',
          ].join(' ')}>
            {pct}% hoàn chỉnh
          </span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]">
          <div
            className={[
              'h-full rounded-full transition-all',
              pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400',
            ].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {tips.map(tip => (
            <Link
              key={tip.label}
              href={tip.href}
              className="flex items-center gap-1.5 rounded-full border border-dashed
                         border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold
                         text-amber-700 no-underline transition-colors
                         hover:border-amber-400 hover:bg-amber-100
                         dark:border-amber-500/30 dark:bg-amber-900/10 dark:text-amber-400"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round"/>
              </svg>
              {tip.label}
              <span className="rounded-full bg-amber-200/60 px-1.5 py-0.5 text-[0.65rem]
                               dark:bg-amber-900/30">
                {tip.gain}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Insight Card ─────────────────────────────────────────────────────────────

function InsightCard({
  insight: i,
  completeness,
}: {
  insight:      ListingInsight
  completeness: CompletenessData | null
}) {
  const hasLeads   = i.leadCount > 0
  const hasRanking = i.trendingRank != null || i.provinceRank != null || i.categoryRank != null

  return (
    <article className="rounded-2xl border border-gray-100 bg-white shadow-[0_1px_6px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          {i.listingSlug ? (
            <Link
              href={`/dat-nong-nghiep/chi-tiet/${i.listingSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-[0.9375rem] font-bold text-gray-900 no-underline hover:underline dark:text-white"
            >
              {i.listingTitle ?? i.listingId}
            </Link>
          ) : (
            <p className="m-0 truncate text-[0.9375rem] font-bold text-gray-900 dark:text-white">
              {i.listingTitle ?? i.listingId}
            </p>
          )}
          {/* Lead pills */}
          {hasLeads && (
            <div className="mt-2 flex flex-wrap gap-2">
              <LeadPill count={i.leadCount}        label="leads"    variant="neutral"  />
              {i.hotLeadCount > 0     && <LeadPill count={i.hotLeadCount}     label="nóng"     variant="hot"      />}
              {i.veryHotLeadCount > 0 && <LeadPill count={i.veryHotLeadCount} label="rất nóng" variant="very_hot" />}
            </div>
          )}
        </div>

        {/* Lead detail link */}
        {hasLeads && (
          <Link
            href="/quan-ly-leads/tin-hieu"
            className="shrink-0 rounded-xl bg-[#0071E3]/8 px-3 py-1.5 text-xs font-semibold text-[#0071E3] no-underline transition-opacity hover:opacity-75 dark:bg-[#409CFF]/10 dark:text-[#409CFF]"
          >
            Xem leads →
          </Link>
        )}
      </div>

      <div className="mx-5 h-px bg-gray-100 dark:bg-white/[0.06]" />

      {/* ── Engagement metrics ── */}
      <div className="px-5 py-4">
        <p className="m-0 mb-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
          Tương tác
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <MetricCell label="Xem 24h"  value={fmtNum(i.views24h)} />
          <MetricCell label="Xem 7d"   value={fmtNum(i.views7d)}  />
          <MetricCell label="CTR"      value={fmtPct(i.ctr)}      accent={i.ctr > 0.04} />
          <MetricCell label="Lưu"      value={fmtPct(i.saveRate)} accent={i.saveRate > 0.02} />
          <MetricCell label="Liên hệ"  value={fmtPct(i.contactRate)} highlight={i.contactRate > 0.01} />
        </div>
      </div>

      {/* ── Rankings ── */}
      {hasRanking && (
        <>
          <div className="mx-5 h-px bg-gray-100 dark:bg-white/[0.06]" />
          <div className="px-5 py-4">
            <p className="m-0 mb-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
              Xếp hạng
            </p>
            <div className="flex flex-wrap gap-2">
              <RankBadge rank={i.trendingRank}  label="Toàn quốc" />
              <RankBadge rank={i.provinceRank}  label="Tỉnh thành" />
              <RankBadge rank={i.categoryRank}  label="Danh mục" />
            </div>
          </div>
        </>
      )}

      {/* ── Top Search Keywords ── */}
      {i.topKeywords.length > 0 && (
        <>
          <div className="mx-5 h-px bg-gray-100 dark:bg-white/[0.06]" />
          <div className="px-5 py-4">
            <p className="m-0 mb-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
              Từ khóa tìm kiếm
            </p>
            <div className="flex flex-wrap gap-2">
              {i.topKeywords.map(kw => (
                <span
                  key={kw}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300"
                >
                  🔍 {kw}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Listing completeness / improvement tips ── */}
      {completeness && (
        <CompletenessHints completeness={completeness} listingId={i.listingId} />
      )}

    </article>
  )
}

// ── Summary row ───────────────────────────────────────────────────────────────

function SummaryBar({ insights }: { insights: ListingInsight[] }) {
  const totalViews24h  = insights.reduce((s, i) => s + i.views24h, 0)
  const totalViews7d   = insights.reduce((s, i) => s + i.views7d,  0)
  const totalLeads     = insights.reduce((s, i) => s + i.leadCount, 0)
  const hotTotal       = insights.reduce((s, i) => s + i.hotLeadCount + i.veryHotLeadCount, 0)
  const avgCtr         = insights.length > 0
    ? insights.reduce((s, i) => s + i.ctr, 0) / insights.length
    : 0

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
      {[
        { label: 'Lượt xem 24h',  value: fmtNum(totalViews24h) },
        { label: 'Lượt xem 7d',   value: fmtNum(totalViews7d)  },
        { label: 'CTR trung bình', value: fmtPct(avgCtr)        },
        { label: 'Tổng Leads',    value: String(totalLeads)     },
        { label: 'Leads nóng',    value: String(hotTotal)       },
      ].map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col gap-1 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_1px_4px_rgb(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-[#1C1C1E]"
        >
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">
            {label}
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Lead Funnel Analytics ────────────────────────────────────────────────────

type LeadStageCountsMap = Record<string, number>

function LeadFunnelSection({
  stageCounts,
  metrics,
  isPro,
}: {
  stageCounts: LeadStageCountsMap
  metrics:     MerchantMetrics | null
  isPro:       boolean
}) {
  const stages: Array<{ key: string; label: string; color: string }> = [
    { key: 'new',       label: 'Mới',         color: '#6366F1' },
    { key: 'contacted', label: 'Đã liên hệ',  color: '#0071E3' },
    { key: 'qualified', label: 'Đủ điều kiện', color: '#FF9500' },
    { key: 'proposal',  label: 'Đề nghị',     color: '#FF6B00' },
    { key: 'won',       label: 'Chốt deal',   color: '#34C759' },
    { key: 'lost',      label: 'Thất bại',    color: '#FF3B30' },
  ]

  const totalLeads = Object.values(stageCounts).reduce((s, n) => s + n, 0)
  const maxCount   = Math.max(...Object.values(stageCounts), 1)

  if (totalLeads === 0 && !metrics) return null

  return (
    <section aria-labelledby="funnel-heading"
             className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-[0_1px_6px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Phân tích chuyển đổi
          </p>
          <h2 id="funnel-heading" className="m-0 mt-0.5 text-[1rem] font-bold text-gray-900 dark:text-white">
            Lead Funnel
          </h2>
        </div>
        {metrics && (
          <div className="flex items-center gap-1.5 rounded-xl bg-[#34C759]/10 px-3 py-1.5">
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[#34C759]">
              Tỷ lệ chốt
            </span>
            <span className="text-[1rem] font-black text-[#34C759]">
              {(metrics.conversion_rate * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="mx-5 h-px bg-gray-100 dark:bg-white/[0.06]" />

      <div className="px-5 py-4">
        {totalLeads > 0 ? (
          <div className="space-y-2.5">
            {stages.filter(s => s.key !== 'lost').map(s => {
              const count = stageCounts[s.key] ?? 0
              const pct   = Math.round((count / maxCount) * 100)
              return (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">
                      {s.label}
                    </span>
                    <span className="text-[0.8125rem] font-bold tabular-nums" style={{ color: s.color }}>
                      {count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${pct}%`, background: s.color }}
                    />
                  </div>
                </div>
              )
            })}
            {(stageCounts['lost'] ?? 0) > 0 && (
              <p className="mt-1 text-[0.75rem] text-gray-400">
                + {stageCounts['lost']} leads không chốt được
              </p>
            )}
          </div>
        ) : (
          <p className="text-[0.875rem] text-gray-400">
            Chưa có lead. Leads xuất hiện khi người mua liên hệ qua tin đăng.
          </p>
        )}

        {metrics && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
            <div className="flex flex-col gap-0.5 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.04]">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">Tổng leads</span>
              <span className="text-[1rem] font-bold text-gray-900 dark:text-white">{metrics.leads_total}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl bg-[#34C759]/8 px-3 py-2.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">Chốt 30d</span>
              <span className="text-[1rem] font-bold text-[#34C759]">{metrics.leads_won_30d}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-white/[0.04]">
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">Đang xử lý</span>
              <span className="text-[1rem] font-bold text-gray-900 dark:text-white">{metrics.leads_active}</span>
            </div>
          </div>
        )}

        {!isPro && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-[#0071E3]/30
                          bg-[#0071E3]/5 px-4 py-3">
            <p className="m-0 flex-1 text-[0.8125rem] text-[#0071E3]">
              Pro: Xem phân tích lead theo nguồn và hành vi mua.
            </p>
            <Link
              href="/nang-cap?reason=lead-funnel"
              className="shrink-0 rounded-full bg-[#0071E3] px-3 py-1 text-[0.75rem]
                         font-semibold text-white no-underline hover:opacity-80"
            >
              Nâng cấp
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Listing Health Score ─────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  top:     { label: 'Top performer',   color: '#34C759', bg: '#F0FFF4' },
  good:    { label: 'Hiệu quả tốt',    color: '#2D7A4F', bg: '#F0F6F2' },
  average: { label: 'Trung bình',      color: '#FF9500', bg: '#FFF8F0' },
  low:     { label: 'Cần cải thiện',   color: '#FF6B00', bg: '#FFF4EF' },
  new:     { label: 'Chưa có dữ liệu', color: '#8E8E93', bg: '#F5F5F7' },
}

function ListingHealthSection({ performances }: { performances: ListingPerformance[] }) {
  if (performances.length === 0) return null

  return (
    <section aria-labelledby="health-heading"
             className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-[0_1px_6px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">
      <div className="px-5 pt-5 pb-4">
        <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
          Điểm sức khoẻ
        </p>
        <h2 id="health-heading" className="m-0 mt-0.5 text-[1rem] font-bold text-gray-900 dark:text-white">
          Hiệu suất từng tin đăng
        </h2>
      </div>

      <div className="mx-5 h-px bg-gray-100 dark:bg-white/[0.06]" />

      <div className="px-5 py-4 space-y-3">
        {performances.slice(0, 5).map(p => {
          const tier = TIER_CONFIG[p.performance_tier] ?? TIER_CONFIG.new
          const score = Math.round(p.performance_score)
          return (
            <div key={p.listing_id}
                 className="flex items-center gap-3 rounded-xl border border-gray-50 bg-gray-50/50
                            px-4 py-3 dark:border-white/[0.04] dark:bg-white/[0.02]">

              {/* Score ring */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                           border-2 text-[0.75rem] font-black"
                style={{ borderColor: tier.color, color: tier.color, background: tier.bg }}
              >
                {score}
              </div>

              <div className="min-w-0 flex-1">
                {p.listing_slug ? (
                  <Link
                    href={`/dat/${p.listing_slug}`}
                    target="_blank"
                    className="block truncate text-[0.875rem] font-semibold text-gray-900
                               no-underline hover:underline dark:text-white"
                  >
                    {p.listing_title ?? p.listing_id}
                  </Link>
                ) : (
                  <p className="m-0 truncate text-[0.875rem] font-semibold text-gray-900 dark:text-white">
                    {p.listing_title ?? p.listing_id}
                  </p>
                )}
                <span
                  className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em]"
                  style={{ background: tier.bg, color: tier.color }}
                >
                  {tier.label}
                </span>
              </div>

              <div className="hidden shrink-0 grid-cols-3 gap-3 sm:grid">
                <div className="text-right">
                  <p className="m-0 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-gray-400">CTR 7d</p>
                  <p className="m-0 text-[0.875rem] font-bold text-gray-900 dark:text-white">
                    {(p.ctr_7d * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="m-0 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-gray-400">Liên hệ</p>
                  <p className="m-0 text-[0.875rem] font-bold text-gray-900 dark:text-white">
                    {p.inquiries_7d}
                  </p>
                </div>
                <div className="text-right">
                  <p className="m-0 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-gray-400">Lưu 7d</p>
                  <p className="m-0 text-[0.875rem] font-bold text-gray-900 dark:text-white">
                    {p.saves_7d}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── ROI Analytics ─────────────────────────────────────────────────────────────

function RoiSection({ metrics, isPro }: { metrics: MerchantMetrics; isPro: boolean }) {
  const responseColor = metrics.avg_response_hours < 2
    ? '#34C759'
    : metrics.avg_response_hours < 24 ? '#FF9500' : '#FF3B30'

  const ctrColor = metrics.ctr_7d > 0.05
    ? '#34C759'
    : metrics.ctr_7d > 0.02 ? '#FF9500' : '#FF3B30'

  const inquiryColor = metrics.inquiry_rate_7d > 0.02
    ? '#34C759'
    : metrics.inquiry_rate_7d > 0.005 ? '#FF9500' : '#8E8E93'

  function fmtHours(h: number): string {
    if (h < 1)   return '< 1 giờ'
    if (h < 24)  return `${Math.round(h)} giờ`
    return `${Math.round(h / 24)} ngày`
  }

  return (
    <section aria-labelledby="roi-heading"
             className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-[0_1px_6px_rgb(0,0,0,0.05)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">
      <div className="px-5 pt-5 pb-4">
        <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
          Hiệu quả hoạt động
        </p>
        <h2 id="roi-heading" className="m-0 mt-0.5 text-[1rem] font-bold text-gray-900 dark:text-white">
          ROI & Chỉ số bán hàng
        </h2>
      </div>

      <div className="mx-5 h-px bg-gray-100 dark:bg-white/[0.06]" />

      <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/[0.04]">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">
            Tỷ lệ phản hồi
          </span>
          <span className="text-[1.25rem] font-black tabular-nums"
                style={{ color: metrics.response_rate_7d > 0.8 ? '#34C759' : '#FF9500' }}>
            {Math.round(metrics.response_rate_7d * 100)}%
          </span>
          <span className="text-[0.6875rem] text-gray-400">7 ngày</span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/[0.04]">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">
            Thời gian phản hồi
          </span>
          <span className="text-[1.25rem] font-black tabular-nums" style={{ color: responseColor }}>
            {fmtHours(metrics.avg_response_hours)}
          </span>
          <span className="text-[0.6875rem] text-gray-400">Trung bình</span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/[0.04]">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">
            CTR tổng
          </span>
          <span className="text-[1.25rem] font-black tabular-nums" style={{ color: ctrColor }}>
            {(metrics.ctr_7d * 100).toFixed(1)}%
          </span>
          <span className="text-[0.6875rem] text-gray-400">7 ngày</span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/[0.04]">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gray-400">
            Tỷ lệ liên hệ
          </span>
          <span className="text-[1.25rem] font-black tabular-nums" style={{ color: inquiryColor }}>
            {(metrics.inquiry_rate_7d * 100).toFixed(2)}%
          </span>
          <span className="text-[0.6875rem] text-gray-400">Inquiries / click</span>
        </div>
      </div>

      {/* Benchmark guidance */}
      <div className="mx-5 mb-5 rounded-xl bg-[#F5F5F7] px-4 py-3 dark:bg-white/[0.04]">
        <p className="m-0 text-[0.75rem] font-semibold text-gray-600 dark:text-gray-300">
          Điểm chuẩn ngành (đất nông nghiệp VN):
          CTR tốt &gt; 3% · Tỷ lệ liên hệ tốt &gt; 1% · Phản hồi nhanh &lt; 4 giờ
        </p>
      </div>

      {!isPro && (
        <div className="mx-5 mb-5 flex items-center gap-3 rounded-xl border border-dashed
                        border-[#0071E3]/30 bg-[#0071E3]/5 px-4 py-3">
          <p className="m-0 flex-1 text-[0.8125rem] text-[#0071E3]">
            Pro: Phân tích ROI theo từng tin, so sánh với đối thủ cùng khu vực.
          </p>
          <Link
            href="/nang-cap?reason=roi"
            className="shrink-0 rounded-full bg-[#0071E3] px-3 py-1 text-[0.75rem]
                       font-semibold text-white no-underline hover:opacity-80"
          >
            Nâng cấp
          </Link>
        </div>
      )}
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PhanTichPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-center text-gray-500">
        Vui lòng đăng nhập để xem phân tích.
      </div>
    )
  }

  const [insights, features, metrics, completenessRows, stageCounts, perfResult] = await Promise.all([
    getMerchantInsights(user.id),
    getSubscriptionFeatures(user.id),
    getMerchantMetrics(user.id),
    supabase
      .from('listings')
      .select('id, price_text, description, contact_phone, location_text, land_type, cover_url')
      .eq('owner_id', user.id)
      .eq('status', 'published'),
    getLeadStageCounts(user.id),
    getListingPerformances(user.id, 10),
  ])

  // Phase 17: fetch completeness scores for all seller listings (after we have insight IDs)
  const insightIds = insights.map(i => i.listingId)
  const completenessForRecs = insightIds.length > 0
    ? await supabase
        .from('listing_completeness')
        .select('*')
        .in('listing_id', insightIds)
    : { data: [] }

  // Build completeness map: listingId → CompletenessData
  type CompRow = {
    id: string; price_text: string | null; description: string | null
    contact_phone: string | null; location_text: string | null
    land_type: string | null; cover_url: string | null
  }
  const completenessMap = new Map<string, CompletenessData>()
  for (const row of ((completenessRows.data ?? []) as CompRow[])) {
    completenessMap.set(row.id, {
      hasCover:       !!row.cover_url,
      hasPrice:       !!row.price_text,
      hasDescription: (row.description?.length ?? 0) >= 200,
      hasPhone:       !!row.contact_phone,
      hasLocation:    !!row.location_text,
      hasLandType:    !!row.land_type,
    })
  }

  // Phase 17: build completeness lookup for recommendations
  const completenessScoreMap = new Map<string, ListingCompleteness>()
  for (const row of ((completenessForRecs.data ?? []) as unknown as ListingCompleteness[])) {
    completenessScoreMap.set(row.listing_id, row)
  }

  // Phase 17: build per-listing data for ListingRecommendations
  const listingsForRecs = insights.map(i => ({
    id:           i.listingId,
    title:        i.listingTitle ?? null,
    slug:         i.listingSlug ?? null,
    completeness: completenessScoreMap.get(i.listingId) ?? null,
  }))

  const canSeeHotLeads = features.hotLeads

  // Sort: very hot leads first (Pro), then by views7d desc
  const sorted = [...insights].sort((a, b) => {
    const hotDiff = (b.veryHotLeadCount + b.hotLeadCount) - (a.veryHotLeadCount + a.hotLeadCount)
    return hotDiff !== 0 ? hotDiff : b.views7d - a.views7d
  })

  return (
    <div className="p-6 md:p-10">

      {/* ── Header ── */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Merchant Insights
          </p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Phân tích Listing
          </h1>
        </div>
        {sorted.length > 0 && (
          <span className="rounded-full border border-gray-100 bg-white px-4 py-1.5 text-sm font-semibold text-gray-500 shadow-sm dark:border-white/[0.06] dark:bg-[#1C1C1E] dark:text-gray-400">
            {sorted.length} tin đăng
          </span>
        )}
      </div>

      {/* ── Merchant-wide KPI bar ── */}
      {metrics && <MerchantKpiBar m={metrics} />}

      {/* ── Pro upgrade nudge (FREE only) ── */}
      {!canSeeHotLeads && sorted.length > 0 && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[#0071E3]/20 bg-[#0071E3]/5 px-5 py-3 dark:border-[#409CFF]/20 dark:bg-[#409CFF]/10">
          <span className="text-lg" aria-hidden="true">📊</span>
          <p className="m-0 flex-1 text-sm font-medium text-[#0071E3] dark:text-[#409CFF]">
            Nâng cấp Pro để xem lead nóng & rất nóng trong phân tích.
          </p>
          <Link
            href="/nang-cap?reason=analytics"
            className="shrink-0 rounded-full bg-[#0071E3] px-3 py-1.5 text-xs font-semibold text-white no-underline hover:opacity-80"
          >
            Pro →
          </Link>
        </div>
      )}

      {/* ── Summary bar ── */}
      {sorted.length > 0 && <SummaryBar insights={canSeeHotLeads ? sorted : sorted} />}

      {/* ── Empty state ── */}
      {sorted.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center">
          <span className="mb-4 select-none text-5xl opacity-20" aria-hidden="true">📊</span>
          <p className="text-[0.9375rem] text-gray-500 dark:text-gray-400">
            Chưa có dữ liệu phân tích.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Dữ liệu sẽ xuất hiện sau khi bạn đăng tin và hệ thống thu thập tín hiệu.
          </p>
          <Link
            href="/dang-tin"
            className="mt-5 rounded-full bg-[#0071E3] px-5 py-2 text-sm font-semibold text-white no-underline hover:bg-[#0077ED]"
          >
            Đăng tin ngay
          </Link>
        </div>
      )}

      {/* ── Insight cards ── */}
      <div className="space-y-4">
        {sorted.map(i => (
          <InsightCard
            key={i.listingId}
            insight={i}
            completeness={completenessMap.get(i.listingId) ?? null}
          />
        ))}
      </div>

      {/* ── Phase 12: Listing Health Score ── */}
      {perfResult.items.length > 0 && (
        <div className="mt-8">
          <ListingHealthSection performances={perfResult.items} />
        </div>
      )}

      {/* ── Phase 12: Lead Funnel Analytics ── */}
      {(Object.values(stageCounts).some(n => n > 0) || metrics) && (
        <div className="mt-4">
          <LeadFunnelSection
            stageCounts={stageCounts}
            metrics={metrics}
            isPro={canSeeHotLeads}
          />
        </div>
      )}

      {/* ── Phase 12: ROI Analytics ── */}
      {metrics && (
        <div className="mt-4">
          <RoiSection metrics={metrics} isPro={canSeeHotLeads} />
        </div>
      )}

      {/* ── Phase 17: Listing Improvement Recommendations ── */}
      {listingsForRecs.length > 0 && (
        <div className="mt-8">
          <ListingRecommendations listings={listingsForRecs} />
        </div>
      )}

    </div>
  )
}
