import type { Metadata }     from 'next'
import Link                   from 'next/link'
import {
  detectDuplicatePhones,
  detectPriceOutliers,
  detectVelocityAbuse,
} from '@/features/admin/api/fraud.server'

export const metadata: Metadata = {
  title:  'Gian lận — Admin VIO AGRI',
  robots: { index: false, follow: false },
}
export const revalidate = 300  // refresh every 5 min

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="m-0 text-[17px] font-bold text-gray-900 dark:text-white">{title}</h2>
      {count > 0 && (
        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </div>
  )
}

export default async function AdminFraudPage() {
  const [dupePhones, priceOutliers, velocityAbuse] = await Promise.all([
    detectDuplicatePhones(),
    detectPriceOutliers(),
    detectVelocityAbuse(),
  ])

  return (
    <div className="p-6 md:p-10">

      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 no-underline hover:text-gray-600"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Admin OS
        </Link>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Phát hiện gian lận
        </h1>
        <p className="m-0 mt-1 text-[13px] text-gray-500">
          {dupePhones.length + priceOutliers.length + velocityAbuse.length} tín hiệu phát hiện
        </p>
      </div>

      {/* ── Duplicate Phones ── */}
      <section className="mb-10">
        <SectionHeader title="Số điện thoại trùng lặp" count={dupePhones.length}/>
        {dupePhones.length === 0 ? (
          <p className="text-[13px] text-gray-400">Không phát hiện số điện thoại trùng từ nhiều chủ sở hữu.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.06]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Số điện thoại', 'Chủ sở hữu', 'Tin đăng'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dupePhones.map(d => (
                  <tr key={d.contact_phone} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-mono text-[13px] text-red-700">{d.contact_phone}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">{d.owner_ids.length} tài khoản</td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">{d.listing_count} tin</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Price Outliers ── */}
      <section className="mb-10">
        <SectionHeader title="Giá bất thường" count={priceOutliers.length}/>
        {priceOutliers.length === 0 ? (
          <p className="text-[13px] text-gray-400">Không phát hiện giá bất thường.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.06]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Tin đăng', 'Giá', 'Giá trung vị', 'Lệch %', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceOutliers.map(o => (
                  <tr key={o.listing_id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <p className="m-0 line-clamp-1 max-w-[200px] text-[13px] font-semibold text-gray-900">{o.title}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-700">
                      {o.price_amount.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">
                      {o.province_median.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-bold text-red-600">+{o.deviation_pct}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dat/${o.slug}`}
                        target="_blank"
                        className="text-[12px] font-semibold text-blue-600 no-underline hover:underline"
                      >
                        Xem →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Velocity Abuse ── */}
      <section>
        <SectionHeader title="Đăng tin ồ ạt (24h)" count={velocityAbuse.length}/>
        {velocityAbuse.length === 0 ? (
          <p className="text-[13px] text-gray-400">Không phát hiện hành vi đăng tin ồ ạt.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/[0.06]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Người dùng', 'Tin trong 24h'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {velocityAbuse.map(v => (
                  <tr key={v.owner_id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <p className="m-0 text-[13px] font-semibold text-gray-900">{v.owner_name ?? '—'}</p>
                      <p className="m-0 text-[11px] font-mono text-gray-400">{v.owner_id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-bold text-red-600">{v.listing_count} tin</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}
