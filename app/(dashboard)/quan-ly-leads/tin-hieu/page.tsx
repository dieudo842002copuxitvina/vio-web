import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { getLeadScores } from '@/features/leads/api/lead-score.server'
import { getSubscriptionFeatures } from '@/features/billing/api/subscription.server'
import {
  TEMP_LABEL,
  TEMP_COLOR,
  TEMP_EMOJI,
  TEMP_ORDER,
  TEMP_DOT_COLOR,
}                        from '@/features/leads/types'
import type { BehavioralLead, LeadTemperature } from '@/features/leads/types'

export const metadata: Metadata = { title: 'Tín hiệu hành vi' }
export const revalidate = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24) return `${hrs} giờ trước`
  return `${Math.floor(hrs / 24)} ngày trước`
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TemperatureBadge({ temp }: { temp: LeadTemperature }) {
  return (
    <span className={[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
      'text-[0.7rem] font-semibold whitespace-nowrap',
      TEMP_COLOR[temp],
    ].join(' ')}>
      {TEMP_EMOJI[temp]} {TEMP_LABEL[temp]}
    </span>
  )
}

function LeadScoreCard({ lead }: { lead: BehavioralLead }) {
  return (
    <li>
      <Link
        href={`/quan-ly-leads/tin-hieu/${lead.profileId}`}
        className={[
          'flex flex-col gap-4 rounded-2xl border p-5',
          'no-underline shadow-sm transition-all',
          'border-gray-100 bg-white',
          'hover:border-gray-200 hover:shadow-md',
          'dark:border-white/[0.06] dark:bg-[#1C1C1E] dark:hover:border-white/[0.12]',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {lead.profileAvatar ? (
              <img src={lead.profileAvatar} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500 select-none dark:bg-gray-800 dark:text-gray-400">
                {initials(lead.profileName)}
              </div>
            )}
            <span
              className={['absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#1C1C1E]', TEMP_DOT_COLOR[lead.temperature]].join(' ')}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 font-bold text-gray-900 dark:text-white truncate">
              {lead.profileName ?? 'Khách ẩn danh'}
            </p>
            <p className="m-0 mt-0.5 text-xs text-gray-400">
              Hoạt động {relativeTime(lead.lastActivityAt)}
            </p>
          </div>
          <TemperatureBadge temp={lead.temperature} />
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/[0.06]" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-gray-400">Điểm</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{lead.score.toFixed(1)}</span>
          </div>
          {lead.listingTitle && (
            <span className="ml-auto max-w-[160px] truncate text-xs font-medium text-gray-500 dark:text-gray-400">
              🌾 {lead.listingTitle}
            </span>
          )}
        </div>
      </Link>
    </li>
  )
}

// ── Locked banner for FREE users ─────────────────────────────────────────────

function LockedBanner() {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[#0071E3]/20 bg-[#0071E3]/5 px-5 py-4 dark:border-[#409CFF]/20 dark:bg-[#409CFF]/10">
      <span className="shrink-0 text-2xl" aria-hidden="true">🔒</span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold text-[#0071E3] dark:text-[#409CFF]">
          Lead nóng & rất nóng chỉ dành cho Pro
        </p>
        <p className="m-0 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Nâng cấp để xem toàn bộ tín hiệu cao giá trị.
        </p>
      </div>
      <Link
        href="/nang-cap?reason=hot_leads"
        className="shrink-0 rounded-full bg-[#0071E3] px-4 py-2 text-xs font-semibold text-white no-underline hover:opacity-80"
      >
        Nâng cấp
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TinHieuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-center text-gray-500">
        Vui lòng đăng nhập để xem tín hiệu.
      </div>
    )
  }

  const [leads, features] = await Promise.all([
    getLeadScores(user.id),
    getSubscriptionFeatures(user.id),
  ])

  const canSeeHotLeads = features.hotLeads

  // For FREE users: filter out very_hot from the visible list (hide, not just blur)
  const visibleLeads = canSeeHotLeads
    ? leads
    : leads.filter(l => l.temperature !== 'very_hot' && l.temperature !== 'hot')

  const sorted = [...visibleLeads].sort((a, b) => {
    const td = TEMP_ORDER[b.temperature] - TEMP_ORDER[a.temperature]
    return td !== 0 ? td : b.score - a.score
  })

  const counts: Record<LeadTemperature, number> = { very_hot: 0, hot: 0, warm: 0, cold: 0 }
  for (const l of leads) counts[l.temperature]++

  const hiddenHotCount = canSeeHotLeads ? 0 : (counts.very_hot + counts.hot)

  return (
    <div className="p-6 md:p-10">

      {/* ── Header ── */}
      <div className="mb-2 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
            Lead Intelligence
          </p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Tín hiệu hành vi
          </h1>
        </div>
        {leads.length > 0 && (
          <span className="rounded-full border border-gray-100 bg-white px-4 py-1.5 text-sm font-semibold text-gray-500 shadow-sm dark:border-white/[0.06] dark:bg-[#1C1C1E] dark:text-gray-400">
            {leads.length} tín hiệu
          </span>
        )}
      </div>

      <p className="m-0 mb-6 text-sm">
        <Link href="/quan-ly-leads" className="text-gray-400 no-underline hover:text-gray-600 dark:hover:text-gray-300">
          ← CRM Leads
        </Link>
      </p>

      {/* ── Pro gate banner (FREE only, when there are hidden hot leads) ── */}
      {!canSeeHotLeads && hiddenHotCount > 0 && <LockedBanner />}

      {/* ── Temperature summary ── */}
      {leads.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['very_hot', 'hot', 'warm', 'cold'] as LeadTemperature[]).map(temp => {
            const isLocked = !canSeeHotLeads && (temp === 'very_hot' || temp === 'hot')
            return (
              <div
                key={temp}
                className={[
                  'flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-center',
                  isLocked
                    ? 'border-dashed border-gray-200 bg-gray-50/50 dark:border-white/[0.04] dark:bg-white/[0.02]'
                    : 'border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#1C1C1E]',
                ].join(' ')}
              >
                <span className={`text-xl select-none ${isLocked ? 'opacity-30' : ''}`} aria-hidden="true">
                  {isLocked ? '🔒' : TEMP_EMOJI[temp]}
                </span>
                <span className={`text-2xl font-bold ${isLocked ? 'text-gray-300 dark:text-gray-700' : 'text-gray-900 dark:text-white'}`}>
                  {isLocked ? '?' : counts[temp]}
                </span>
                <span className="text-[0.7rem] font-medium leading-tight text-gray-400">{TEMP_LABEL[temp]}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {sorted.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center">
          <span className="mb-4 select-none text-5xl opacity-20" aria-hidden="true">📡</span>
          <p className="text-[0.9375rem] text-gray-500 dark:text-gray-400">
            {canSeeHotLeads
              ? 'Chưa có tín hiệu hành vi.'
              : 'Chưa có tín hiệu ấm hoặc lạnh. Nâng cấp Pro để xem lead nóng.'}
          </p>
        </div>
      )}

      {/* ── Lead cards ── */}
      <ul className="grid grid-cols-1 gap-4 list-none m-0 p-0 lg:grid-cols-2">
        {sorted.map(lead => (
          <LeadScoreCard key={`${lead.profileId}:${lead.listingId}`} lead={lead} />
        ))}
      </ul>

    </div>
  )
}
