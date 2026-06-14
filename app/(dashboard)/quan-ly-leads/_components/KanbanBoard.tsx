'use client'

import { useOptimistic, useTransition } from 'react'
import { updateLeadStatus }             from '@/app/actions/lead-status'
import type { CrmLead, LeadStage }      from '@/features/merchant/api/merchant.server'
import type { LeadStatus }              from '@/app/actions/lead-status'

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGE_META: Record<LeadStage, {
  label:  string
  dot:    string
  header: string
  colBg:  string
}> = {
  new:       { label: 'Mới',         dot: 'bg-blue-500',   header: 'text-blue-700   dark:text-blue-400',   colBg: 'bg-blue-50/60   dark:bg-blue-900/[0.08]'   },
  contacted: { label: 'Đã liên hệ', dot: 'bg-purple-500', header: 'text-purple-700 dark:text-purple-400', colBg: 'bg-purple-50/60 dark:bg-purple-900/[0.08]' },
  qualified: { label: 'Tiềm năng',  dot: 'bg-amber-500',  header: 'text-amber-700  dark:text-amber-400',  colBg: 'bg-amber-50/60  dark:bg-amber-900/[0.08]'  },
  proposal:  { label: 'Đề xuất',    dot: 'bg-orange-500', header: 'text-orange-700 dark:text-orange-400', colBg: 'bg-orange-50/60 dark:bg-orange-900/[0.08]' },
  won:       { label: 'Thành công', dot: 'bg-green-500',  header: 'text-green-700  dark:text-green-400',  colBg: 'bg-green-50/60  dark:bg-green-900/[0.08]'  },
  lost:      { label: 'Bỏ qua',     dot: 'bg-gray-400',   header: 'text-gray-500',                        colBg: 'bg-gray-50       dark:bg-gray-900/[0.08]'   },
}

