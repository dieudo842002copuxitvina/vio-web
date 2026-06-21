import { getEcosystemClickStats } from '@/features/admin/api/cross-product.server'
import Link                        from 'next/link'

export const metadata = { title: 'Hệ sinh thái | Admin VIO AGRI' }
export const dynamic  = 'force-dynamic'

export default async function EcosystemPage() {
  const stats = await getEcosystemClickStats(30)

  const totalClicks = stats.total_local_clicks + stats.total_export_clicks
  const localPct    = totalClicks > 0 ? Math.round((stats.total_local_clicks  / totalClicks) * 100) : 0
  const exportPct   = totalClicks > 0 ? Math.round((stats.total_export_clicks / totalClicks) * 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Hệ sinh thái VIO</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Theo dõi lượt nhấn sang VIO LOCAL và VIO EXPORT từ trang tin đất nông nghiệp
        </p>
      </div>

      {/* Journey diagram */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-center gap-4 text-center">
          {[
            { name: 'VIO AGRI',  color: 'bg-green-600', desc: 'Đất nông nghiệp', current: true },
            { name: '→',         color: 'text-neutral-400', desc: '',              current: false },
            { name: 'VIO LOCAL', color: 'bg-blue-600',  desc: 'Dịch vụ nông nghiệp địa phương', current: false },
            { name: '→',         color: 'text-neutral-400', desc: '',              current: false },
            { name: 'VIO EXPORT',color: 'bg-amber-500', desc: 'Xuất khẩu nông sản', current: false },
          ].map((node, i) => (
            node.name === '→' ? (
              <span key={i} className="text-2xl text-neutral-300">→</span>
            ) : (
              <div key={i} className={`rounded-xl px-4 py-3 text-white ${node.color} ${node.current ? 'ring-2 ring-offset-2 ring-green-400' : ''}`}>
                <p className="font-bold">{node.name}</p>
                {node.desc && <p className="text-xs opacity-80">{node.desc}</p>}
              </div>
            )
          ))}
        </div>
      </section>

      {/* Click KPIs */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">Lượt nhấn 30 ngày qua</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-medium text-neutral-500">Tổng lượt nhấn</p>
            <p className="mt-1 text-3xl font-bold text-neutral-900">{totalClicks.toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-medium text-blue-600">AGRI → LOCAL</p>
            <p className="mt-1 text-3xl font-bold text-blue-900">
              {stats.total_local_clicks.toLocaleString('vi-VN')}
            </p>
            <p className="mt-1 text-sm text-blue-600">{localPct}% tổng nhấn</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-medium text-amber-600">AGRI → EXPORT</p>
            <p className="mt-1 text-3xl font-bold text-amber-900">
              {stats.total_export_clicks.toLocaleString('vi-VN')}
            </p>
            <p className="mt-1 text-sm text-amber-600">{exportPct}% tổng nhấn</p>
          </div>
        </div>
      </section>

      {/* Top listings */}
      {stats.top_listings.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Tin đăng dẫn nhiều nhấn nhất</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Tin đăng</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-600">Lượt nhấn ecosystem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {stats.top_listings.map(l => (
                  <tr key={l.listing_id} className="bg-white">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800">{l.title ?? l.listing_id.slice(0, 8)}</p>
                      {l.slug && (
                        <Link href={`/dat/${l.slug}`} className="text-xs text-green-600 hover:underline" target="_blank">
                          /dat/{l.slug} →
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-700">{l.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Top provinces */}
      {stats.top_provinces.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Top tỉnh ecosystem</h2>
          <div className="grid gap-2">
            {stats.top_provinces.map(p => (
              <div key={p.province_slug} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <span className="font-medium text-neutral-800">{p.province_name}</span>
                <span className="text-sm text-neutral-500">{p.clicks} lượt</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {totalClicks === 0 && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-center">
          <p className="text-neutral-500">
            Chưa ghi nhận lượt nhấn ecosystem. CrossSellBanner và ExportOpportunities cần được hiển thị
            trên trang tin đất để bắt đầu thu thập dữ liệu.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        Monetization VIO LOCAL / VIO EXPORT — đang phát triển. Dữ liệu click hiện tại để đánh giá demand trước khi launch.
      </div>
    </div>
  )
}
