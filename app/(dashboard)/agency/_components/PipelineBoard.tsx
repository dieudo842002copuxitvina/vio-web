import Link from 'next/link'
import type { PipelineColumn, PipelineLead } from '@/features/agency/api/agency-pipeline.server'

const SCORE_BADGE = (score: number) => {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700'
  if (score >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-neutral-100 text-neutral-600'
}

function LeadCard({ lead }: { lead: PipelineLead }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-1 text-xs font-medium text-neutral-800">
          {lead.listing?.title ?? lead.listing_id.slice(0, 8)}
        </p>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold ${SCORE_BADGE(lead.score)}`}>
          {lead.score}
        </span>
      </div>
      {lead.buyer_profile?.full_name && (
        <p className="mt-1 text-xs text-neutral-500">{lead.buyer_profile.full_name}</p>
      )}
      {lead.listing?.price_text && (
        <p className="mt-1 text-xs font-medium text-green-700">{lead.listing.price_text}</p>
      )}
      {lead.listing?.slug && (
        <Link
          href={`/dat/${lead.listing.slug}`}
          className="mt-2 block text-xs text-blue-600 hover:underline"
          target="_blank"
        >
          Xem tin →
        </Link>
      )}
    </div>
  )
}

export function PipelineBoard({ columns }: { columns: PipelineColumn[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {columns.map(col => (
        <div key={col.stage} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-neutral-700">{col.label}</h3>
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">
              {col.count}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {col.leads.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-200 p-3 text-center text-xs text-neutral-400">
                Không có
              </p>
            ) : (
              col.leads.map(lead => <LeadCard key={lead.id} lead={lead} />)
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
