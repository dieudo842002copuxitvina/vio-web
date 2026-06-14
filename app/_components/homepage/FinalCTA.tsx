import Link from 'next/link'

// ── FinalCTA ───────────────────────────────────────────────────────────────────

export function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden bg-[#1d1d1f] py-28 sm:py-36"
      aria-labelledby="cta-heading"
    >
      {/* Glow orb — top-left */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px]
                   rounded-full bg-vio-forest/25 blur-[120px]"
        aria-hidden="true"
      />

      {/* Glow orb — bottom-right */}
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-[400px] w-[400px]
                   rounded-full bg-vio-forest/15 blur-[100px]"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative mx-auto max-w-[1280px] px-4 text-center sm:px-8">

        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
          Bắt đầu ngay hôm nay
        </p>

        <h2
          id="cta-heading"
          className="mx-auto max-w-[640px] text-[32px] font-bold tracking-[-0.02em]
                     text-white sm:text-[40px] lg:text-[48px]"
        >
          Nền tảng đất nông nghiệp
          <br />
          tốt nhất Việt Nam
        </h2>

        <p className="mx-auto mt-4 max-w-[440px] text-[16px] leading-relaxed text-white/60 sm:text-[17px]">
          Tham gia cùng hàng nghìn nhà đầu tư và môi giới đang sử dụng VIO AGRI mỗi ngày
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dat-nong-nghiep"
            className="w-full rounded-full bg-white px-8 py-4 text-[17px] font-bold
                       text-[#1d1d1f] no-underline shadow-[0_4px_16px_rgba(255,255,255,0.12)]
                       transition-all hover:bg-[#F0F0F0] sm:w-auto"
          >
            Tìm đất ngay
          </Link>
          <Link
            href="/dang-tin-dat"
            className="w-full rounded-full border border-white/25 px-8 py-4 text-[17px]
                       font-bold text-white no-underline backdrop-blur-sm
                       transition-all hover:border-white/50 hover:bg-white/[0.06] sm:w-auto"
          >
            Đăng tin miễn phí
          </Link>
        </div>

        {/* Trust footnote */}
        <p className="mt-6 text-[13px] text-white/35">
          Không cần thẻ tín dụng&nbsp;&nbsp;·&nbsp;&nbsp;Đăng ký trong 30 giây
        </p>

      </div>
    </section>
  )
}
