import type { Metadata } from 'next'
import Link from 'next/link'
import { LandListingCard } from '@/components/land-listing-card'
import type { LandListingCardProps } from '@/components/land-listing-card'
import { LandSearchAutocomplete } from '@/components/land-search-autocomplete'

const SITE_NAME = 'Nhà Bè Agri'
const TITLE     = 'Nhà Bè Agri | Nền tảng Giao thương Nông nghiệp & Bất động sản Địa phương'
const DESC      = 'Khám phá và giao dịch đất nông nghiệp, rẫy sầu riêng, nhà vườn và nông sản trực tiếp từ chủ vườn. Nền tảng minh bạch, thông tin xác thực tại khu vực Nghĩa Trung, Đồng Nai và Đông Nam Bộ.'
const OG_IMAGE  = 'https://picsum.photos/seed/nhabe-agri-og/1200/630'

export const metadata: Metadata = {
  title:       TITLE,
  description: DESC,
  keywords: [
    'Mua bán đất nông nghiệp',
    'Đất rẫy Đồng Nai',
    'Rẫy sầu riêng',
    'Nhà vườn Nghĩa Trung',
    'Nông sản Nhà Bè Agri',
    'Giá đất nông nghiệp',
    'Bất động sản nông thôn',
  ],
  openGraph: {
    title:       TITLE,
    description: DESC,
    type:        'website',
    locale:      'vi_VN',
    siteName:    SITE_NAME,
    images: [
      {
        url:    OG_IMAGE,
        width:  1200,
        height: 630,
        alt:    'Nhà Bè Agri — Giao thương nông nghiệp minh bạch',
      },
    ],
  },
  twitter: {
    card:        'summary_large_image',
    title:       TITLE,
    description: DESC,
    images:      [OG_IMAGE],
  },
}

// ── Mock data (replace with Supabase query when ready) ─────────────────────

const FEATURED_LAND: LandListingCardProps[] = [
  {
    slug:            'vuon-ca-phe-2ha-cam-my-dong-nai',
    title:           'Vườn Cà Phê 2ha Mặt Tiền Đường Nhựa',
    price_text:      '2,8 tỷ',
    land_area_text:  '20.000 m²',
    location:        'Cẩm Mỹ, Đồng Nai',
    legal_status:    'Sổ đỏ',
    land_type_label: 'Cây lâu năm',
    image_url:       'https://picsum.photos/seed/coffee-farm/600/400',
    is_featured:     true,
  },
  {
    slug:            'dat-lua-1ha-xuan-loc-dong-nai',
    title:           'Đất Lúa 1ha Xuân Lộc, Gần Khu Công Nghiệp',
    price_text:      '1,5 tỷ',
    land_area_text:  '10.000 m²',
    location:        'Xuân Lộc, Đồng Nai',
    legal_status:    'Sổ hồng',
    land_type_label: 'Đất lúa',
    image_url:       'https://picsum.photos/seed/rice-paddy/600/400',
    is_featured:     false,
  },
  {
    slug:            'vuon-sau-rieng-3ha-dinh-quan',
    title:           'Vườn Sầu Riêng 3ha Định Quán, Năng Suất Cao',
    price_text:      '4,2 tỷ',
    land_area_text:  '30.000 m²',
    location:        'Định Quán, Đồng Nai',
    legal_status:    'Sổ đỏ',
    land_type_label: 'Cây ăn trái',
    image_url:       'https://picsum.photos/seed/durian-orchard/600/400',
    is_featured:     true,
  },
]

const DISTRICTS = [
  { name: 'Cẩm Mỹ',     slug: 'cam-my',     emoji: '🌿', count: '120+' },
  { name: 'Xuân Lộc',   slug: 'xuan-loc',   emoji: '🌾', count: '95+'  },
  { name: 'Định Quán',  slug: 'dinh-quan',  emoji: '🌱', count: '80+'  },
  { name: 'Thống Nhất', slug: 'thong-nhat', emoji: '☕', count: '60+'  },
]

