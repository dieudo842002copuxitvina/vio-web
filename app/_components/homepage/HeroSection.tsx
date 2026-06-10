import Link             from 'next/link'
import { HeroSearchForm } from './HeroSearchForm'

// ── Quick-filter chips below the search card ───────────────────────────────────

const CHIPS = [
  { label: 'Đất lúa',      href: '/dat-nong-nghiep?loai=lua'          },
  { label: 'Đất vườn',     href: '/dat-nong-nghiep?loai=vuon'         },
  { label: 'Lâm nghiệp',   href: '/dat-nong-nghiep?loai=lam-nghiep'  },
  { label: 'Mặt nước',     href: '/dat-nong-nghiep?loai=mat-nuoc'     },
  { label: 'Rau màu',      href: '/dat-nong-nghiep?loai=rau-mau'      },
  { label: 'Cho thuê',     href: '/dat-nong-nghiep?giao-dich=thue'    },
] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n < 100) return '1.200+'
  const rounded = Math.floor(n / 100) * 100
  return `${rounded.toLocaleString('vi-VN')}+`
}

// ── HeroSection ────────────────────────────────────────────────────────────────

interface HeroSectionProps {
  listingCount: number
}

export function HeroSection({ listingCount }: HeroSectionProps) {
  return (
    <section
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden"
      aria-labelledby="hero-heading"
    >

      {/* ── Background: drone photo (Unsplash placeholder) ────────────── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=2400&q=80"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-[center_65%]"
      />

      {/* ── Gradient overlay: dark bottom-to-top, lighter at horizon ──── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.55) 100%)',
        }}
        aria-hidden="true"
      />

      {/* ── Content: centered column ──────────────────────────────────── */}
      <div className="relative z-10 flex w-full max-w-[760px] flex-col items-center px-4 text-center">

        {/* Kicker */}
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
          Nền tảng giao dịch đất nông nghiệp
        </p>

        {/* H1 */}
        <h1
          id="hero-heading"
          className="text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-white
                     sm:text-[46px] lg:text-[56px]"
        >
          Tìm đất nông nghiệp
          <br className="hidden sm:block" />
          {' '}phù hợp cho dự án của bạn
        </h1>

        {/* Sub-headline: real stat from DB */}
        <p className="mt-4 max-w-[500px] text-[16px] leading-relaxed text-white/85 sm:text-[18px]">
          <span className="font-semibold text-white">{formatCount(listingCount)} lô đất</span>
          {' '}đã được xác minh trên toàn quốc
        </p>

        {/* Search card */}
        <div className="mt-8 w-full sm:mt-10">
          <HeroSearchForm />
        </div>

        {/* Quick-filter chips */}
        <div
          className="mt-5 flex flex-wrap justify-center gap-2"
          aria-label="Lọc nhanh theo loại đất"
        >
          {CHIPS.map(c => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-full border border-white/25 bg-white/[0.13] px-4 py-1.5
                         text-[13px] font-medium text-white no-underline backdrop-blur-sm
                         transition-colors hover:bg-white/[0.22]"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

    </section>
  )
}
