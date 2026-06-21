import { notFound, redirect } from 'next/navigation'
import type { Metadata }      from 'next'
import Link                   from 'next/link'
import { createClient }       from '@/lib/supabase/server'
import { LandListingCard }    from '@/entities/listing'
import { listingToLandCard }  from '@/entities/listing'
import { getPageState, getRobotsMeta } from '@/lib/seo/thin-page'
import { breadcrumbSchema, placeSchema, itemListSchema, faqPageSchema } from '@/lib/seo/schema'
import { seoRowToListing }              from '@/features/seo/api/seo-utils'
import { getDistrictInternalLinks }     from '@/lib/seo/internal-links'
import { getMarketStats }               from '@/lib/seo/statistics.server'
import { buildDistrictFAQ }             from '@/lib/seo/faq'
import { MarketStatsModule }            from '../_components/MarketStatsModule'
import type { Province } from '@/lib/geo/types'

// ── FAQ UI ─────────────────────────────────────────────────────────────────────

function FAQModule({ items }: { items: Array<{ question: string; answer: string }> }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-16">
      <div className="mb-5">
        <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">
          Giải đáp thắc mắc
        </p>
        <h2 id="faq-heading" className="mt-1 text-xl font-bold tracking-tight text-gray-900">
          Câu hỏi thường gặp
        </h2>
      </div>
      <div className="divide-y divide-gray-100 rounded-[20px] border border-gray-200 bg-white">
        {items.map((item, i) => (
          <details key={i} className="group px-5 py-4 open:pb-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <span className="text-[0.9375rem] font-semibold text-gray-900 leading-snug">
                {item.question}
              </span>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                               bg-gray-100 text-gray-500 group-open:bg-green-100 group-open:text-green-700
                               transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                     className="group-open:rotate-45 transition-transform duration-200">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-gray-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export const revalidate = 3600

// ── Types ─────────────────────────────────────────────────────────────────────

interface District {
  id:         string
  code:       string
  province_id: string
  name:       string
  name_full:  string
  slug:       string
  type:       string
  lat:        number | null
  lng:        number | null
}

// ── Geo resolution ─────────────────────────────────────────────────────────────

async function resolveGeo(
  provinceSlug: string,
  districtSlug: string,
): Promise<{ province: Province; district: District } | null> {
  const supabase = await createClient()

  const { data: province } = await supabase
    .from('provinces')
    .select('id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at')
    .eq('slug', provinceSlug)
    .maybeSingle()

  if (!province) return null

  const { data: district } = await supabase
    .from('districts')
    .select('id, code, province_id, name, name_full, slug, type, lat, lng')
    .eq('slug', districtSlug)
    .eq('province_id', province.id)
    .maybeSingle()

  if (!district) return null

  return { province: province as Province, district: district as District }
}

// ── generateMetadata ───────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ province: string; district: string }> },
): Promise<Metadata> {
  const { province: pSlug, district: dSlug } = await params
  const geo = await resolveGeo(pSlug, dSlug)
  if (!geo) return { title: 'Không tìm thấy' }

  const { province, district } = geo
  const title = `Đất nông nghiệp tại ${district.name_full}, ${province.name}`
  const description = `Danh sách đất nông nghiệp cần bán và cho thuê tại ${district.name_full}, ${province.name_full}. Kết nối trực tiếp với chủ đất.`

  return {
    title,
    description,
    alternates: { canonical: `/dat-nong-nghiep/${province.slug}/${district.slug}` },
    openGraph: { title, description },
  }
}

// ── Land type quick filters ────────────────────────────────────────────────────

const LAND_TYPES = [
  { label: 'Tất cả',               value: '' },
  { label: 'Đất lúa',              value: 'lua' },
  { label: 'Cây ăn trái',          value: 'cay-an-trai' },
  { label: 'Cây lâu năm',          value: 'cay-lau-nam' },
  { label: 'Nuôi trồng thuỷ sản',  value: 'thuy-san' },
] as const

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function LandDistrictPage(
  { params }: { params: Promise<{ province: string; district: string }> },
) {
  const { province: pSlug, district: dSlug } = await params

  const geo = await resolveGeo(pSlug, dSlug)
  if (!geo) notFound()

  const { province, district } = geo

  // Redirect if province slug doesn't match canonical
  if (pSlug !== province.slug) {
    redirect(`/dat-nong-nghiep/${province.slug}/${district.slug}`, 301 as never)
  }

  // Fetch listings + internal links + market stats in parallel
  const supabase = await createClient()
  const [{ data: rows, count }, linkGroups, stats] = await Promise.all([
    supabase
      .from('listings')
      .select(
        'id, slug, title, cover_url, price_text, location_text, land_type, is_featured, is_verified, published_at',
        { count: 'exact' },
      )
      .eq('listing_type', 'land')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .eq('district_id', district.id)
      .order('is_featured', { ascending: false })
      .order('published_at',  { ascending: false })
      .limit(48),

    getDistrictInternalLinks(
      district.id,
      district.slug,
      province.slug,
      province.name,
    ),

    getMarketStats({ districtId: Number(district.id) }),
  ])

  const total     = count ?? 0
  const items     = rows ?? []
  const pageState = getPageState('district', total)
  if (pageState === 'not-found') notFound()
  const robots    = getRobotsMeta(pageState)

  const displayCount = total.toLocaleString('vi-VN')
  const faqItems     = buildDistrictFAQ(district.name, province.name)

  // ── Structured data ────────────────────────────────────────────────────────
  const schemaFaq        = faqPageSchema(faqItems)
  const schemaBreadcrumb = breadcrumbSchema([
    { name: 'Trang chủ',        href: '/' },
    { name: 'Đất nông nghiệp',  href: '/dat-nong-nghiep' },
    { name: province.name,      href: `/dat-nong-nghiep/${province.slug}` },
    { name: district.name },
  ])

  const schemaPlace = placeSchema({
    name:        district.name_full,
    description: `Đất nông nghiệp tại ${district.name_full}, ${province.name_full}`,
    lat:         district.lat,
    lng:         district.lng,
  })

  const schemaItems = items.length > 0
    ? itemListSchema({
        name:  `Đất nông nghiệp tại ${district.name}, ${province.name}`,
        items: items.map(r => ({ slug: r.slug as string, title: r.title as string })),
      })
    : null

  return (
    <>
      <meta name="robots" content={robots} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaPlace) }} />
      {schemaItems && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaItems) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFaq) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-gray-200/60 bg-[#FBFBFD]">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96
                        rounded-full bg-green-200/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96
                        rounded-full bg-emerald-100/50 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-8 md:px-8 md:pb-14 md:pt-10">

          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-gray-400"
               aria-label="Điều hướng vị trí">
            <Link href="/" className="no-underline hover:text-gray-600">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <Link href="/dat-nong-nghiep" className="no-underline hover:text-gray-600">
              Đất nông nghiệp
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={`/dat-nong-nghiep/${province.slug}`}
                  className="no-underline hover:text-gray-600">
              {province.name}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-gray-900">{district.name}</span>
          </nav>

          {/* Live count */}
          {total > 0 && (
            <div className="mt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3.5
                               py-1.5 text-[0.75rem] font-semibold text-green-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"
                      aria-hidden="true" />
                {displayCount} tin đang hoạt động
              </span>
            </div>
          )}

          {/* H1 */}
          <h1 className="mt-4 text-[2rem] font-bold leading-tight tracking-tight text-gray-900
                         sm:text-[2.75rem]">
            Đất nông nghiệp tại{' '}
            <span className="text-green-700">{district.name_full}</span>
          </h1>
          <p className="mt-3 max-w-xl text-[1rem] leading-relaxed text-gray-500">
            Mua bán và cho thuê đất nông nghiệp tại {district.name}, {province.name}.
            Kết nối trực tiếp với chủ đất — không qua môi giới.
          </p>

          {/* Market statistics */}
          {stats.listing_count > 0 && (
            <div className="mt-5">
              <MarketStatsModule stats={stats} />
            </div>
          )}

          {/* Land type quick filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            {LAND_TYPES.map(t => (
              <Link
                key={t.value}
                href={
                  t.value
                    ? `/dat-nong-nghiep/${province.slug}/${district.slug}?loai=${t.value}`
                    : `/dat-nong-nghiep/${province.slug}/${district.slug}`
                }
                className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5
                           text-[0.8125rem] font-medium text-gray-600 no-underline
                           transition-colors hover:border-green-300 hover:bg-green-50
                           hover:text-green-700 active:scale-[0.96]"
              >
                {t.label}
              </Link>
            ))}
          </div>

        </div>
      </div>

      {/* ── Listings ─────────────────────────────────────────────────── */}
      <main className="bg-[#FBFBFD] px-4 pb-20 pt-8 md:px-8">
        <div className="mx-auto max-w-5xl">

          {/* Thin-page notice */}
          {pageState === 'noindex' && total > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="m-0 text-[0.875rem] text-amber-800">
                {district.name_full} hiện có <strong>{total}</strong> tin đăng.
              </p>
            </div>
          )}

          {items.length > 0 ? (
            <section aria-label={`Danh sách đất tại ${district.name}`}>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[0.9375rem] font-bold text-gray-900">
                  {displayCount} tin đăng
                </p>
                <Link
                  href="/dang-tin-dat"
                  className="rounded-full border border-green-600 px-4 py-2 text-[0.8125rem]
                             font-semibold text-green-700 no-underline transition-colors
                             hover:bg-green-600 hover:text-white active:scale-[0.97]"
                >
                  + Đăng tin
                </Link>
              </div>

              <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(row => (
                  <li key={row.id as string}>
                    <LandListingCard
                      {...listingToLandCard(seoRowToListing(row as unknown as Parameters<typeof seoRowToListing>[0]))}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="flex flex-col items-center gap-5 rounded-[28px] border-2
                            border-dashed border-gray-200 bg-white py-20 text-center">
              <span className="select-none text-6xl opacity-20" aria-hidden="true">🌾</span>
              <div>
                <p className="m-0 text-[1rem] font-semibold text-gray-900">
                  Chưa có tin đăng tại {district.name}
                </p>
                <p className="m-0 mt-1 text-[0.875rem] text-gray-500">
                  Hãy là người đầu tiên đăng tin tại khu vực này
                </p>
              </div>
              <Link
                href="/dang-tin-dat"
                className="inline-flex h-11 items-center justify-center rounded-full
                           bg-green-700 px-7 text-sm font-semibold text-white no-underline
                           transition-all hover:bg-green-800 active:scale-[0.98]"
              >
                Đăng tin tại {district.name}
              </Link>
            </div>
          )}

          {/* ── Internal linking graph ── */}
          {linkGroups.length > 0 && (
            <div className="mt-12 space-y-8">
              {linkGroups.map(group => (
                <div key={group.heading}>
                  <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                    {group.heading}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {group.links.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5
                                   text-[0.8125rem] font-medium text-gray-600 no-underline
                                   transition-colors hover:border-green-300 hover:bg-green-50
                                   hover:text-green-700"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── FAQ ── */}
          <FAQModule items={faqItems} />

          {/* ── Bottom CTA ── */}
          <div className="relative mt-12 overflow-hidden rounded-[28px] bg-[#F5F5F7]
                          px-8 py-12 text-center">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64
                            rounded-full bg-green-200/50 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64
                            rounded-full bg-emerald-100/60 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900">
                Bạn có đất tại {district.name}?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] text-gray-500">
                Đăng tin miễn phí, tiếp cận người mua đang tìm kiếm ở khu vực này.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row
                              sm:justify-center">
                <Link
                  href="/dang-tin-dat"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full
                             bg-green-800 px-7 text-sm font-semibold text-white no-underline
                             transition-all hover:bg-green-900 active:scale-[0.98] sm:w-auto"
                >
                  Đăng tin ngay — miễn phí
                </Link>
                <Link
                  href={`/dat-nong-nghiep/${province.slug}`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full
                             border border-gray-300 bg-white/70 px-7 text-sm font-semibold
                             text-gray-700 no-underline transition-all hover:bg-white
                             active:scale-[0.98] sm:w-auto"
                >
                  Xem toàn tỉnh {province.name} →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
