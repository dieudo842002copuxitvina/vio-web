import Link from 'next/link'

// ── Static commodity prices — refresh weekly or wire to DB later ──────────────

const COMMODITIES = [
  {
    name:    'Sầu riêng',
    icon:    '🌿',
    price:   '85.000đ/kg',
    change:  +12,
    region:  'Đắk Lắk',
    href:    '/dat-nong-nghiep?q=sau+rieng',
    volume:  '2.400 tấn/tuần',
  },
  {
    name:    'Cà phê nhân',
    icon:    '☕',
    price:   '68.000đ/kg',
    change:  +5,
    region:  'Đắk Lắk · Gia Lai',
    href:    '/dat-nong-nghiep?q=ca+phe',
    volume:  '18.000 tấn/tuần',
  },
  {
    name:    'Hồ tiêu',
    icon:    '🌱',
    price:   '142.000đ/kg',
    change:  +8,
    region:  'Bình Phước · Gia Lai',
    href:    '/dat-nong-nghiep?q=tieu',
    volume:  '850 tấn/tuần',
  },
  {
    name:    'Lúa gạo ST25',
    icon:    '🌾',
    price:   '8.500đ/kg',
    change:  -2,
    region:  'Sóc Trăng · An Giang',
    href:    '/dat-nong-nghiep?q=lua',
    volume:  '45.000 tấn/tuần',
  },
  {
    name:    'Mủ cao su',
    icon:    '🌳',
    price:   '35.000đ/kg',
    change:  +3,
    region:  'Đồng Nai · Bình Phước',
    href:    '/dat-nong-nghiep?q=cao+su',
    volume:  '3.200 tấn/tuần',
  },
  {
    name:    'Hạt điều',
    icon:    '🔧',
    price:   '38.000đ/kg',
    change:  -1,
    region:  'Bình Thuận · Bình Phước',
    href:    '/dat-nong-nghiep?q=dieu',
    volume:  '1.100 tấn/tuần',
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export function CommodityPriceTable() {
  return (
    <section className="border-t border-neutral-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-1 rounded-full"
              style={{ background: '#F9A825' }}
              aria-hidden="true"
            />
            <h2 className="m-0 text-[1rem] font-black text-[#1A1A1A]">
              Giá nông sản tuần này
            </h2>
            <span className="rounded-full bg-[#FFF3E0] px-2 py-0.5 text-[10px] font-bold text-[#E65100]">
              CẬP NHẬT: 07/06/2026
            </span>
          </div>
          <Link
            href="/thi-truong/gia-nong-san"
            className="text-[0.8125rem] font-semibold no-underline"
            style={{ color: '#2E7D32' }}
          >
            Xem bảng giá đầy đủ →
          </Link>
        </div>

        {/* Price table — desktop */}
        <div className="hidden overflow-hidden rounded-xl border border-neutral-100 lg:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-[#F7F9F5]">
                <th className="px-4 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wide text-neutral-400">
                  Nông sản
                </th>
                <th className="px-4 py-2.5 text-right text-[0.6875rem] font-bold uppercase tracking-wide text-neutral-400">
                  Giá hiện tại
                </th>
                <th className="px-4 py-2.5 text-right text-[0.6875rem] font-bold uppercase tracking-wide text-neutral-400">
                  Tuần này
                </th>
                <th className="px-4 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wide text-neutral-400">
                  Khu vực chính
                </th>
                <th className="px-4 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wide text-neutral-400">
                  Sản lượng / tuần
                </th>
                <th className="px-4 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wide text-neutral-400" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {COMMODITIES.map(c => (
                <tr key={c.name} className="transition-colors hover:bg-[#F7F9F5]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg" aria-hidden="true">{c.icon}</span>
                      <span className="font-semibold text-[#1A1A1A]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-black text-[#1A1A1A]">{c.price}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.75rem] font-bold"
                      style={
                        c.change > 0
                          ? { background: '#E8F5E9', color: '#2E7D32' }
                          : { background: '#FFEBEE', color: '#C62828' }
                      }
                    >
                      {c.change > 0 ? '▲' : '▼'} {Math.abs(c.change)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[0.8125rem] text-neutral-500">{c.region}</td>
                  <td className="px-4 py-3 text-[0.8125rem] text-neutral-400">{c.volume}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={c.href}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-[0.75rem]
                                 font-semibold text-[#2E7D32] no-underline
                                 transition-colors hover:bg-[#F7F9F5]"
                    >
                      Tìm tin →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Price cards — mobile */}
        <div className="grid grid-cols-2 gap-2.5 lg:hidden sm:grid-cols-3">
          {COMMODITIES.map(c => (
            <Link
              key={c.name}
              href={c.href}
              className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-[#F7F9F5]
                         px-3.5 py-3 no-underline transition-all hover:border-neutral-200 hover:bg-white"
            >
              <span className="text-xl" aria-hidden="true">{c.icon}</span>
              <div className="min-w-0">
                <p className="m-0 text-[0.75rem] font-bold text-[#1A1A1A]">{c.name}</p>
                <p className="m-0 text-[0.75rem] font-black" style={{ color: '#2E7D32' }}>
                  {c.price}
                </p>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: c.change > 0 ? '#2E7D32' : '#C62828' }}
                >
                  {c.change > 0 ? '▲' : '▼'} {Math.abs(c.change)}%
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
