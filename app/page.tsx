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
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-[clamp(3rem,8vw,5rem)] pb-[clamp(2.5rem,6vw,4rem)] text-center">
        <div className="page-wrap">
          <p className="island-kicker mb-3">Nền tảng thương mại địa phương</p>

          <h1
            className="display-title font-bold text-[var(--sea-ink)] leading-[1.15] mb-4"
            style={{ fontSize: 'clamp(2rem, 6vw, 3.25rem)' }}
          >
            Khám phá Nông sản &amp;<br />
            <span className="text-[var(--lagoon-deep)]">Hộ kinh doanh Địa phương</span>
          </h1>

          <p
            className="text-[var(--sea-ink-soft)] max-w-[520px] mx-auto mb-8 leading-relaxed"
            style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)' }}
          >
            Tìm hộ kinh doanh uy tín, nông sản tươi ngon và đất nông nghiệp trên toàn 63 tỉnh thành Việt Nam.
          </p>

          <SearchAutocomplete className="max-w-md mx-auto w-full px-4 sm:px-0" />
        </div>
      </section>

      {/* ── Featured Provinces Grid ───────────────────────────────────────── */}
      <section id="kham-pha" className="pb-16">
        <div className="page-wrap">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="m-0 text-lg font-bold text-[var(--sea-ink)] shrink-0">
              Tỉnh thành nổi bật
            </h2>
            <div className="flex-1 h-px bg-[var(--line)]" />
            <Link
              href="/#kham-pha"
              className="shrink-0 text-sm text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)]"
            >
              Xem thêm →
            </Link>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none m-0 p-0">
            {FEATURED_PROVINCES.map(p => (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  className="flex items-center gap-3 p-4 rounded-xl border border-[var(--chip-line)] bg-[var(--chip-bg)] no-underline transition-[border-color,box-shadow] duration-150 hover:border-[var(--lagoon)] hover:shadow-sm"
                >
                  <span className="text-2xl leading-none" aria-hidden="true">{p.emoji}</span>
                  <div className="min-w-0">
                    <p className="m-0 font-semibold text-sm text-[var(--sea-ink)] truncate">{p.name}</p>
                    <p className="m-0 text-xs text-[var(--muted)]">{p.count} hộ KD</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Land CTA ─────────────────────────────────────────────────────── */}
      <section className="pb-16">
        <div className="page-wrap">
          <div
            className="island-shell rounded-[1.25rem] flex flex-wrap gap-6 items-center justify-between"
            style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)' }}
          >
            <div>
              <p className="island-kicker mb-2">Đất nông nghiệp</p>
              <h2
                className="display-title m-0 font-bold text-[var(--sea-ink)]"
                style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}
              >
                Mua bán &amp; cho thuê đất<br />nông nghiệp toàn quốc
              </h2>
              <p className="mt-2.5 m-0 text-[var(--sea-ink-soft)] text-[0.9375rem] leading-relaxed">
                Đất lúa, cây ăn trái, cây lâu năm, lâm nghiệp và nhiều loại khác.
              </p>
            </div>
            <Link href="/dat-nong-nghiep" className="btn-primary shrink-0 min-w-[180px]">
              Xem tất cả tin đăng →
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
