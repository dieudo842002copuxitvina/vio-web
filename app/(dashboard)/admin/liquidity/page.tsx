import {
  getProvinceLiquidityScores,
  getConversionFunnel,
  getMarketplaceSupplyDemand,
  refreshAllLiquidityScores,
} from '@/features/liquidity/api/liquidity.server'

export const metadata = { title: 'Thanh khoản thị trường | Admin VIO AGRI' }
export const dynamic  = 'force-dynamic'

const GRADE_BADGE: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-neutral-100 text-neutral-600',
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-neutral-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-green-500"
          style={{ width: `${(value / 25) * 100}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-medium text-neutral-700">{value}</span>
    </div>
  )
}

function FunnelStep({ label, count, pct, isFirst }: {
  label: string; count: number; pct: number; isFirst: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-full rounded-t-lg bg-green-500 transition-all"
        style={{ height: `${Math.max(pct, 4)}px`, maxHeight: '120px', minHeight: '4px' }}
      />
      <p className="text-xs font-medium text-neutral-700">{label}</p>
      <p className="text-sm font-bold text-neutral-900">{count.toLocaleString('vi-VN')}</p>
      {!isFirst && (
        <p className="text-xs text-neutral-400">{pct}%</p>
      )}
    </div>
  )
}

export default async function LiquidityPage() {
  const [scores, funnel, supplyDemand] = await Promise.all([
    getProvinceLiquidityScores(20),
    getConversionFunnel(),
    getMarketplaceSupplyDemand(),
  ])

  async function triggerRefresh() {
    'use server'
    await refreshAllLiquidityScores()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Thanh khoản thị trường</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Đo lường sức mua, sức bán và tốc độ giao dịch</p>
        </div>
        <form action={triggerRefresh}>
          <button
            type="submit"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Làm mới điểm
          </button>
        </form>
      </div>

      {/* Supply vs Demand */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">Cung — Cầu toàn thị trường</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Tin đang đăng',    value: supplyDemand.active_listings,  type: 'supply' },
            { label: 'Người bán active', value: supplyDemand.unique_sellers,    type: 'supply' },
            { label: 'Công ty BĐS',      value: supplyDemand.unique_agencies,   type: 'supply' },
            { label: 'Khách hàng (30d)', value: supplyDemand.leads_30d,         type: 'demand' },
            { label: 'Tìm kiếm lưu',     value: supplyDemand.saved_searches,    type: 'demand' },
            { label: 'Tái ghé thăm',     value: supplyDemand.returning_buyers,  type: 'demand' },
          ].map(({ label, value, type }) => (
            <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium text-neutral-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                {value.toLocaleString('vi-VN')}
              </p>
              <p className={`mt-0.5 text-xs ${type === 'supply' ? 'text-blue-600' : 'text-amber-600'}`}>
                {type === 'supply' ? '📦 Cung' : '🙋 Cầu'}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700">
          <span className="font-semibold">{supplyDemand.leads_per_listing}</span>
          <span>khách hàng / tin đăng (30d)</span>
        </div>
      </section>

      {/* Conversion funnel */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">Phễu chuyển đổi (30 ngày)</h2>
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex h-32 items-end gap-2">
            {funnel.map((step, i) => (
              <FunnelStep
                key={step.label}
                label={step.label}
                count={step.count}
                pct={step.pct}
                isFirst={i === 0}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Province leaderboard */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">Bảng xếp hạng tỉnh thành</h2>
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-600">Tỉnh</th>
                <th className="px-4 py-3 text-center font-medium text-neutral-600">Hạng</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">Điểm</th>
                <th className="px-4 py-3 font-medium text-neutral-600">Phân tích</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {scores.map(s => (
                <tr key={s.province_id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-neutral-800">{s.province_name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${GRADE_BADGE[s.grade]}`}>
                      {s.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-700">{s.score}</td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <ScoreBar label="Cung"        value={s.supply_score} />
                      <ScoreBar label="Cầu"         value={s.demand_score} />
                      <ScoreBar label="Hoạt động"   value={s.activity_score} />
                      <ScoreBar label="Chuyển đổi"  value={s.conversion_score} />
                    </div>
                  </td>
                </tr>
              ))}
              {scores.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                    {'Chưa có dữ liệu. Bấm "Làm mới điểm" để tính toán.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
