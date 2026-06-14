import { notFound, redirect } from 'next/navigation'
import type { Metadata }      from 'next'
import Link                   from 'next/link'
import { createClient, createCachedClient } from '@/lib/supabase/server'
import { LandListingCard }    from '@/entities/listing'
import { listingToLandCard }  from '@/entities/listing'
import { getPageState, getRobotsMeta } from '@/lib/seo/thin-page'
import { breadcrumbSchema, itemListSchema, faqPageSchema } from '@/lib/seo/schema'
import { seoRowToListing }    from '@/features/seo/api/seo-utils'
import { getMarketStats }     from '@/lib/seo/statistics.server'
import { buildLandTypeFAQ }   from '@/lib/seo/faq'
import { MarketStatsModule }  from '../../_components/MarketStatsModule'
import type { Province }      from '@/lib/geo/types'

export const revalidate = 3600

// ── Land type catalogue ───────────────────────────────────────────────────────

const LAND_TYPES: Record<string, { key: string; label: string; description: string }> = {
  'lua':         { key: 'lua',         label: 'Đất lúa',        description: 'Đất trồng lúa nước, phù hợp canh tác lúa và rau màu.' },
  'rau-mau':     { key: 'rau_mau',     label: 'Rau màu',        description: 'Đất chuyên canh rau, củ, quả và cây hàng năm.' },
  'cay-lau-nam': { key: 'cay_lau_nam', label: 'Cây lâu năm',    description: 'Đất trồng cà phê, hồ tiêu, cao su và cây công nghiệp lâu năm.' },
  'an-trai':     { key: 'an_trai',     label: 'Cây ăn trái',    description: 'Vườn cây ăn trái: sầu riêng, xoài, bưởi, nhãn.' },
  'lam-nghiep':  { key: 'lam_nghiep',  label: 'Lâm nghiệp',     description: 'Đất rừng sản xuất, rừng kinh tế.' },
  'mat-nuoc':    { key: 'mat_nuoc',    label: 'Nuôi thuỷ sản',  description: 'Đất mặt nước nuôi tôm, cá, thuỷ sản.' },
  'hon-hop':     { key: 'hon_hop',     label: 'Đất hỗn hợp',    description: 'Đất đa canh kết hợp nhiều loại hình sản xuất.' },
}

// ── Geo resolution ────────────────────────────────────────────────────────────

async function resolveProvince(slug: string): Promise<{ province: Province; redirectSlug?: string } | null> {
  const supabase = await createClient()
  const { data: direct } = await supabase
    .from('provinces')
    .select('id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (direct) return { province: direct as Province }

  const { data: alias } = await supabase
    .from('geographic_aliases')
    .select('provinces!inner(id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at)')
    .eq('alias_slug', slug)
    .eq('entity_type', 'province')
    .maybeSingle()

  if (alias?.provinces) {
    const prov = Array.isArray(alias.provinces) ? alias.provinces[0] : alias.provinces
    return { province: prov as Province, redirectSlug: (prov as Province).slug }
  }
  return null
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ province: string; type: string }> },
): Promise<Metadata> {
  const { province: pSlug, type: tSlug } = await params
  const [geo, def] = [await resolveProvince(pSlug), LAND_TYPES[tSlug]]
  if (!geo || !def) return { title: 'Không tìm thấy' }

  const { province } = geo
  const title       = `${def.label} tại ${province.name_full} — Mua bán đất nông nghiệp`
  const description = `Danh sách ${def.label} cần bán tại ${province.name_full}. ${def.description} Kết nối trực tiếp với chủ đất, không qua môi giới.`

  return {
    title,
    description,
    alternates: { canonical: `/dat-nong-nghiep/${province.slug}/loai/${tSlug}` },
    openGraph:  { title, description },
  }
}

// ── generateStaticParams ──────────────────────────────────────────────────────
// Pre-build province × type combos that have >= 3 listings at build time.

