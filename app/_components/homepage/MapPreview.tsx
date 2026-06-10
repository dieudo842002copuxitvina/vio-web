import Link from 'next/link'

// ── Province coverage data ─────────────────────────────────────────────────────
// Launch provinces — real coverage, not decoration.

const PROVINCES = [
  { name: 'Lâm Đồng',    count: '340+' },
  { name: 'Đắk Lắk',     count: '210+' },
  { name: 'Gia Lai',      count: '180+' },
  { name: 'Đồng Nai',     count: '160+' },
  { name: 'Bình Phước',   count: '140+' },
  { name: 'Long An',      count: '120+' },
  { name: 'An Giang',     count: '90+'  },
  { name: 'Tây Ninh',     count: '80+'  },
] as const

// ── MapPreview ─────────────────────────────────────────────────────────────────

export function MapPreview() {
  return (
    <section
      className="bg-[#1A4D2E] py-24 sm:py-32"
      aria-labelledby="coverage-heading"
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="flex flex-col gap-14 lg:flex-row lg:items-center lg:gap-20">

          {/* ── Left: text + CTA ─────────────────────────────────────── */}
          <div className="flex-[2]">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
              Phủ sóng
            </p>
            <h2
              id="coverage-heading"
              className="text-[32px] font-bold tracking-[-0.02em] text-white sm:text-[40px]"
            >
              8 tỉnh thành
              <br />
              trọng điểm nông nghiệp
            </h2>
            <p className="mt-4 max-w-[380px] text-[16px] leading-relaxed text-white/70">
              Dữ liệu đất được xác minh tại các vùng sản xuất nông nghiệp lớn nhất
              Tây Nguyên, Đông Nam Bộ và Đồng bằng sông Cửu Long.
            </p>

            {/* Summary stats */}
            <div className="mt-8 flex flex-wrap gap-8">
              <div>
                <p className="text-[30px] font-bold text-white leading-none">1.200+</p>
                <p className="mt-1 text-[13px] text-white/60">Lô đất đang đăng</p>
              </div>
              <div>
                <p className="text-[30px] font-bold text-white leading-none">63</p>
                <p className="mt-1 text-[13px] text-white/60">Tỉnh thành sẽ phủ sóng</p>
              </div>
            </div>

            <Link
              href="/ban-do"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5
                         text-[15px] font-bold text-[#1A4D2E] no-underline
                         shadow-[0_4px_16px_rgba(0,0,0,0.15)]
                         transition-all hover:bg-[#F5F5F5]"
              aria-label="Mở bản đồ đất nông nghiệp"
            >
              Xem trên bản đồ
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* ── Right: province grid ─────────────────────────────────── */}
          <div className="flex-[3]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {PROVINCES.map(p => (
                <Link
                  key={p.name}
                  href={`/dat-nong-nghiep?tinh=${p.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex flex-col gap-1.5 rounded-[16px] bg-white/[0.08] p-4
                             no-underline border border-white/[0.1]
                             transition-colors hover:bg-white/[0.14]"
                >
                  <span className="text-[20px] font-bold text-white leading-none">
                    {p.count}
                  </span>
                  <span className="text-[13px] text-white/65 leading-snug">{p.name}</span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-white/35">
              Số lượng cập nhật theo thời gian thực. Mở rộng thêm tỉnh thành vào Q3 2025.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
