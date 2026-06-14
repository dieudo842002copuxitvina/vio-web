import Link from 'next/link'

// ── Bullet points ─────────────────────────────────────────────────────────────

const BULLETS = [
  'Đẩy tin lên Top trong kết quả tìm kiếm',
  'Nhận huy hiệu Tích xanh xác thực danh tính',
  'Tiếp cận đúng tệp khách hàng nét hơn',
] as const

// ── Phone mockup ──────────────────────────────────────────────────────────────
// A pure-CSS phone illustration. Swap the inner div for an <Image> when the
// real app screenshot is ready — the outer frame and badges stay as-is.

function PhoneMockup() {
  return (
    <div className="relative flex items-center justify-center py-6 lg:py-0">

      {/* Ambient glow behind phone */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
      </div>

      {/* Phone frame */}
      <div
        className="relative h-[300px] w-[148px]
                   rounded-[2.5rem] ring-1 ring-white/[0.14]
                   bg-black/50 shadow-2xl shadow-black/70
                   lg:h-[340px] lg:w-[168px]"
      >
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-3.5 h-[10px] w-[64px] -translate-x-1/2 rounded-full bg-black/70" />

        {/* Screen */}
        <div className="absolute inset-[2px] overflow-hidden rounded-[2.4rem] bg-[#0D1F12]">

          {/* Status bar skeleton */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div className="h-1.5 w-12 rounded-full bg-white/20" />
            <div className="h-1.5 w-7 rounded-full bg-white/20" />
          </div>

          {/* Search pill */}
          <div className="mx-3 mb-3 flex h-7 items-center rounded-xl bg-white/10 px-2.5">
            <div className="h-1.5 w-20 rounded-full bg-white/30" />
          </div>

          {/* Listing card 1 */}
          <div className="mx-3 mb-2 overflow-hidden rounded-xl bg-white/[0.07]">
            <div className="h-14 bg-gradient-to-br from-green-900/80 to-green-800/60" />
            <div className="space-y-1.5 p-2">
              <div className="h-[7px] w-14 rounded-full bg-amber-400/70" />
              <div className="h-[6px] w-20 rounded-full bg-white/30" />
              <div className="h-[5px] w-16 rounded-full bg-white/15" />
            </div>
          </div>

          {/* Listing card 2 */}
          <div className="mx-3 overflow-hidden rounded-xl bg-white/[0.07]">
            <div className="h-14 bg-gradient-to-br from-emerald-900/80 to-teal-900/60" />
            <div className="space-y-1.5 p-2">
              <div className="h-[7px] w-12 rounded-full bg-amber-400/70" />
              <div className="h-[6px] w-18 rounded-full bg-white/30" />
              <div className="h-[5px] w-14 rounded-full bg-white/15" />
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-white/20" />
        </div>

        {/* Glare highlight */}
        <div
          className="pointer-events-none absolute left-3 top-10 h-24 w-5
                     rotate-12 rounded-full bg-white/[0.06] blur-sm"
          aria-hidden="true"
        />
      </div>

      {/* Floating badge — VIO brand mark */}
      <div
        className="absolute right-4 top-14 rounded-2xl bg-amber-400
                   px-3 py-1.5 shadow-lg shadow-amber-400/30 lg:right-0"
        aria-hidden="true"
      >
        <span className="text-[11px] font-black tracking-widest text-[#0A2F1D]">VIO</span>
      </div>

      {/* Floating badge — Tích xanh pill */}
      <div
        className="absolute bottom-14 left-4 flex items-center gap-1.5 rounded-xl
                   border border-white/20 bg-white/10 px-2.5 py-1.5
                   shadow-lg backdrop-blur-md lg:left-0"
        aria-hidden="true"
      >
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
          <span className="text-[8px] font-bold text-white">✓</span>
        </div>
        <span className="text-[10px] font-semibold text-white">Tích xanh</span>
      </div>

    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PremiumSellerCTA() {
  return (
    <section
      aria-labelledby="premium-cta-heading"
      className="my-16 px-4 sm:px-6 lg:px-8"
    >
      <div
        className="relative mx-auto w-full max-w-6xl overflow-hidden
                   rounded-[32px] bg-[#0A2F1D]"
      >

        {/* ── Background glow orbs ─────────────────────────────────────────── */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96
                     rounded-full bg-amber-400/[0.07] blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96
                     rounded-full bg-emerald-700/25 blur-3xl"
          aria-hidden="true"
        />

        {/* ── Content grid ─────────────────────────────────────────────────── */}
        <div className="relative grid grid-cols-1 items-center gap-10
                        px-8 py-14 sm:px-12 sm:py-16
                        lg:grid-cols-2 lg:gap-16 lg:px-16">

          {/* ── Left: copy ────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Kicker */}
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400">
              Dành cho chủ đất &amp; môi giới
            </p>

            {/* Headline */}
            <h2
              id="premium-cta-heading"
              className="m-0 text-[2.25rem] font-bold leading-[1.12] tracking-tight
                         text-white sm:text-[2.75rem]"
            >
              Đăng tin bán đất.{' '}
              <span className="text-white/90">Tiếp cận </span>
              <span className="text-amber-400">hàng ngàn</span>
              <span className="text-white/90"> nhà đầu tư.</span>
            </h2>

            {/* Bullets */}
            <ul className="m-0 list-none flex flex-col gap-3 p-0">
              {BULLETS.map(b => (
                <li key={b} className="flex items-start gap-3 text-[15px] text-white/55">
                  <span className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true">✓</span>
                  {b}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

              {/* Primary — gold pill */}
              <Link
                href="/thanh-vien/dang-ky"
                className="inline-flex h-12 items-center justify-center rounded-full
                           bg-amber-400 px-7 text-[14px] font-bold
                           text-[#0A2F1D] no-underline
                           shadow-md shadow-amber-400/20
                           transition-all hover:bg-amber-300 active:scale-[0.97]"
              >
                Đăng ký thành viên VIP
              </Link>

              {/* Secondary — ghost */}
              <Link
                href="/thanh-vien"
                className="text-sm font-medium text-white/40 no-underline
                           transition-colors hover:text-white/75"
              >
                Xem bảng giá →
              </Link>

            </div>

          </div>

          {/* ── Right: phone mockup ───────────────────────────────────────── */}
          <div className="flex items-center justify-center lg:justify-end">
            <PhoneMockup />
          </div>

        </div>
      </div>
    </section>
  )
}
