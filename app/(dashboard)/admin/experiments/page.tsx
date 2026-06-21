import {
  getExperiments,
  getExperimentStats,
  createExperiment,
  startExperiment,
  endExperiment,
} from '@/features/experiments/api/experiments.server'
import type { PricingExperiment, ExperimentStats } from '@/features/experiments/api/experiments.server'
import { createClient }                               from '@/lib/supabase/server'
import { PRODUCT_CATALOG }                          from '@/features/billing/api/billing-constants'

export const metadata = { title: 'Thử nghiệm giá | Admin VIO AGRI' }
export const dynamic  = 'force-dynamic'

const STATUS_BADGE: Record<string, string> = {
  draft:   'bg-neutral-100 text-neutral-600',
  running: 'bg-emerald-100 text-emerald-700',
  paused:  'bg-amber-100 text-amber-700',
  ended:   'bg-neutral-200 text-neutral-500',
}

const STATUS_LABEL: Record<string, string> = {
  draft:   'Nháp',
  running: 'Đang chạy',
  paused:  'Tạm dừng',
  ended:   'Đã kết thúc',
}

function fmtVnd(n: number): string {
  return (n / 1_000).toFixed(0) + 'K ₫'
}

function ConversionCompare({
  a, b,
}: {
  a: ExperimentStats | undefined
  b: ExperimentStats | undefined
}) {
  if (!a && !b) return <p className="text-xs text-neutral-400">Chưa có dữ liệu</p>

  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { label: 'Variant A', stat: a },
        { label: 'Variant B', stat: b },
      ].map(({ label, stat }) => (
        <div key={label} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
          <p className="text-xs font-semibold text-neutral-500">{label}</p>
          <p className="text-lg font-bold text-neutral-900">{stat?.conversion_rate ?? 0}%</p>
          <p className="text-xs text-neutral-400">
            {stat?.completions ?? 0}/{stat?.checkouts ?? 0} đơn
          </p>
          <p className="mt-1 text-sm font-medium text-green-700">
            {fmtVnd(stat?.revenue_vnd ?? 0)}
          </p>
        </div>
      ))}
    </div>
  )
}

async function ExperimentCard({ exp }: { exp: PricingExperiment }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminId = user?.id ?? ''

  const stats = exp.status !== 'draft' ? await getExperimentStats(exp.id) : []
  const statA = stats.find(s => s.variant === 'a')
  const statB = stats.find(s => s.variant === 'b')

  async function handleStart() {
    'use server'
    await startExperiment(exp.id, adminId)
  }

  async function handleEnd() {
    'use server'
    await endExperiment(exp.id, adminId)
  }

  const productLabel = PRODUCT_CATALOG[exp.product_type]?.label ?? exp.product_type

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-900">{exp.experiment_name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[exp.status]}`}>
              {STATUS_LABEL[exp.status]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-neutral-500">{productLabel}</p>
        </div>
        <div className="flex gap-2">
          {exp.status === 'draft' && (
            <form action={handleStart}>
              <button type="submit" className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                Chạy
              </button>
            </form>
          )}
          {exp.status === 'running' && (
            <form action={handleEnd}>
              <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                Kết thúc
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-xs text-blue-600">{exp.variant_a_label}</p>
          <p className="text-xl font-bold text-blue-900">{fmtVnd(exp.variant_a_price)}</p>
          <p className="text-xs text-blue-500">{100 - exp.traffic_split_pct}% traffic</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-center">
          <p className="text-xs text-amber-600">{exp.variant_b_label}</p>
          <p className="text-xl font-bold text-amber-900">{fmtVnd(exp.variant_b_price)}</p>
          <p className="text-xs text-amber-500">{exp.traffic_split_pct}% traffic</p>
        </div>
      </div>

      {exp.status !== 'draft' && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-neutral-500">Kết quả</p>
          <ConversionCompare a={statA} b={statB} />
        </div>
      )}
    </div>
  )
}

export default async function ExperimentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminId = user?.id ?? ''

  const experiments = await getExperiments()
  const running = experiments.filter(e => e.status === 'running')
  const draft   = experiments.filter(e => e.status === 'draft')
  const ended   = experiments.filter(e => e.status === 'ended')

  async function handleCreate(formData: FormData) {
    'use server'
    await createExperiment(
      {
        experiment_name:   formData.get('name') as string,
        product_type:      formData.get('product') as keyof typeof PRODUCT_CATALOG,
        variant_a_price:   Number(formData.get('price_a')) * 1000,
        variant_a_label:   'Control',
        variant_b_price:   Number(formData.get('price_b')) * 1000,
        variant_b_label:   'Treatment',
        traffic_split_pct: Number(formData.get('split') ?? 50),
      },
      adminId,
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Thử nghiệm giá A/B</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Kiểm thử mức giá khác nhau mà không cần thay code
        </p>
      </div>

      {/* Create form */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">Tạo thử nghiệm mới</h2>
        <form action={handleCreate} className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
          <input
            name="name"
            placeholder="Tên thử nghiệm"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
          <select
            name="product"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            {Object.entries(PRODUCT_CATALOG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              name="price_a"
              type="number"
              placeholder="Giá A (K ₫)"
              required
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <input
              name="price_b"
              type="number"
              placeholder="Giá B (K ₫)"
              required
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <input
            name="split"
            type="number"
            defaultValue="50"
            min="10"
            max="90"
            placeholder="% traffic B"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Tạo
          </button>
        </form>
      </section>

      {/* Running */}
      {running.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Đang chạy</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {running.map(e => <ExperimentCard key={e.id} exp={e} />)}
          </div>
        </section>
      )}

      {/* Draft */}
      {draft.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Nháp</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {draft.map(e => <ExperimentCard key={e.id} exp={e} />)}
          </div>
        </section>
      )}

      {/* Ended */}
      {ended.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Đã kết thúc</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {ended.map(e => <ExperimentCard key={e.id} exp={e} />)}
          </div>
        </section>
      )}

      {experiments.length === 0 && (
        <p className="text-sm text-neutral-400">Chưa có thử nghiệm nào. Tạo thử nghiệm đầu tiên bên trên.</p>
      )}
    </div>
  )
}