// Contextual next-step actions per stage
const NEXT_STAGES: Partial<Record<LeadStage, LeadStage[]>> = {
  new:       ['contacted'],
  contacted: ['qualified', 'lost'],
  qualified: ['proposal',  'lost'],
  proposal:  ['won',       'lost'],
  won:       [],
  lost:      ['new'],
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-orange-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60)  return `${mins}p`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}g`
  return `${Math.floor(hrs / 24)}n`
}

function isDueSoon(isoDate: string | null): boolean {
  if (!isoDate) return false
  return new Date(isoDate).getTime() < Date.now() + 86_400_000
}

// ── KanbanCard ────────────────────────────────────────────────────────────────

function KanbanCard({
  lead,
  onMove,
  canSeeHotLeads = true,
}: {
  lead:           CrmLead
  onMove:         (id: string, stage: LeadStage) => void
  canSeeHotLeads?: boolean
}) {
  const dueSoon    = isDueSoon(lead.next_followup_at)
  const nextStages = NEXT_STAGES[lead.stage] ?? []
  const pDot       = canSeeHotLeads ? PRIORITY_DOT[lead.priority] : undefined

  return (
    <div className={[
      'rounded-xl p-3.5',
      'bg-white dark:bg-[#2C2C2E]',
      'shadow-[0_1px_4px_rgba(0,0,0,0.07)]',
      dueSoon ? 'ring-1 ring-amber-300/70 dark:ring-amber-700/40' : '',
    ].join(' ')}>

      {/* Name + priority dot + time */}
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {pDot && (
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pDot}`} aria-hidden="true" />
          )}
          <p className="m-0 truncate text-[0.875rem] font-semibold text-gray-900 dark:text-white">
            {lead.contact_name ?? 'Khách ẩn danh'}
          </p>
        </div>
        <span className="shrink-0 text-[0.6875rem] tabular-nums text-gray-400">
          {relativeTime(lead.created_at)}
        </span>
      </div>

      {/* Phone — tap to call */}
      {lead.contact_phone && (
        <a
          href={`tel:${lead.contact_phone}`}
          className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-bold text-[#0071E3] no-underline transition-opacity hover:opacity-75 dark:text-[#409CFF]"
        >
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M10.5 8.1c-.8-.3-1.5-.7-2-.9-.3-.2-.7-.1-.9.2l-.4.6C6.3 7.6 5 6.3 4.7 5.3l.6-.5c.3-.2.4-.6.2-.9-.3-.5-.7-1.2-.9-2-.2-.5-.9-.6-1.2-.2-.4.4-1.1 1.1-1.1 2 0 3.5 2.8 6.3 6.3 6.3 1 0 1.8-.7 2.1-1.1.4-.4.3-1-.2-1.2Z" />
          </svg>
          {lead.contact_phone}
        </a>
      )}

      {/* Listing */}
      {lead.listing_title && (
        <p className="mb-2 flex items-center gap-1 truncate text-[0.75rem] text-gray-400">
          <span aria-hidden="true">🌾</span>
          <span className="truncate">{lead.listing_title}</span>
        </p>
      )}

      {/* Followup */}
      {lead.next_followup_at && (
        <p className={[
          'mb-2.5 text-[0.6875rem] font-semibold',
          dueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400',
        ].join(' ')}>
          {dueSoon ? '⏰' : '📅'}{' '}
          {new Date(lead.next_followup_at).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit',
          })}
          {dueSoon && ' — sắp hạn'}
        </p>
      )}

      {/* Stage action buttons */}
      {nextStages.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-gray-100 pt-2.5 dark:border-white/[0.06]">
          {nextStages.map(ns => {
            const isLost = ns === 'lost'
            return (
              <button
                key={ns}
                type="button"
                onClick={() => onMove(lead.id, ns)}
                className={[
                  'flex items-center gap-1 rounded-full px-2.5 py-1',
                  'text-[0.6875rem] font-semibold transition-all active:scale-95',
                  isLost
                    ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-400 dark:hover:bg-white/[0.1]'
                    : 'bg-[#1A4D2E]/8 text-[#1A4D2E] hover:bg-[#1A4D2E]/15 dark:bg-[#34C759]/10 dark:text-[#34C759] dark:hover:bg-[#34C759]/20',
                ].join(' ')}
              >
                {isLost ? '✕' : '→'} {STAGE_META[ns].label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  totalCount,
  hasMore,
  onMove,
  canSeeHotLeads = true,
}: {
  stage:           LeadStage
  leads:           CrmLead[]
  totalCount:      number
  hasMore:         boolean
  onMove:          (id: string, stage: LeadStage) => void
  canSeeHotLeads?: boolean
}) {
  const meta    = STAGE_META[stage]
  const overrun = hasMore ? totalCount - leads.length : 0

  return (
    <div className={[
      'flex w-[272px] shrink-0 flex-col rounded-2xl overflow-hidden',
      meta.colBg,
    ].join(' ')}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
          <span className={`text-[0.8125rem] font-bold ${meta.header}`}>
            {meta.label}
          </span>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[0.6875rem] font-bold text-gray-500 dark:bg-black/20 dark:text-gray-400">
          {totalCount}
        </span>
      </div>

      {/* Cards — independent scroll, clears bottom tab bar on mobile */}
      <div className="flex flex-col gap-2 overflow-y-auto px-3 pb-3 [max-height:calc(100vh-14rem)]">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center opacity-40">
            <p className="text-3xl" aria-hidden="true">👤</p>
            <p className="m-0 mt-1 text-[0.75rem] text-gray-500">Chưa có lead</p>
          </div>
        ) : (
          leads.map(lead => (
            <KanbanCard key={lead.id} lead={lead} onMove={onMove} canSeeHotLeads={canSeeHotLeads} />
          ))
        )}

        {/* Overflow badge */}
        {overrun > 0 && (
          <div className="rounded-xl bg-white/60 px-3 py-2.5 text-center dark:bg-black/10">
            <span className="text-[0.75rem] font-semibold text-gray-400">
              +{overrun} lead khác
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── KanbanBoard ───────────────────────────────────────────────────────────────

export interface KanbanColumnData {
  stage:   LeadStage
  leads:   CrmLead[]
  hasMore: boolean
}

interface Props {
  columns:         KanbanColumnData[]
  stageCounts:     Record<LeadStage, number>
  canSeeHotLeads?: boolean
}

export function KanbanBoard({ columns, stageCounts, canSeeHotLeads = true }: Props) {
  const [, startTransition] = useTransition()

  const [optimisticCols, addOptimistic] = useOptimistic(
    columns,
    (prev, action: { leadId: string; toStage: LeadStage }) => {
      let moved: CrmLead | undefined
      const without = prev.map(col => ({
        ...col,
        leads: col.leads.filter(l => {
          if (l.id === action.leadId) { moved = l; return false }
          return true
        }),
      }))
      if (!moved) return prev
      const updated = { ...moved, stage: action.toStage }
      return without.map(col =>
        col.stage === action.toStage
          ? { ...col, leads: [updated, ...col.leads] }
          : col,
      )
    },
  )

  function moveCard(leadId: string, toStage: LeadStage) {
    startTransition(async () => {
      addOptimistic({ leadId, toStage })
      await updateLeadStatus(leadId, toStage as LeadStatus)
    })
  }

  const activeCount = (stageCounts.new ?? 0) + (stageCounts.contacted ?? 0) +
    (stageCounts.qualified ?? 0) + (stageCounts.proposal ?? 0)

  return (
    <>
      {/* ── Pipeline summary strip ── */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(['new', 'contacted', 'qualified', 'proposal', 'won'] as LeadStage[]).map(s => {
          const meta = STAGE_META[s]
          return (
            <div
              key={s}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5
                         dark:border-white/[0.06] dark:bg-[#1C1C1E]"
            >
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
              <span className="text-[0.8125rem] font-bold text-gray-900 dark:text-white">
                {stageCounts[s] ?? 0}
              </span>
              <span className="text-[0.8125rem] text-gray-400">{meta.label}</span>
            </div>
          )
        })}
        {activeCount > 0 && (
          <span className="ml-auto rounded-full bg-[#0071E3]/8 px-3 py-1.5 text-[0.8125rem] font-bold text-[#0071E3] dark:bg-[#409CFF]/10 dark:text-[#409CFF]">
            {activeCount} đang xử lý
          </span>
        )}
      </div>

      {/* ── Kanban — full-bleed horizontal scroll ── */}
      <div className="-mx-6 overflow-x-auto md:-mx-10">
        <div className="flex gap-3 px-6 pb-6 md:px-10">
          {optimisticCols.map(col => (
            <KanbanColumn
              key={col.stage}
              stage={col.stage}
              leads={col.leads}
              totalCount={stageCounts[col.stage] ?? 0}
              hasMore={col.hasMore}
              onMove={moveCard}
              canSeeHotLeads={canSeeHotLeads}
            />
          ))}
        </div>
      </div>
    </>
  )
}
