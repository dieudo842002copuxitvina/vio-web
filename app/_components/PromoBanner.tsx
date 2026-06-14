import Link from 'next/link'

export function PromoBanner() {
  return (
    <section
      aria-label="Đăng tin miễn phí"
      className="px-4 py-8 sm:px-6 sm:py-16 lg:px-8"
    >
      {/* ── Apple-style light card with ambient glow ── */}
      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] bg-[#F5F5F7]">

        {/* Glow orbs — soft, diffuse color bleed behind the content */}
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full
                     bg-green-200/60 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full
                     bg-emerald-100/70 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-96
                     -translate-x-1/2 -translate-y-1/2 rounded-full
                     bg-amber-50/90 blur-2xl"
          aria-hidden="true"
        />

        {/* ── Centered content ── */}
        <div className="relative px-8 py-16 text-center sm:px-12 sm:py-20">

          {/* Kicker pill */}
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-green-100
                           px-3.5 py-1.5 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
            Miễn phí 100% — không phí ẩn
          </span>

          {/* Title */}
          <h2 className="m-0 text-4xl font-bold tracking-tight text-gray-900">
            Đăng tin nông nghiệp miễn phí
          </h2>

          {/* Subtitle */}
          <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-gray-500">
            Kết nối với người mua trên 63 tỉnh thành Việt Nam.
            Không hoa hồng, không phí trung gian.
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dang-tin"
              className="inline-flex h-12 w-full items-center justify-center rounded-full
                         bg-green-800 px-8 text-sm font-medium text-white no-underline
                         transition-all hover:bg-green-900 active:scale-[0.97] sm:w-auto"
            >
              Đăng tin ngay — miễn phí
            </Link>
            <Link
              href="/dat-nong-nghiep"
              className="inline-flex h-12 w-full items-center justify-center rounded-full
                         border border-gray-300 bg-white/60 px-8 text-sm font-medium text-gray-700
                         no-underline transition-all hover:border-gray-400 hover:bg-white
                         active:scale-[0.97] sm:w-auto"
            >
              Xem tin đăng →
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {['Kiểm duyệt 24h', 'Không hoa hồng', '63 tỉnh thành'].map(t => (
              <span key={t} className="flex items-center gap-1.5 text-sm text-gray-400">
                <span className="text-green-500" aria-hidden="true">✓</span>
                {t}
              </span>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
