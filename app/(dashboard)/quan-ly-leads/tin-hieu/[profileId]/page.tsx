import type { Metadata } from 'next'
import Link              from 'next/link'
import { notFound }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import {
  getLeadScores,
  getLeadTimeline,
}                        from '@/features/leads/api/lead-score.server'
import {
  TEMP_LABEL,
  TEMP_COLOR,
  TEMP_EMOJI,
  TEMP_ORDER,
  EVENT_ICON,
  EVENT_LABEL,
}                        from '@/features/leads/types'
import type { LeadTemperature, LeadTimelineEvent } from '@/features/leads/types'

export const metadata: Metadata = { title: 'Chi tiết tín hiệu' }
export const revalidate = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} phút trước`
  const hrs  = Math.floor(mins / 60)
  if (hrs  < 24) return `${hrs} giờ trước`
  const days = Math.floor(hrs  / 24)
  if (days < 30) return `${days} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Timeline item ─────────────────────────────────────────────────────────────

function TimelineItem({
  event,
  isLast,
}: {
  event:  LeadTimelineEvent
  isLast: boolean
}) {
  const icon  = EVENT_ICON[event.eventType]  ?? '•'
  const label = EVENT_LABEL[event.eventType] ?? event.eventType

  return (
    <li className="relative flex gap-4">
      {/* Vertical connector line */}
      {!isLast && (
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-5 top-10 w-px bg-gray-100 dark:bg-white/[0.06]"
        />
      )}

      {/* Icon bubble */}
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-white text-lg shadow-sm dark:border-white/[0.06] dark:bg-[#1C1C1E]">
        <span aria-hidden="true">{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="m-0 text-sm font-semibold text-gray-900 dark:text-white">
              {label}
            </p>
            {event.listingTitle && (
              event.listingSlug ? (
                <Link
                  href={`/dat-nong-nghiep/chi-tiet/${event.listingSlug}`}
                  className="mt-0.5 block text-xs text-[#0071E3] no-underline hover:underline dark:text-[#409CFF]"
                >
                  🌾 {event.listingTitle}
                </Link>
              ) : (
                <p className="m-0 mt-0.5 text-xs text-gray-400">🌾 {event.listingTitle}</p>
              )
            )}
          </div>
          <time dateTime={event.createdAt} className="shrink-0 text-xs text-gray-400">
            {relativeTime(event.createdAt)}
          </time>
        </div>
      </div>
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ profileId: string }>
}

export default async function LeadDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-center text-gray-500">
        Vui lòng đăng nhập.
      </div>
    )
  }

  const { profileId } = await params

  if (!UUID_RE.test(profileId)) notFound()

  // Parallel: scored leads (cached) + live timeline
  const [scores, timeline] = await Promise.all([
    getLeadScores(user.id),
    getLeadTimeline(user.id, profileId),
  ])

  // This profile's entries — might span multiple listings
  const leadEntries = scores.filter(l => l.profileId === profileId)

  if (!leadEntries.length && !timeline.length) notFound()

  // Aggregate across listings: highest temperature, total score
  const bestLead   = [...leadEntries].sort((a, b) => TEMP_ORDER[b.temperature] - TEMP_ORDER[a.temperature])[0]
  const totalScore = leadEntries.reduce((s, l) => s + l.score, 0)
  const temperature: LeadTemperature = bestLead?.temperature ?? 'cold'
  const profileName   = bestLead?.profileName   ?? null
  const profileAvatar = bestLead?.profileAvatar ?? null
  const profilePhone  = bestLead?.profilePhone  ?? null

  return (
    <div className="p-6 md:p-10">

      {/* ── Back ── */}
      <p className="m-0 mb-6 text-sm">
        <Link
          href="/quan-ly-leads/tin-hieu"
          className="text-gray-400 no-underline hover:text-gray-600 dark:hover:text-gray-300"
        >
          ← Tín hiệu hành vi
        </Link>
      </p>

      {/* ── Profile card ── */}
      <div className="mb-8 flex items-center gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_6px_rgb(0,0,0,0.06)] dark:border-white/[0.06] dark:bg-[#1C1C1E]">

        {profileAvatar ? (
          <img
            src={profileAvatar}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-500 select-none dark:bg-gray-800 dark:text-gray-400">
            {initials(profileName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {profileName ?? 'Khách ẩn danh'}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {/* Temperature badge */}
            <span className={[
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
              'text-[0.7rem] font-semibold',
              TEMP_COLOR[temperature],
            ].join(' ')}>
              {TEMP_EMOJI[temperature]} {TEMP_LABEL[temperature]}
            </span>

            {/* Total score */}
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-gray-400">
              Điểm tổng:{' '}
              <span className="text-gray-900 dark:text-white">
                {Math.round(totalScore * 10) / 10}
              </span>
            </span>

            {/* Phone */}
            {profilePhone && (
              <a
                href={`tel:${profilePhone}`}
                className="flex items-center gap-1.5 rounded-full bg-[#34C759]/10 px-3 py-1.5 text-xs font-semibold text-[#34C759] no-underline transition-opacity hover:opacity-80 dark:bg-[#30D158]/15 dark:text-[#30D158]"
              >
                📞 Gọi ngay
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Listings the lead engaged with ── */}
      {leadEntries.length > 0 && (
        <section className="mb-8">
          <h2 className="m-0 mb-3 text-base font-bold text-gray-900 dark:text-white">
            Tin đăng quan tâm
          </h2>
          <ul className="m-0 list-none space-y-2 p-0">
            {[...leadEntries].sort((a, b) => b.score - a.score).map(l => (
              <li key={l.listingId}>
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-white/[0.06] dark:bg-[#1C1C1E]">
                  <span className="text-base" aria-hidden="true">🌾</span>
                  <div className="min-w-0 flex-1">
                    {l.listingSlug ? (
                      <Link
                        href={`/dat-nong-nghiep/chi-tiet/${l.listingSlug}`}
                        className="block truncate text-sm font-semibold text-[#0071E3] no-underline hover:underline dark:text-[#409CFF]"
                      >
                        {l.listingTitle ?? l.listingId}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {l.listingTitle ?? l.listingId}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-gray-900 dark:text-white">
                    {l.score.toFixed(1)}
                  </span>
                  <span className={[
                    'shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold',
                    TEMP_COLOR[l.temperature],
                  ].join(' ')}>
                    {TEMP_EMOJI[l.temperature]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Timeline ── */}
      <section>
        <h2 className="m-0 mb-5 text-base font-bold text-gray-900 dark:text-white">
          Lịch sử tương tác
        </h2>

        {timeline.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400 dark:border-white/[0.08]">
            Chưa có dữ liệu lịch sử trong 90 ngày qua.
          </div>
        ) : (
          <ol className="m-0 list-none p-0">
            {timeline.map((ev, i) => (
              <TimelineItem
                key={ev.id}
                event={ev}
                isLast={i === timeline.length - 1}
              />
            ))}
          </ol>
        )}
      </section>

    </div>
  )
}
