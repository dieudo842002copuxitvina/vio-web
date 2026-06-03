import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { getMerchantInsights } from '@/features/merchant/api/merchant-insights.server'
import { getSubscriptionFeatures } from '@/features/billing/api/subscription.server'
import type { ListingInsight } from '@/features/merchant/api/merchant-insights.server'

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

// ── Insight Card ─────────────────────────────────────────────────────────────

function InsightCard({ insight: i }: { insight: ListingInsight }) {
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

  const [insights, features] = await Promise.all([
    getMerchantInsights(user.id),
    getSubscriptionFeatures(user.id),
  ])

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
          <InsightCard key={i.listingId} insight={i} />
        ))}
      </div>

    </div>
  )
}
