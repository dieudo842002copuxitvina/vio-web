import type { Metadata }   from 'next'
import Link                from 'next/link'
import { createClient }    from '@/lib/supabase/server'
import { LandListingCard, type LandListingCardProps, listingToLandCard } from '@/entities/listing'
import { LandSearchAutocomplete }    from '@/features/search/ui/land-search-autocomplete'
import { JsonLd }          from '@/shared/seo/JsonLd'
import { websiteSchema }   from '@/lib/seo/schema'
import { getFeaturedListings as _getFeaturedListings } from '@/entities/listing/api/listing.server'

export const revalidate = 300

// ── Metadata ──────────────────────────────────────────────────────────────────

const SITE_NAME = 'VIO LOCAL'
const TITLE     = 'VIO LOCAL | Nền tảng Giao thương Nông nghiệp & Bất động sản Địa phương'
const DESC      = 'Khám phá và giao dịch đất nông nghiệp, sản phẩm nông nghiệp và hộ kinh doanh địa phương trên toàn Việt Nam. Kết nối trực tiếp với nông dân và đại lý chính thức.'

export const metadata: Metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: {
    title: TITLE, description: DESC,
    type: 'website', locale: 'vi_VN', siteName: SITE_NAME,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/og-image.jpg'] },
  alternates: { canonical: '/' },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BusinessCard {
  id:            string
  slug:          string
  business_name: string
  description:   string | null
  avatar_url:    string | null
  is_verified:   boolean
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getFeaturedListings(): Promise<LandListingCardProps[]> {
  const rows = await _getFeaturedListings({ type: 'land', limit: 6 })
  return rows.map(l => listingToLandCard(l))
}

async function getVerifiedBusinesses(): Promise<BusinessCard[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('storefronts')
    .select('id, slug, business_name, description, avatar_url, is_verified')
    .eq('is_public', true)
    .eq('is_verified', true)
    .order('created_at', { ascending: false })
    .limit(6)

  return (data ?? []) as BusinessCard[]
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const FILTER_CHIPS = [
  { label: 'Đất nông nghiệp', href: '/dat-nong-nghiep', icon: '🌾' },
  { label: 'Đại lý gần đây',  href: '/doanh-nghiep',    icon: '🏪' },
  { label: 'Sản phẩm VIO',    href: '/san-pham',         icon: '📦' },
]

const AREA_LINKS = [
  { name: 'Cẩm Mỹ',    href: '/dat-nong-nghiep/cam-my',    icon: '🌿', count: '120+' },
  { name: 'Xuân Lộc',  href: '/dat-nong-nghiep/xuan-loc',  icon: '🌾', count: '95+'  },
  { name: 'Định Quán', href: '/dat-nong-nghiep/dinh-quan', icon: '🌱', count: '80+'  },
  { name: 'Thống Nhất',href: '/dat-nong-nghiep/thong-nhat',icon: '☕', count: '60+'  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [listings, businesses] = await Promise.all([
    getFeaturedListings(),
    getVerifiedBusinesses(),
  ])

  return (
    <main>
      <JsonLd schema={websiteSchema()} />

      {/* ── Hero ── */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
        <img
          src="https://picsum.photos/seed/vietnam-countryside/1400/900"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/70" />

        <div className="relative z-10 mx-auto w-full max-w-2xl px-4 text-center">
          <span className="mb-5 inline-flex items-center rounded-full bg-white/15 px-3.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/90 backdrop-blur-sm select-none">
            Nền tảng giao thương địa phương
          </span>

          <h1 className="mb-5 text-[2.5rem] font-bold leading-[1.06] tracking-tight text-white sm:text-[3.25rem] lg:text-[4rem]">
            Khám phá Giao thương<br />
            <span className="text-[#34C759]">Nông thôn</span>
          </h1>

          <p className="mx-auto mb-8 max-w-sm text-[1.0625rem] leading-relaxed text-white/75">
            Kết nối trực tiếp với nông dân và hộ kinh doanh trên toàn 63 tỉnh thành.
          </p>

          {/* Glassmorphism search */}
          <div className="mx-auto max-w-[500px]">
            <LandSearchAutocomplete
              placeholder="Tìm kiếm đất nông nghiệp..."
              className="w-full"
            />
          </div>

          {/* Quick filter chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {FILTER_CHIPS.map(chip => (
              <Link
                key={chip.href}
                href={chip.href}
                className={[
                  'flex items-center gap-1.5 rounded-full px-4 py-2',
                  'bg-white/15 text-[0.8125rem] font-semibold text-white no-underline backdrop-blur-md',
                  'border border-white/20 transition-colors hover:bg-white/25',
                ].join(' ')}
              >
                <span aria-hidden="true">{chip.icon}</span>
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Đất Nông Nghiệp Nổi Bật ── */}
      {listings.length > 0 && (
        <section className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Đất Nông Nghiệp Nổi Bật
              </h2>
              <Link
                href="/dat-nong-nghiep"
                className="text-[0.875rem] font-medium text-[#0071E3] no-underline transition-opacity hover:opacity-70 dark:text-[#409CFF]"
              >
                Xem tất cả →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {listings.map(l => <LandListingCard key={l.slug} {...l} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Đại lý xác thực ── */}
      {businesses.length > 0 && (
        <section className="bg-gray-50/60 px-4 py-16 dark:bg-[#141414]">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Đại lý xác thực
              </h2>
              <Link
                href="/doanh-nghiep"
                className="text-[0.875rem] font-medium text-[#0071E3] no-underline transition-opacity hover:opacity-70 dark:text-[#409CFF]"
              >
                Tất cả đại lý →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map(b => (
                <Link
                  key={b.id}
                  href={`/doanh-nghiep/${b.slug}`}
                  className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] no-underline transition-transform duration-200 hover:scale-[1.02] dark:bg-[#1C1C1E]"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    {b.avatar_url
                      ? <img src={b.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      : <div className="flex h-full w-full items-center justify-center text-2xl select-none">🏪</div>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-semibold text-gray-900 dark:text-white">{b.business_name}</p>
                    {b.is_verified && (
                      <p className="m-0 mt-0.5 text-[0.75rem] font-semibold text-[#34C759]">✓ Đã xác thực</p>
                    )}
                    {b.description && (
                      <p className="m-0 mt-0.5 line-clamp-1 text-[0.8125rem] text-gray-500">{b.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Khám phá khu vực — Bento grid ── */}
      <section className="px-4 pb-24 pt-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Khám phá Khu vực
            </h2>
          </div>
          <div className="grid auto-rows-[152px] grid-cols-2 gap-3 md:grid-cols-3">
            <Link
              href={AREA_LINKS[0].href}
              className="col-span-1 flex flex-col justify-between rounded-[2rem] bg-gray-100 p-5 no-underline shadow-[0_1px_4px_rgb(0,0,0,0.06)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] dark:bg-[#1C1C1E] md:row-span-2"
            >
              <span className="select-none text-3xl" aria-hidden="true">{AREA_LINKS[0].icon}</span>
              <div>
                <p className="m-0 text-[1rem] font-bold text-gray-900 dark:text-white">{AREA_LINKS[0].name}</p>
                <p className="m-0 mt-0.5 text-xs text-gray-500 dark:text-gray-400">{AREA_LINKS[0].count} tin đất</p>
              </div>
            </Link>
            <Link
              href={AREA_LINKS[1].href}
              className="col-span-1 flex items-center gap-4 rounded-[2rem] bg-gray-100 p-5 no-underline shadow-[0_1px_4px_rgb(0,0,0,0.06)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] dark:bg-[#1C1C1E] md:col-span-2"
            >
              <span className="select-none text-3xl" aria-hidden="true">{AREA_LINKS[1].icon}</span>
              <div>
                <p className="m-0 text-[1rem] font-bold text-gray-900 dark:text-white">{AREA_LINKS[1].name}</p>
                <p className="m-0 mt-0.5 text-xs text-gray-500 dark:text-gray-400">{AREA_LINKS[1].count} tin đất</p>
              </div>
            </Link>
            {AREA_LINKS.slice(2).map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="col-span-1 flex flex-col justify-between rounded-[2rem] bg-gray-100 p-5 no-underline shadow-[0_1px_4px_rgb(0,0,0,0.06)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] dark:bg-[#1C1C1E]"
              >
                <span className="select-none text-3xl" aria-hidden="true">{a.icon}</span>
                <div>
                  <p className="m-0 text-[1rem] font-bold text-gray-900 dark:text-white">{a.name}</p>
                  <p className="m-0 mt-0.5 text-xs text-gray-500 dark:text-gray-400">{a.count} tin đất</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
