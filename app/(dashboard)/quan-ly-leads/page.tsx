import type { Metadata }    from 'next'
import Link                  from 'next/link'
import { getLeads, getLeadStageCounts } from '@/features/merchant/api/merchant.server'
import { LeadStatusDropdown }           from './_components/lead-status-dropdown'
import type { LeadStage, CrmLead }      from '@/features/merchant/api/merchant.server'
import { createClient }                 from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Khách hàng & Leads' }
export const revalidate = 0

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<LeadStage, string> = {
  new:       'Mới',
  contacted: 'Đã liên hệ',
  qualified: 'Tiềm năng',
  proposal:  'Đề xuất',
  won:       'Thành công',
  lost:      'Bỏ qua',
}

const STAGE_COLORS: Record<LeadStage, string> = {
  new:       'bg-blue-50   text-blue-700   dark:bg-blue-900/20   dark:text-blue-300',
  contacted: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  qualified: 'bg-amber-50  text-amber-700  dark:bg-amber-900/20  dark:text-amber-300',
  proposal:  'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  won:       'bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-300',
  lost:      'bg-gray-50   text-gray-500   dark:bg-gray-900/20   dark:text-gray-400',
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-orange-400',
  normal: 'bg-transparent',
  low:    'bg-transparent',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins <  60) return `${mins} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs  <  24) return `${hrs} giờ trước`
  return `${Math.floor(hrs / 24)} ngày trước`
}

function isDueSoon(isoDate: string | null): boolean {
  if (!isoDate) return false
  return new Date(isoDate).getTime() < Date.now() + 86_400_000
}

// ── Page props ────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    stage?:  string
    cursor?: string
  }>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeadsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-center text-gray-500">
        Vui lòng đăng nhập để xem danh sách leads.
      </div>
    )
  }

  const params    = await searchParams
  const rawStage  = params.stage
  const stage     = (rawStage && rawStage in STAGE_LABELS) ? rawStage as LeadStage | 'all' : 'all'
  const rawCursor = params.cursor

  // Decode cursor from base64 URL param
  let cursor: { createdAt: string; id: string } | undefined
  if (rawCursor) {
    try {
      const decoded = JSON.parse(Buffer.from(rawCursor, 'base64').toString())
      if (decoded.createdAt && decoded.id) cursor = decoded
    } catch { /* invalid cursor — ignore */ }
  }

  // Parallel: fetch lead page + stage counts in one round-trip each
  const [{ leads, nextCursor }, stageCounts] = await Promise.all([
    getLeads(user.id, { stage, limit: 20, cursor }),
    getLeadStageCounts(user.id),
  ])

  const totalActive = stageCounts.new + stageCounts.contacted +
    stageCounts.qualified + stageCounts.proposal

  // Encode next cursor for URL
  const nextCursorParam = nextCursor
    ? Buffer.from(JSON.stringify(nextCursor)).toString('base64')
    : null

  const buildUrl = (s: string, c?: string | null) => {
    const p = new URLSearchParams()
    if (s && s !== 'all') p.set('stage', s)
    if (c) p.set('cursor', c)
    const qs = p.toString()
    return `/quan-ly-leads${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-6 md:p-10">

      {/* ── Header ── */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Mini CRM
          </p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Khách hàng &amp; Leads
          </h1>
        </div>
        {totalActive > 0 && (
          <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-gray-500 shadow-sm border border-gray-100 dark:bg-[#1C1C1E] dark:border-white/[0.06] dark:text-gray-400">
            {totalActive} đang xử lý
          </span>
        )}
      </div>

      {/* ── Pipeline summary ── */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {(Object.keys(STAGE_LABELS) as LeadStage[]).map(s => (
          <Link
            key={s}
            href={buildUrl(s === stage ? 'all' : s)}
            className={[
              'flex flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 text-center no-underline transition-all',
              stage === s
                ? 'border-[#0071E3] bg-[#0071E3]/5 dark:border-[#409CFF]/50 dark:bg-[#409CFF]/10'
                : 'border-gray-100 bg-white hover:border-gray-200 dark:border-white/[0.06] dark:bg-[#1C1C1E]',
            ].join(' ')}
          >
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {stageCounts[s]}
            </span>
            <span className="text-[0.7rem] font-medium text-gray-400 leading-tight">
              {STAGE_LABELS[s]}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Empty state ── */}
      {leads.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center">
          <span className="mb-4 text-5xl opacity-20 select-none" aria-hidden="true">📭</span>
          <p className="text-gray-500 dark:text-gray-400">
            {stage === 'all'
              ? 'Chưa có lead nào. Khi khách hàng gửi yêu cầu, chúng sẽ xuất hiện ở đây.'
              : `Không có lead nào ở giai đoạn "${STAGE_LABELS[stage as LeadStage]}".`}
          </p>
        </div>
      )}

      {/* ── Lead cards ── */}
      <ul className="grid grid-cols-1 gap-4 list-none m-0 p-0 lg:grid-cols-2">
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </ul>

      {/* ── Pagination ── */}
      {(nextCursorParam || cursor) && (
        <div className="mt-8 flex items-center justify-between gap-4">
          {cursor ? (
            <Link
              href={buildUrl(stage)}
              className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-600 no-underline shadow-sm hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#1C1C1E] dark:text-gray-300"
            >
              Trang đầu
            </Link>
          ) : <div />}

          {nextCursorParam && (
            <Link
              href={buildUrl(stage, nextCursorParam)}
              className="ml-auto rounded-full bg-[#0071E3] px-5 py-2 text-sm font-semibold text-white no-underline shadow-sm hover:bg-[#0077ED]"
            >
              Tiếp theo
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ── LeadCard component ────────────────────────────────────────────────────────

function LeadCard({ lead }: { lead: CrmLead }) {
  const dueSoon     = isDueSoon(lead.next_followup_at)
  const priorityDot = PRIORITY_DOT[lead.priority] ?? 'bg-transparent'

  return (
    <li>
      <article className={[
        'flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition-colors',
        dueSoon
          ? 'border-amber-200 bg-amber-50/60 dark:border-amber-700/30 dark:bg-amber-900/10'
          : 'border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#1C1C1E]',
      ].join(' ')}>

        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {priorityDot !== 'bg-transparent' && (
              <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot}`} aria-label="Priority" />
            )}
            <div className="min-w-0">
              <p className="m-0 font-bold text-gray-900 dark:text-white truncate">
                {lead.contact_name ?? 'Khách ẩn danh'}
              </p>
              <p className="m-0 mt-0.5 text-xs text-gray-400">
                {relativeTime(lead.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${STAGE_COLORS[lead.stage]}`}>
              {STAGE_LABELS[lead.stage]}
            </span>
            <LeadStatusDropdown
              inquiryId={lead.inquiry_id ?? lead.id}
              currentStatus={lead.stage}
            />
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/[0.06]" />

        {/* Phone */}
        {lead.contact_phone && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400" aria-hidden="true">📞</span>
              <span className="font-bold text-gray-900 dark:text-white tracking-wide">
                {lead.contact_phone}
              </span>
            </div>
            <a
              href={`tel:${lead.contact_phone}`}
              className="flex items-center gap-1.5 rounded-full bg-[#34C759]/10 px-3 py-1.5 text-xs font-semibold text-[#34C759] no-underline transition-opacity hover:opacity-80 dark:bg-[#30D158]/15 dark:text-[#30D158]"
            >
              Gọi ngay
            </a>
          </div>
        )}

        {/* Followup reminder */}
        {lead.next_followup_at && (
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">{dueSoon ? '⏰' : '📅'}</span>
            <span className={`text-xs font-semibold ${dueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
              Followup: {new Date(lead.next_followup_at).toLocaleDateString('vi-VN')}
              {dueSoon && ' — sắp đến hạn'}
            </span>
          </div>
        )}

        {/* Listing link */}
        {lead.listing_title && lead.listing_slug && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400" aria-hidden="true">🌾</span>
            <Link
              href={`/dat-nong-nghiep/chi-tiet/${lead.listing_slug}`}
              className="truncate text-sm font-medium text-[#0071E3] no-underline hover:underline dark:text-[#409CFF]"
            >
              {lead.listing_title}
            </Link>
          </div>
        )}

      </article>
    </li>
  )
}