// ── Page ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center min-h-[70vh] overflow-hidden">

        {/* Background — nature cover photo */}
        <img
          src="https://picsum.photos/seed/vietnam-countryside/1400/900"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlay — dark at bottom for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/65" />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-2xl mx-auto w-full">

          {/* Kicker badge */}
          <span className="inline-flex items-center mb-5 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-[0.6875rem] font-bold tracking-[0.1em] uppercase select-none">
            Nền tảng thương mại địa phương
          </span>

          {/* Display headline */}
          <h1 className="text-[2.5rem] sm:text-[3.25rem] lg:text-[4rem] font-bold tracking-tight leading-[1.06] text-white mb-5">
            Khám phá Giao thương<br />
            <span className="text-[#34C759]">Nông thôn</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-white/75 text-[1.0625rem] mb-9 leading-relaxed max-w-sm mx-auto">
            Kết nối trực tiếp với nông dân và hộ kinh doanh trên toàn 63 tỉnh thành.
          </p>

          {/* Land search — pill input, searches land_listings */}
          <LandSearchAutocomplete
            placeholder="Tìm kiếm đất nông nghiệp..."
            className="max-w-[500px] mx-auto"
          />
        </div>
      </section>

      {/* ── Đất Nông Nghiệp Nổi Bật ──────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Đất Nông Nghiệp Nổi Bật
            </h2>
            <Link
              href="/dat-nong-nghiep"
              className="text-[0.875rem] font-medium text-[#0071E3] dark:text-[#409CFF] no-underline hover:opacity-70 transition-opacity whitespace-nowrap"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURED_LAND.map(land => (
              <LandListingCard key={land.slug} {...land} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Khám phá Khu vực — Bento Grid ────────────────────────────────── */}
      <section className="pb-24 px-4">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Khám phá Khu vực
            </h2>
            <Link
              href="/dong-nai"
              className="text-[0.875rem] font-medium text-[#0071E3] dark:text-[#409CFF] no-underline hover:opacity-70 transition-opacity whitespace-nowrap"
            >
              Tỉnh Đồng Nai
            </Link>
          </div>

          {/*
            Bento layout:
            mobile  — 2×2 equal grid
            desktop — col 1 spans 2 rows (tall) | col 2-3 top wide | col 2-3 bottom split
            ┌─────────────┬───────────────────────┐
            │  Cẩm Mỹ    │      Xuân Lộc         │
            │  (tall)     ├───────────┬───────────┤
            │             │ Định Quán │ Thống Nhất│
            └─────────────┴───────────┴───────────┘
          */}
          <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[152px] gap-3">

            {/* Cẩm Mỹ — tall left */}
            <Link
              href="/dong-nai/cam-my"
              className="col-span-1 md:row-span-2 flex flex-col justify-between p-5 rounded-[2rem] bg-gray-100 dark:bg-[#1C1C1E] no-underline transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_1px_4px_rgb(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgb(0,0,0,0.25)]"
            >
              <span className="text-3xl select-none" aria-hidden="true">🌿</span>
              <div>
                <p className="m-0 font-bold text-[1rem] text-gray-900 dark:text-white">Cẩm Mỹ</p>
                <p className="m-0 text-xs text-gray-500 dark:text-gray-400 mt-0.5">120+ tin đất</p>
              </div>
            </Link>

            {/* Xuân Lộc — wide right top */}
            <Link
              href="/dong-nai/xuan-loc"
              className="col-span-1 md:col-span-2 flex items-center gap-4 p-5 rounded-[2rem] bg-gray-100 dark:bg-[#1C1C1E] no-underline transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_1px_4px_rgb(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgb(0,0,0,0.25)]"
            >
              <span className="text-3xl select-none" aria-hidden="true">🌾</span>
              <div>
                <p className="m-0 font-bold text-[1rem] text-gray-900 dark:text-white">Xuân Lộc</p>
                <p className="m-0 text-xs text-gray-500 dark:text-gray-400 mt-0.5">95+ tin đất</p>
              </div>
            </Link>

            {/* Định Quán — bottom center */}
            <Link
              href="/dong-nai/dinh-quan"
              className="col-span-1 flex flex-col justify-between p-5 rounded-[2rem] bg-gray-100 dark:bg-[#1C1C1E] no-underline transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_1px_4px_rgb(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgb(0,0,0,0.25)]"
            >
              <span className="text-3xl select-none" aria-hidden="true">🌱</span>
              <div>
                <p className="m-0 font-bold text-[1rem] text-gray-900 dark:text-white">Định Quán</p>
                <p className="m-0 text-xs text-gray-500 dark:text-gray-400 mt-0.5">80+ tin đất</p>
              </div>
            </Link>

            {/* Thống Nhất — bottom right */}
            <Link
              href="/dong-nai/thong-nhat"
              className="col-span-1 flex flex-col justify-between p-5 rounded-[2rem] bg-gray-100 dark:bg-[#1C1C1E] no-underline transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_1px_4px_rgb(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgb(0,0,0,0.25)]"
            >
              <span className="text-3xl select-none" aria-hidden="true">☕</span>
              <div>
                <p className="m-0 font-bold text-[1rem] text-gray-900 dark:text-white">Thống Nhất</p>
                <p className="m-0 text-xs text-gray-500 dark:text-gray-400 mt-0.5">60+ tin đất</p>
              </div>
            </Link>

          </div>
        </div>
      </section>

    </main>
  )
}
