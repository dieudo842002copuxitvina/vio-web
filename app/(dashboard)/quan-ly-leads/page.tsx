import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import {
  getLeads,
  getLeadStageCounts,
} from '@/features/merchant/api/merchant.server'
import type { LeadStage } from '@/features/merchant/api/merchant.server'
import { getSubscriptionFeatures } from '@/features/billing/api/subscription.server'
import { KanbanBoard }   from './_components/KanbanBoard'
import type { KanbanColumnData } from './_components/KanbanBoard'

export const metadata: Metadata = { title: 'CRM — Khách hàng & Leads' }
export const revalidate = 0

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-center text-gray-500">
        Vui lòng đăng nhập để xem CRM.
      </div>
    )
  }

  // Parallel: 5 stage slices (25 cards each) + count + subscription features
  const [newR, contactedR, qualifiedR, proposalR, wonR, stageCounts, features] = await Promise.all([
    getLeads(user.id, { stage: 'new',       limit: 25 }),
    getLeads(user.id, { stage: 'contacted', limit: 25 }),
    getLeads(user.id, { stage: 'qualified', limit: 25 }),
    getLeads(user.id, { stage: 'proposal',  limit: 25 }),
    getLeads(user.id, { stage: 'won',       limit: 15 }),
    getLeadStageCounts(user.id),
    getSubscriptionFeatures(user.id),
  ])

  const canSeeHotLeads = features.hotLeads

  const columns: KanbanColumnData[] = [
    { stage: 'new',       leads: newR.leads,       hasMore: newR.nextCursor       !== null },
    { stage: 'contacted', leads: contactedR.leads, hasMore: contactedR.nextCursor !== null },
    { stage: 'qualified', leads: qualifiedR.leads, hasMore: qualifiedR.nextCursor !== null },
    { stage: 'proposal',  leads: proposalR.leads,  hasMore: proposalR.nextCursor  !== null },
    { stage: 'won',       leads: wonR.leads,        hasMore: wonR.nextCursor       !== null },
  ]

  const totalLeads = Object.values(stageCounts).reduce((s, n) => s + n, 0)

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
        {totalLeads > 0 && (
          <span className="rounded-full border border-gray-100 bg-white px-4 py-1.5 text-sm font-semibold text-gray-500 shadow-sm dark:border-white/[0.06] dark:bg-[#1C1C1E] dark:text-gray-400">
            {totalLeads} leads
          </span>
        )}
      </div>

      {/* ── Empty state ── */}
      {totalLeads === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="m-0 text-[15px] font-semibold text-gray-700">Chưa có lead nào</p>
          <p className="m-0 mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-gray-400">
            Leads xuất hiện khi người mua liên hệ qua tin đăng của bạn.
          </p>
          <Link
            href="/tin-dang-cua-toi"
            className="mt-5 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-gray-600 no-underline hover:bg-gray-50"
          >
            Xem mẹo tăng tương tác
          </Link>
        </div>
      )}

      {/* ── Kanban board ── */}
      {totalLeads > 0 && (
        <KanbanBoard
          columns={columns}
          stageCounts={stageCounts as Record<LeadStage, number>}
          canSeeHotLeads={canSeeHotLeads}
        />
      )}

    </div>
  )
}
