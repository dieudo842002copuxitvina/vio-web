import { redirect }           from 'next/navigation'
import { getAgencyForUser }   from '@/features/agency/api/agency.server'
import { getAgencyPipeline }  from '@/features/agency/api/agency-pipeline.server'
import { PipelineBoard }      from '../_components/PipelineBoard'

export const metadata = { title: 'Pipeline khách hàng | VIO AGRI' }

export default async function AgencyPipelinePage() {
  const { agency } = await getAgencyForUser()
  if (!agency) redirect('/dashboard')

  const pipeline = await getAgencyPipeline(agency.id)
  const total    = pipeline.reduce((sum, col) => sum + col.count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Pipeline khách hàng</h1>
        <p className="mt-0.5 text-sm text-neutral-500">{total} khách hàng đang theo dõi</p>
      </div>

      <PipelineBoard columns={pipeline} />

      <p className="text-xs text-neutral-400">
        Mỗi cột hiển thị tối đa 20 khách hàng. Sắp xếp theo điểm tiềm năng giảm dần.
      </p>
    </div>
  )
}
