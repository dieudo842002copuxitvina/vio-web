import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchAutocomplete } from '@/components/search-autocomplete'

export const metadata: Metadata = {
  title: 'VIO LOCAL — Chợ nông sản & hộ kinh doanh địa phương',
  description: 'Khám phá hộ kinh doanh, nông sản tươi ngon và đất nông nghiệp địa phương trên toàn 63 tỉnh thành Việt Nam.',
}

const FEATURED_PROVINCES = [
  { name: 'Đồng Nai',  slug: 'dong-nai',  emoji: '🌿', count: '120+' },
  { name: 'Đắk Lắk',  slug: 'dak-lak',   emoji: '☕', count: '95+'  },
  { name: 'Lâm Đồng', slug: 'lam-dong',  emoji: '🌱', count: '80+'  },
  { name: 'Gia Lai',  slug: 'gia-lai',   emoji: '🌾', count: '60+'  },
  { name: 'Đắk Nông', slug: 'dak-nong',  emoji: '🫘', count: '45+'  },
  { name: 'Kon Tum',  slug: 'kon-tum',   emoji: '🌲', count: '38+'  },
]

export default function HomePage() {
  return (
    <main>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-16 text-center px-4">
        <div className="max-w-2xl mx-auto">

          {/* Kicker — iOS green pill badge */}
          <span className="inline-flex items-center mb-5 px-3.5 py-1 rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15 text-[#34C759] dark:text-[#30D158] text-[0.6875rem] font-bold tracking-[0.1em] uppercase select-none">
            Nền tảng thương mại địa phương
          </span>

          {/* Display headline — Apple-style large title */}
          <h1 className="text-[2.625rem] sm:text-[3.375rem] lg:text-[4rem] font-bold tracking-tight leading-[1.06] text-gray-900 dark:text-white mb-5">
            Khám phá Nông sản<br />
            <span className="text-[#0071E3] dark:text-[#409CFF]">&amp; Hộ kinh doanh</span><br />
            Địa phương
          </h1>

          {/* Sub-headline */}
          <p className="text-[1.0625rem] text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-10 leading-relaxed">
            Kết nối trực tiếp với người sản xuất trên toàn 63 tỉnh thành Việt Nam.
          </p>

          {/* Search bar — pill override via Tailwind child selector */}
          <SearchAutocomplete
            className="max-w-[440px] mx-auto [&>div:first-child]:!rounded-full [&>div:first-child]:shadow-[0_2px_14px_rgb(0,0,0,0.09)] [&>div:first-child]:border-gray-200 dark:[&>div:first-child]:border-white/[0.1] [&>div:first-child]:bg-white dark:[&>div:first-child]:bg-[#1C1C1E]"
          />

        </div>
      </section>

      {/* ── Featured Provinces ────────────────────────────────────────────── */}
      <section id="kham-pha" className="pb-20 px-4">
        <div className="page-wrap">

          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="m-0 text-[1.3125rem] font-bold tracking-tight text-gray-900 dark:text-white">
              Tỉnh thành nổi bật
            </h2>
            <Link
              href="/#kham-pha"
              className="text-[0.875rem] font-medium text-[#0071E3] dark:text-[#409CFF] no-underline hover:opacity-70 transition-opacity"
            >
              Xem tất cả
            </Link>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none m-0 p-0">
            {FEATURED_PROVINCES.map(p => (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  className="flex items-center gap-3.5 p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-[0_2px_8px_rgb(0,0,0,0.07)] dark:shadow-[0_2px_8px_rgb(0,0,0,0.3)] no-underline transition-transform duration-300 hover:scale-[1.02] active:scale-[0.97]"
                >
                  <span className="text-[1.75rem] leading-none shrink-0" aria-hidden="true">
                    {p.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 font-semibold text-[0.9375rem] text-gray-900 dark:text-white truncate">
                      {p.name}
                    </p>
                    <p className="m-0 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {p.count} hộ KD
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

        </div>
      </section>

      {/* ── Land CTA ──────────────────────────────────────────────────────── */}
      <section className="pb-24 px-4">
        <div className="page-wrap">
          <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-[0_2px_16px_rgb(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgb(0,0,0,0.3)] p-8 sm:p-10 flex flex-wrap gap-6 items-center justify-between">

            <div>
              <span className="inline-flex items-center mb-3 px-3 py-1 rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15 text-[#34C759] dark:text-[#30D158] text-[0.6875rem] font-bold tracking-[0.1em] uppercase">
                Đất nông nghiệp
              </span>
              <h2 className="text-[1.5rem] sm:text-[1.75rem] font-bold tracking-tight leading-tight text-gray-900 dark:text-white m-0">
                Mua bán &amp; cho thuê đất<br />nông nghiệp toàn quốc
              </h2>
              <p className="mt-3 m-0 text-gray-500 dark:text-gray-400 text-[0.9375rem] leading-relaxed max-w-[280px]">
                Đất lúa, cây ăn trái, cây lâu năm, lâm nghiệp và nhiều loại khác.
              </p>
            </div>

            <Link
              href="/dat-nong-nghiep"
              className="flex items-center gap-2 px-6 h-11 rounded-full bg-[#0071E3] hover:bg-[#005BBB] active:opacity-75 text-white font-semibold text-[0.9375rem] no-underline transition-colors shrink-0"
            >
              Xem tin đăng
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 7h10M8 3l4 4-4 4" />
              </svg>
            </Link>

          </div>
        </div>
      </section>

    </main>
  )
}