export async function generateStaticParams() {
  const supabase = createCachedClient()
  const { data } = await supabase
    .from('listings')
    .select('province_id, land_type, provinces!inner(slug)')
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .not('land_type', 'is', null)
    .limit(5_000)

  if (!data) return []

  // Count by province × land_type
  const counts: Record<string, number> = {}
  const slugMap: Record<string, string> = {}
  for (const row of data) {
    const r = row as unknown as { province_id: string; land_type: string; provinces: { slug: string } }
    const key = `${r.province_id}::${r.land_type}`
    counts[key] = (counts[key] ?? 0) + 1
    slugMap[r.province_id] = r.provinces.slug
  }

  // Reverse map: land_type DB key → URL slug
  const typeToSlug: Record<string, string> = {
    lua: 'lua', rau_mau: 'rau-mau', cay_lau_nam: 'cay-lau-nam',
    cay_an_trai: 'an-trai', lam_nghiep: 'lam-nghiep', mat_nuoc: 'mat-nuoc', hon_hop: 'hon-hop',
  }

  return Object.entries(counts)
    .filter(([, n]) => n >= 3)
    .map(([key]) => {
      const [provinceId, landType] = key.split('::')
      return { province: slugMap[provinceId], type: typeToSlug[landType] ?? landType }
    })
    .filter(p => p.province && p.type)
}

