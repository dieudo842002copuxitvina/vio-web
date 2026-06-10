import Link from 'next/link'
import type { HeatTier } from '@/features/commerce/api/regional-ops.server'

// ── Province display meta ─────────────────────────────────────────────────────

export const PROVINCE_META: Record<string, { icon: string; tagline: string }> = {
  'dong-nai':   { icon: '🌳', tagline: 'Cao su · Cây ăn trái · Đất trồng trọt' },
  'binh-phuoc': { icon: '🌿', tagline: 'Hồ tiêu · Điều · Cao su'               },
  'tay-ninh':   { icon: '🌾', tagline: 'Mía · Khoai mì · Lúa'                  },
  'lam-dong':   { icon: '🏔️', tagline: 'Cà phê · Sầu riêng · Dâu tằm'         },
  'gia-lai':    { icon: '☕', tagline: 'Cà phê · Hồ tiêu · Cao su'             },
  'dak-lak':    { icon: '🌱', tagline: 'Cà phê · Sầu riêng · Tiêu'            },
  'an-giang':   { icon: '🌾', tagline: 'Lúa · Thuỷ sản · Rau màu'             },
  'binh-thuan': { icon: '🌴', tagline: 'Điều · Thanh long · Cây ăn trái'       },
}

const HEAT_CONFIG: Record<HeatTier, { label: string; bg: string; text: string }> = {
  hot:  { label: '🔥 Nóng',      bg: 'bg-amber-500/20',  text: 'text-amber-200' },
  warm: { label: '📈 Tăng',      bg: 'bg-orange-500/15', text: 'text-orange-200' },
  cool: { label: '➡ Ổn định',   bg: 'bg-white/10',      text: 'text-white/70'  },
  cold: { label: '❄ Chậm',      bg: 'bg-blue-400/15',   text: 'text-blue-200'  },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProvinceHeroProps {
  slug:          string
  name:          string
  nameFull:      string
  region:        string
  totalListings: number
  merchantCount: number
  heatTier:      HeatTier | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProvinceHero({
  slug, name, nameFull, region,
  totalListings, merchantCount, heatTier,
}: ProvinceHeroProps) {
  const meta = PROVINCE_META[slug] ?? { icon: '🌾', tagline: 'Đất nông nghiệp · Doanh nghiệp' }
  const heat = heatTier ? HEAT_CONFIG[heatTier] : null

  const displayListings = totalListings > 0
    ? `${(Math.floor(totalListings / 10) * 10).toLocaleString('vi-VN')}+`
    : '—'

  return (
    <section
      className="relative overflow-hidden px-4 sm:px-6 lg:px-8 py-14 md:py-20"
      style={{ background: `var(--pg-${slug}, linear-gradient(135deg, #0D2E1A 0%, #2D7A4F 100%))` }}
      aria-labelledby="province-hero-heading"
    >
      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #34C759 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl">

        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-[0.8125rem] text-white/50" aria-label="Điều hướng">
          <Link href="/" className="no-underline hover:text-white/80 transition-colors">
            Trang chủ
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-white/70">{name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">

          {/* Left — identity */}
          <div>
            {/* Region badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                {region}
              </span>
            </div>

            {/* Province name */}
            <div className="mb-2 flex items-center gap-4">
              <span className="text-4xl" aria-hidden="true">{meta.icon}</span>
              <h1
                id="province-hero-heading"
                className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                {name}
              </h1>
            </div>

            <p className="mb-1 text-[1.0625rem] font-semibold text-white/60">{nameFull}</p>

            <p className="mb-8 text-[0.9375rem] text-white/50">{meta.tagline}</p>

            {/* CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/dat-nong-nghiep/${slug}`}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-7
                           text-[0.9375rem] font-bold text-[#0A0A0A] no-underline
                           transition-all hover:bg-white/90 active:scale-[0.98]
                           focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              >
                Tìm đất tại {name} →
              </Link>
              <Link
                href="/dang-tin"
                className="inline-flex h-12 items-center justify-center rounded-xl
                           border border-white/20 bg-white/10 px-7
                           text-[0.9375rem] font-bold text-white no-underline backdrop-blur-sm
                           transition-all hover:bg-white/20 active:scale-[0.98]"
              >
                Đăng tin tại đây
              </Link>
            </div>
          </div>

          {/* Right — live stats panel */}
          <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            {/* Heat tier */}
            {heat && (
              <div className={`mb-4 inline-flex items-center rounded-full px-3 py-1 ${heat.bg}`}>
                <span className={`text-[0.75rem] font-bold ${heat.text}`}>{heat.label}</span>
              </div>
            )}

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[0.8125rem] text-white/50">Tin đăng</span>
                <span className="text-[1rem] font-black text-white">{displayListings}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-[0.8125rem] text-white/50">Doanh nghiệp</span>
                <span className="text-[1rem] font-black text-white">
                  {merchantCount > 0 ? `${merchantCount}+` : '—'}
                </span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-[0.8125rem] text-white/50">63 tỉnh thành</span>
                <span className="text-[0.8125rem] font-semibold text-vio-primary">VIO LOCAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
