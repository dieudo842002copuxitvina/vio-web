import { getOrGenerateListingSummary } from '@/entities/listing/api/ai-summary.server'

export async function AISummarySection({ listingId }: { listingId: string }) {
  const summary = await getOrGenerateListingSummary(listingId)
  if (!summary) return null

  return (
    <section aria-labelledby="ai-summary-heading">
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
                fill="currentColor"/>
            </svg>
          </div>
          <span
            id="ai-summary-heading"
            className="text-[11px] font-bold uppercase tracking-[0.1em] text-violet-600"
          >
            Nhận xét AI
          </span>
        </div>
        <p className="m-0 text-[14px] leading-relaxed text-neutral-700">{summary}</p>
      </div>
    </section>
  )
}
