import type { AgencyMetrics } from '@/features/agency/api/agency.server'

const METRIC_CARDS = [
  { key: 'active_listings' as const,  label: 'Tin đang đăng',    suffix: '' },
  { key: 'total_leads'     as const,  label: 'Tổng khách hàng',  suffix: '' },
  { key: 'visit_requests'  as const,  label: 'Lịch xem đất',     suffix: '' },
  { key: 'legal_reviews'   as const,  label: 'Kiểm tra pháp lý', suffix: '' },
  { key: 'leads_won_30d'   as const,  label: 'Thành công (30d)', suffix: '' },
  { key: 'revenue_vnd'     as const,  label: 'Doanh thu',        suffix: ' ₫', format: 'vnd' },
]

function fmt(value: number, format?: string): string {
  if (format === 'vnd') return (value / 1_000_000).toFixed(1) + 'M'
  return value.toLocaleString('vi-VN')
}

export function AgencyMetrics({ metrics }: { metrics: AgencyMetrics | null }) {
  if (!metrics) {
    return (
      <p className="text-sm text-neutral-500">
        Chưa có dữ liệu. Hãy thêm tin đăng để bắt đầu thu thập số liệu.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {METRIC_CARDS.map(({ key, label, format }) => (
        <div key={key} className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium text-neutral-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {fmt(metrics[key], format)}
          </p>
        </div>
      ))}
    </div>
  )
}
