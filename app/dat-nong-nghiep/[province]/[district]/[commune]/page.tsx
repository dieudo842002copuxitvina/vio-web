import { notFound, redirect } from 'next/navigation'
import type { Metadata }      from 'next'
import Link                   from 'next/link'
import { createClient }       from '@/lib/supabase/server'
import { LandListingCard }    from '@/entities/listing'
import { listingToLandCard }  from '@/entities/listing'
import { getPageState, getRobotsMeta } from '@/lib/seo/thin-page'
import { breadcrumbSchema, placeSchema, itemListSchema } from '@/lib/seo/schema'
import { seoRowToListing }              from '@/features/seo/api/seo-utils'
import { getCommuneInternalLinks }      from '@/lib/seo/internal-links'
import type { Province }                from '@/lib/geo/types'

export const revalidate = 3600

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface District {
  id:          string
  province_id: string
  name:        string
  name_full:   string
  slug:        string
  lat:         number | null
  lng:         number | null
}

interface Ward {
  id:          string
  district_id: string
  name:        string
  name_full:   string
  slug:        string
  lat:         number | null
  lng:         number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Geo resolution
// ─────────────────────────────────────────────────────────────────────────────

async function resolveGeo(
  provinceSlug: string,
  districtSlug: string,
  communeSlug:  string,
): Promise<{ province: Province; district: District; ward: Ward } | null> {
  const supabase = await createClient()

  const { data: province } = await supabase
    .from('provinces')
    .select('id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at')
    .eq('slug', provinceSlug)
    .maybeSingle()

  if (!province) return null

  const { data: district } = await supabase
    .from('districts')
    .select('id, province_id, name, name_full, slug, lat, lng')
    .eq('slug', districtSlug)
    .eq('province_id', province.id)
    .maybeSingle()

  if (!district) return null

  const { data: ward } = await supabase
    .from('wards')
    .select('id, district_id, name, name_full, slug, lat, lng')
    .eq('slug', communeSlug)
    .eq('district_id', district.id)
    .maybeSingle()

  if (!ward) return null

  return {
    province: province as Province,
    district: district as District,
    ward:     ward     as Ward,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// generateMetadata
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ province: string; district: string; commune: string }> },
): Promise<Metadata> {
  const { province: pSlug, district: dSlug, commune: cSlug } = await params
  const geo = await resolveGeo(pSlug, dSlug, cSlug)
  if (!geo) return { title: 'Không tìm thấy' }

  const { province, district, ward } = geo
  const title       = `Đất nông nghiệp tại ${ward.name_full}, ${district.name}, ${province.name}`
  const description = `Xem danh sách đất nông nghiệp cần bán và cho thuê tại ${ward.name_full}, ${district.name_full}, ${province.name_full}. Kết nối trực tiếp với chủ đất.`

  return {
    title,
    description,
    alternates: { canonical: `/dat-nong-nghiep/${province.slug}/${district.slug}/${ward.slug}` },
    openGraph:  { title, description },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// Listings are filtered at district level (listings.district_id) because the
// listings table doesn't have a ward_id column. The ward context is used for
// SEO copy, structured data, and breadcrumbs.
// ─────────────────────────────────────────────────────────────────────────────

export default async function LandCommunePage(
  { params }: { params: Promise<{ province: string; district: string; commune: string }> },
) {
  const { province: pSlug, district: dSlug, commune: cSlug } = await params

  const geo = await resolveGeo(pSlug, dSlug, cSlug)
  if (!geo) notFound()

  const { province, district, ward } = geo

  if (pSlug !== province.slug || dSlug !== district.slug || cSlug !== ward.slug) {
    redirect(
      `/dat-nong-nghiep/${province.slug}/${district.slug}/${ward.slug}`,
      301 as never,
    )
  }

  const supabase = await createClient()

  // Listings are district-scoped (no ward_id column on listings)
  const [{ data: rows, count }, linkGroups] = await Promise.all([
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
      .order('is_featured',  { ascending: false })
      .order('published_at', { ascending: false })
      .limit(48),

    getCommuneInternalLinks(
      district.id,
      district.name,
      district.slug,
      province.slug,
      province.name,
      ward.slug,
    ),
  ])

  const total     = count ?? 0
  const items     = rows ?? []
  const pageState = getPageState('commune' as 'district', total)
  if (pageState === 'not-found') notFound()
  const robots    = getRobotsMeta(pageState)

  const displayCount = total.toLocaleString('vi-VN')

  // ── Structured data ──────────────────────────────────────────────────────────
  const schemaBreadcrumb = breadcrumbSchema([
    { name: 'Trang chủ',       href: '/' },
    { name: 'Đất nông nghiệp', href: '/dat-nong-nghiep' },
    { name: province.name,     href: `/dat-nong-nghiep/${province.slug}` },
    { name: district.name,     href: `/dat-nong-nghiep/${province.slug}/${district.slug}` },
    { name: ward.name },
  ])

  const schemaPlace = placeSchema({
    name:        ward.name_full,
    description: `Đất nông nghiệp tại ${ward.name_full}, ${district.name_full}`,
    lat:         ward.lat,
    lng:         ward.lng,
  })

  const schemaItems = items.length > 0
    ? itemListSchema({
        name:  `Đất nông nghiệp tại ${ward.name}, ${district.name}, ${province.name}`,
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
            <Link href={`/dat-nong-nghiep/${province.slug}/${district.slug}`}
                  className="no-underline hover:text-gray-600">
              {district.name}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-gray-900">{ward.name}</span>
          </nav>

          {/* Live count */}
          {total > 0 && (
            <div className="mt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3.5
                               py-1.5 text-[0.75rem] font-semibold text-green-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"
                      aria-hidden="true" />
                {displayCount} tin khu vực {district.name}
              </span>
            </div>
          )}

          {/* H1 — commune specific */}
          <h1 className="mt-4 text-[2rem] font-bold leading-tight tracking-tight text-gray-900
                         sm:text-[2.75rem]">
            Đất nông nghiệp tại{' '}
            <span className="text-green-700">{ward.name_full}</span>
          </h1>
          <p className="mt-3 max-w-xl text-[1rem] leading-relaxed text-gray-500">
            Mua bán và cho thuê đất nông nghiệp tại {ward.name_full}, {district.name_full},{' '}
            {province.name_full}. Kết nối trực tiếp với chủ đất — không qua môi giới.
          </p>

          {/* District scope notice */}
          <p className="mt-2 text-[0.8125rem] text-gray-400">
            Hiển thị tin đăng toàn huyện {district.name} (khu vực tốt nhất gần {ward.name}).
          </p>

        </div>
      </div>

      {/* ── Listings ─────────────────────────────────────────────────── */}
      <main className="bg-[#FBFBFD] px-4 pb-20 pt-8 md:px-8">
        <div className="mx-auto max-w-5xl">

          {items.length > 0 ? (
            <section aria-label={`Danh sách đất gần ${ward.name}`}>
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
                  Chưa có tin đăng gần {ward.name}
                </p>
                <p className="m-0 mt-1 text-[0.875rem] text-gray-500">
                  Đây là trang cho người đang tìm kiếm đất tại {ward.name_full}.
                </p>
              </div>
              <Link
                href={`/dat-nong-nghiep/${province.slug}/${district.slug}`}
                className="inline-flex h-11 items-center justify-center rounded-full
                           border border-green-700 px-7 text-sm font-semibold text-green-700
                           no-underline transition-all hover:bg-green-700 hover:text-white
                           active:scale-[0.98]"
              >
                Xem toàn huyện {district.name}
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

          {/* ── Bottom CTA ── */}
          <div className="relative mt-12 overflow-hidden rounded-[28px] bg-[#F5F5F7]
                          px-8 py-12 text-center">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64
                            rounded-full bg-green-200/50 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64
                            rounded-full bg-emerald-100/60 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900">
                Bạn có đất tại {ward.name}?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] text-gray-500">
                Đăng tin miễn phí, tiếp cận người mua đang tìm kiếm tại khu vực này.
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
                  href={`/dat-nong-nghiep/${province.slug}/${district.slug}`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full
                             border border-gray-300 bg-white/70 px-7 text-sm font-semibold
                             text-gray-700 no-underline transition-all hover:bg-white
                             active:scale-[0.98] sm:w-auto"
                >
                  Toàn huyện {district.name} →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
