import type { Metadata } from 'next'
import { createClient }  from '@/lib/supabase/server'
import {
  getLeads,
  getLeadStageCounts,
} from '@/features/merchant/api/merchant.server'
import type { LeadStage } from '@/features/merchant/api/merchant.server'
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

  // Parallel: 5 stage slices (25 cards each) + 1 count query
  const [newR, contactedR, qualifiedR, proposalR, wonR, stageCounts] = await Promise.all([
    getLeads(user.id, { stage: 'new',       limit: 25 }),
    getLeads(user.id, { stage: 'contacted', limit: 25 }),
    getLeads(user.id, { stage: 'qualified', limit: 25 }),
    getLeads(user.id, { stage: 'proposal',  limit: 25 }),
    getLeads(user.id, { stage: 'won',       limit: 15 }),
    getLeadStageCounts(user.id),
  ])

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

      {/* ── Kanban board ── */}
      <KanbanBoard columns={columns} stageCounts={stageCounts as Record<LeadStage, number>} />

    </div>
  )
}