// ── FAQ UI ────────────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProvinceTypePage(
  { params }: { params: Promise<{ province: string; type: string }> },
) {
  const { province: pSlug, type: tSlug } = await params
  const def = LAND_TYPES[tSlug]
  if (!def) notFound()

  const result = await resolveProvince(pSlug)
  if (!result) notFound()

  const { province, redirectSlug } = result
  if (redirectSlug) redirect(`/dat-nong-nghiep/${redirectSlug}/loai/${tSlug}`, 301 as never)

  const supabase = await createClient()

  const [{ data: rows, count }, stats] = await Promise.all([
    supabase
      .from('listings')
      .select(
        'id, slug, title, cover_url, price_text, location_text, land_type, is_featured, is_verified, published_at',
        { count: 'exact' },
      )
      .eq('listing_type', 'land')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .eq('province_id', province.id)
      .eq('land_type', def.key)
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(48),

    getMarketStats({ provinceId: Number(province.id), landType: def.key }),
  ])

  const total     = count ?? 0
  const items     = rows ?? []
  const pageState = getPageState('province', total)
  if (pageState === 'not-found') notFound()
  const robots    = getRobotsMeta(pageState)

  // Other land types in this province for cross-linking
  const otherTypes = Object.entries(LAND_TYPES).filter(([k]) => k !== tSlug)

  const faqItems = buildLandTypeFAQ(def.label, province.name)

  // Structured data
  const schemaBreadcrumb = breadcrumbSchema([
    { name: 'Trang chủ',       href: '/' },
    { name: 'Đất nông nghiệp', href: '/dat-nong-nghiep' },
    { name: province.name,     href: `/dat-nong-nghiep/${province.slug}` },
    { name: def.label },
  ])
  const schemaItems = items.length > 0
    ? itemListSchema({
        name:  `${def.label} tại ${province.name}`,
        items: items.map(r => ({ slug: r.slug as string, title: r.title as string })),
      })
    : null
  const schemaFaq = faqPageSchema(faqItems)

  const displayCount = total.toLocaleString('vi-VN')

  return (
    <>
      <meta name="robots" content={robots} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }} />
      {schemaItems && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaItems) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFaq) }} />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-gray-200/60 bg-[#FBFBFD]">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96
                        rounded-full bg-green-200/40 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-8 md:px-8 md:pb-14 md:pt-10">

          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-gray-400"
               aria-label="Điều hướng">
            <Link href="/" className="no-underline hover:text-gray-600">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <Link href="/dat-nong-nghiep" className="no-underline hover:text-gray-600">Đất nông nghiệp</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/dat-nong-nghiep/${province.slug}`}
                  className="no-underline hover:text-gray-600">
              {province.name}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-gray-900">{def.label}</span>
          </nav>

          {total > 0 && (
            <div className="mt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3.5
                               py-1.5 text-[0.75rem] font-semibold text-green-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
                {displayCount} tin đang hoạt động
              </span>
            </div>
          )}

          <h1 className="mt-4 text-[2rem] font-bold leading-tight tracking-tight text-gray-900
                         sm:text-[2.75rem]">
            <span className="text-green-700">{def.label}</span>
            {' '}tại{' '}
            <span>{province.name_full}</span>
          </h1>

          <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-gray-500">
            {def.description} Kết nối trực tiếp với chủ đất tại {province.name} — không qua môi giới.
          </p>

          {/* Market statistics */}
          {stats.listing_count > 0 && (
            <div className="mt-5">
              <MarketStatsModule stats={stats} />
            </div>
          )}

          {/* Cross-type pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/dat-nong-nghiep/${province.slug}`}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5
                         text-[0.8125rem] font-medium text-gray-600 no-underline
                         hover:border-green-300 hover:bg-green-50 hover:text-green-700"
            >
              Tất cả loại đất
            </Link>
            {otherTypes.map(([key, val]) => (
              <Link
                key={key}
                href={`/dat-nong-nghiep/${province.slug}/loai/${key}`}
                className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5
                           text-[0.8125rem] font-medium text-gray-600 no-underline
                           hover:border-green-300 hover:bg-green-50 hover:text-green-700"
              >
                {val.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Listings ─────────────────────────────────────────────────── */}
      <main className="bg-[#FBFBFD] px-4 pb-20 pt-8 md:px-8">
        <div className="mx-auto max-w-5xl">

          {items.length > 0 ? (
            <section aria-label={`${def.label} tại ${province.name}`}>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[0.9375rem] font-bold text-gray-900">
                  {displayCount} tin đăng
                </p>
                <Link
                  href="/dang-tin"
                  className="rounded-full border border-green-600 px-4 py-2
                             text-[0.8125rem] font-semibold text-green-700 no-underline
                             transition-colors hover:bg-green-600 hover:text-white"
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
                  Chưa có tin {def.label} tại {province.name}
                </p>
                <p className="m-0 mt-1 text-[0.875rem] text-gray-500">
                  Hãy là người đầu tiên đăng tin tại khu vực này
                </p>
              </div>
              <Link
                href="/dang-tin"
                className="inline-flex h-11 items-center justify-center rounded-full
                           bg-green-700 px-7 text-sm font-semibold text-white no-underline
                           transition-all hover:bg-green-800 active:scale-[0.98]"
              >
                Đăng tin {def.label} tại {province.name}
              </Link>
            </div>
          )}

          {/* ── Cross-link to national land type page ──────────── */}
          <div className="mt-10 rounded-[20px] border border-gray-100 bg-white p-5">
            <p className="mb-3 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-gray-400">
              Xem thêm
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dat-nong-nghiep/loai/${tSlug}`}
                className="rounded-full border border-gray-200 bg-[#F5F5F7] px-3.5 py-1.5
                           text-[0.8125rem] font-medium text-gray-700 no-underline
                           hover:border-green-300 hover:text-green-700"
              >
                {def.label} toàn quốc →
              </Link>
              <Link
                href={`/dat-nong-nghiep/${province.slug}`}
                className="rounded-full border border-gray-200 bg-[#F5F5F7] px-3.5 py-1.5
                           text-[0.8125rem] font-medium text-gray-700 no-underline
                           hover:border-green-300 hover:text-green-700"
              >
                Tất cả đất tại {province.name} →
              </Link>
              <Link
                href="/dat-nong-nghiep"
                className="rounded-full border border-gray-200 bg-[#F5F5F7] px-3.5 py-1.5
                           text-[0.8125rem] font-medium text-gray-700 no-underline
                           hover:border-green-300 hover:text-green-700"
              >
                Đất nông nghiệp toàn quốc →
              </Link>
            </div>
          </div>

          {/* ── FAQ ─────────────────────────────────────────────── */}
          <FAQModule items={faqItems} />

          {/* ── Bottom CTA ──────────────────────────────────────── */}
          <div className="relative mt-14 overflow-hidden rounded-[28px] bg-[#F5F5F7] px-8 py-12 text-center">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64
                            rounded-full bg-green-200/50 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900">
                Bạn có {def.label} tại {province.name}?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] text-gray-500">
                Đăng tin miễn phí, tiếp cận người mua đang tìm {def.label} tại {province.name}.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/dang-tin"
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
                             text-gray-700 no-underline hover:bg-white sm:w-auto"
                >
                  Xem tất cả đất tại {province.name} →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
