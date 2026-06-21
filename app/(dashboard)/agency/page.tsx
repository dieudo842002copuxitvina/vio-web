import { redirect }           from 'next/navigation'
import Link                    from 'next/link'
import { getAgencyForUser, refreshAgencyMetrics } from '@/features/agency/api/agency.server'
import { getAgencyPipeline }   from '@/features/agency/api/agency-pipeline.server'
import { AgencyMetrics }       from './_components/AgencyMetrics'
import { PipelineBoard }       from './_components/PipelineBoard'

export const metadata = { title: 'Tổng quan công ty | VIO AGRI' }

export default async function AgencyDashboardPage() {
  const { agency, metrics } = await getAgencyForUser()

  if (!agency) {
    redirect('/dashboard')
  }

  // Refresh metrics on load (lightweight SECURITY DEFINER function)
  await refreshAgencyMetrics(agency.id)
  const freshMetrics = metrics

  const pipeline = await getAgencyPipeline(agency.id)

  const VERIFICATION_BADGE: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-700',
    verified:  'bg-emerald-100 text-emerald-700',
    suspended: 'bg-red-100 text-red-700',
  }

  const VERIFICATION_LABEL: Record<string, string> = {
    pending:   'Đang chờ xác minh',
    verified:  'Đã xác minh',
    suspended: 'Đã tạm dừng',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-900">{agency.company_name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERIFICATION_BADGE[agency.verification_status]}`}>
              {VERIFICATION_LABEL[agency.verification_status]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-neutral-500">
            Đại diện: {agency.representative_name} · {agency.phone}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/agency/team"
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Quản lý nhóm
          </Link>
          <Link
            href="/agency/pipeline"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Pipeline
          </Link>
        </div>
      </div>

      {/* KPI Metrics */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">Số liệu tổng quan</h2>
        <AgencyMetrics metrics={freshMetrics} />
      </section>

      {/* Pipeline preview (first 4 stages) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-600">Pipeline khách hàng</h2>
          <Link href="/agency/pipeline" className="text-xs text-green-600 hover:underline">
            Xem đầy đủ →
          </Link>
        </div>
        <PipelineBoard columns={pipeline.slice(0, 4)} />
      </section>
    </div>
  )
}
