import { notFound }              from 'next/navigation'
import type { Metadata }         from 'next'
import Link                      from 'next/link'
import Image                     from 'next/image'
import { createCachedClient }    from '@/lib/supabase/server'
import { ProvinceMap, type MapListing } from './_components/ProvinceMap'

export const revalidate = 3600

// ── Types ─────────────────────────────────────────────────────────────────────

interface Province {
  id:        number
  name:      string
  name_full: string
  slug:      string
  region:    string
  lat:       number | null
  lng:       number | null
}

interface District {
  id:            number
  name:          string
  slug:          string
  listingCount:  number
}

interface ListingRow {
  id:            string
  slug:          string
  title:         string
  cover_url:     string | null
  location_text: string | null
  price_text:    string | null
  price_amount:  number | null
  is_featured:   boolean
  is_verified:   boolean
  district_id:   number | null
  published_at:  string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} Tỷ`
  if (amount >= 1_000_000)     return `${Math.round(amount / 1_000_000)} Triệu`
  return amount.toLocaleString('vi-VN') + ' đ'
}

function supplyLabel(count: number): string {
  if (count === 0)   return 'Chưa có'
  if (count < 10)    return 'Ít'
  if (count < 50)    return 'Trung bình'
  return 'Nhiều'
}

function supplyBar(count: number): number {
  if (count === 0)  return 0
  if (count < 10)   return 25
  if (count < 50)   return 55
  if (count < 150)  return 75
  return 92
}

function demandLabel(saves: number): string {
  if (saves < 5)  return 'Thấp'
  if (saves < 20) return 'Trung bình'
  return 'Cao'
}

function demandBar(saves: number): number {
  if (saves < 5)  return 20
  if (saves < 20) return 55
  if (saves < 50) return 75
  return 92
}

function priceTrendLabel(recentAvg: number | null, overallAvg: number | null): string | null {
  if (!recentAvg || !overallAvg || overallAvg === 0) return null
  const diff = (recentAvg - overallAvg) / overallAvg
  if (Math.abs(diff) < 0.03) return 'Ổn định'
  if (diff > 0) return `↑ ${(diff * 100).toFixed(0)}%`
  return `↓ ${Math.abs(diff * 100).toFixed(0)}%`
}

function priceTrendPositive(recentAvg: number | null, overallAvg: number | null): boolean {
  if (!recentAvg || !overallAvg || overallAvg === 0) return false
  return recentAvg >= overallAvg
}

// ── Province resolution ───────────────────────────────────────────────────────

async function resolveProvince(slug: string): Promise<Province | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createCachedClient()
  const { data } = await supabase
    .from('provinces')
    .select('id, name, name_full, slug, region, lat, lng')
    .eq('slug', slug)
    .maybeSingle()
  return (data as Province | null) ?? null
}

// ── generateStaticParams ──────────────────────────────────────────────────────

export async function generateStaticParams() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createCachedClient()
  const { data } = await supabase.from('provinces').select('slug')
  return ((data ?? []) as { slug: string }[]).map(p => ({ slug: p.slug }))
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const province  = await resolveProvince(slug)
  if (!province) return { title: 'Không tìm thấy' }

  const title = `Đất nông nghiệp ${province.name} — Mua bán, chuyển nhượng | VIO AGRI`
  const desc  = `Tìm kiếm đất nông nghiệp tại ${province.name_full}. Đất lúa, đất vườn, đất cây lâu năm, đất lâm nghiệp. Pháp lý rõ ràng, liên hệ trực tiếp chủ đất.`

  return {
    title,
    description: desc,
    openGraph: {
      title, description: desc,
      url:  `/tinh/${province.slug}`,
      type: 'website',
    },
    alternates: { canonical: `/tinh/${province.slug}` },
    keywords: [
      `đất nông nghiệp ${province.name.toLowerCase()}`,
      `mua đất nông nghiệp ${province.name.toLowerCase()}`,
      `đất trang trại ${province.name.toLowerCase()}`,
      `đất vườn ${province.name.toLowerCase()}`,
      `đất lúa ${province.name.toLowerCase()}`,
      `chuyển nhượng đất ${province.name.toLowerCase()}`,
    ],
  }
}

function msAgo(days: number) { return Date.now() - days * 86_400_000 }

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProvinceLandPage({ params }: PageProps) {
  const { slug } = await params
  const province  = await resolveProvince(slug)
  if (!province) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createCachedClient()

  const LISTING_COLS = [
    'id', 'slug', 'title', 'cover_url', 'location_text',
    'price_text', 'price_amount', 'is_featured', 'is_verified',
    'district_id', 'published_at',
  ].join(', ')

  const thirtyDaysAgo = new Date(msAgo(30)).toISOString()

  // ── Parallel data fetches ────────────────────────────────────────────────────
  const [
    allListingsRes,
    districtRes,
    recentListingsRes,
    _savesRes,
    similarProvRes,
  ] = await Promise.all([

    // All approved land listings in province (for stats + map)
    supabase
      .from('listings')
      .select(LISTING_COLS)
      .eq('province_id', province.id)
      .eq('listing_type', 'land')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .order('published_at',  { ascending: false })
      .limit(200),

    // Districts in province
    supabase
      .from('districts')
      .select('id, name, slug')
      .eq('province_id', province.id)
      .order('name', { ascending: true }),

    // Recent listings (last 30 days) for price trend
    supabase
      .from('listings')
      .select('price_amount')
      .eq('province_id', province.id)
      .eq('listing_type', 'land')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .gte('published_at', thirtyDaysAgo)
      .not('price_amount', 'is', null),

    // Saves count for demand signal (last 30 days)
    supabase
      .from('listing_saves')
      .select('id', { count: 'exact', head: true })
      .in(
        'listing_id',
        // sub-select trick: pass known IDs once main query resolves
        // We'll compute this post-fetch below
        [],
      ),

    // Similar provinces in same region
    supabase
      .from('provinces')
      .select('id, name, slug')
      .eq('region', province.region)
      .neq('id', province.id)
      .limit(6),
  ])

  const allListings:  ListingRow[]                  = (allListingsRes.data  ?? []) as ListingRow[]
  const districts:    { id: number; name: string; slug: string }[] = (districtRes.data ?? []) as { id: number; name: string; slug: string }[]
  const recentRows:   { price_amount: number }[]   = (recentListingsRes.data ?? []) as { price_amount: number }[]
  const similarProvs: { id: number; name: string; slug: string }[] = (similarProvRes.data ?? []) as { id: number; name: string; slug: string }[]

  // Demand: saves for this province's listings in last 30 days
  let savesCount = 0
  if (allListings.length > 0) {
    const listingIds = allListings.slice(0, 100).map(l => l.id)
    const { count } = await supabase
      .from('listing_saves')
      .select('id', { count: 'exact', head: true })
      .in('listing_id', listingIds)
      .gte('created_at', thirtyDaysAgo)
    savesCount = count ?? 0
  }

  // ── Compute stats ────────────────────────────────────────────────────────────
  const totalCount = allListings.length

  const pricesAll    = allListings.filter(l => l.price_amount != null).map(l => l.price_amount!)
  const overallAvg   = pricesAll.length > 0 ? pricesAll.reduce((a, b) => a + b, 0) / pricesAll.length : null

  const pricesRecent = recentRows.filter(r => r.price_amount != null).map(r => r.price_amount)
  const recentAvg    = pricesRecent.length > 0 ? pricesRecent.reduce((a, b) => a + b, 0) / pricesRecent.length : null

  const trend         = priceTrendLabel(recentAvg, overallAvg)
  const trendPositive = priceTrendPositive(recentAvg, overallAvg)

  // Top listings (featured first, max 6)
  const featuredListings = allListings.slice(0, 6)

  // Map listings (up to 60 pins)
  const mapListings: MapListing[] = allListings.slice(0, 60).map(l => ({
    id:          l.id,
    slug:        l.slug,
    title:       l.title,
    price_text:  l.price_text,
    province_id: province.id,
  }))

  // District listing counts
  const districtCountMap = new Map<number, number>()
  for (const l of allListings) {
    if (l.district_id) districtCountMap.set(l.district_id, (districtCountMap.get(l.district_id) ?? 0) + 1)
  }
  const districtRows: District[] = districts
    .map(d => ({ ...d, listingCount: districtCountMap.get(d.id) ?? 0 }))
    .sort((a, b) => b.listingCount - a.listingCount)
    .filter(d => d.listingCount > 0 || districts.length <= 12)

  // ── JSON-LD ──────────────────────────────────────────────────────────────────
  const jsonLd = {
    '@context':      'https://schema.org',
    '@type':         'CollectionPage',
    name:            `Đất nông nghiệp ${province.name}`,
    description:     `${totalCount} mảnh đất nông nghiệp tại ${province.name_full}`,
    url:             `https://vio.vn/tinh/${province.slug}`,
    breadcrumb: {
      '@type':        'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://vio.vn' },
        { '@type': 'ListItem', position: 2, name: 'Tỉnh thành', item: 'https://vio.vn/tinh' },
        { '@type': 'ListItem', position: 3, name: province.name, item: `https://vio.vn/tinh/${province.slug}` },
      ],
    },
  }

  return (
    <div className="bg-[#FBFBFD]">

      {/* ── JSON-LD ─────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── S1: Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0D1A12] px-4 pb-14 pt-10
                          sm:px-6 sm:pb-16 sm:pt-12 lg:px-8">
        {/* Radial depth */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_80%,rgba(26,77,46,0.5),transparent)]"/>

        <div className="relative mx-auto max-w-[1200px]">

          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-[12px] text-white/40" aria-label="Breadcrumb">
            <Link href="/"          className="no-underline hover:text-white/70 transition-colors">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <Link href="/tim-kiem"  className="no-underline hover:text-white/70 transition-colors">Đất nông nghiệp</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/70">{province.name}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_260px] lg:items-end">

            {/* Left */}
            <div>
              <span className="inline-block rounded-full border border-white/10 bg-white/5
                               px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
                {province.region}
              </span>

              {/* SEO H1 — exact target keyword */}
              <h1 className="mt-4 text-[36px] font-black leading-[1.05] tracking-tight text-white
                             sm:text-[48px] lg:text-[56px]">
                Đất nông nghiệp<br/>
                <span className="text-vio-primary">{province.name}</span>
              </h1>

              <p className="mt-3 text-[15px] text-white/50">
                {province.name_full} · {province.region}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/tim-kiem?province=${province.slug}`}
                  className="inline-flex h-12 items-center gap-2 rounded-[14px]
                             bg-vio-primary px-7 text-[14px] font-bold text-white
                             no-underline shadow-[0_4px_24px_rgba(52,199,89,0.3)]
                             transition-all hover:bg-vio-primary-dark"
                >
                  Xem {totalCount > 0 ? `${totalCount} ` : ''}tin đăng
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <Link
                  href={`/tim-kiem?province=${province.slug}&sort=price_asc`}
                  className="inline-flex h-12 items-center rounded-[14px]
                             border border-white/15 bg-white/8 px-7 text-[14px]
                             font-semibold text-white/80 no-underline backdrop-blur-sm
                             transition-colors hover:bg-white/15"
                >
                  Giá thấp nhất
                </Link>
              </div>
            </div>

            {/* Right — stat panel */}
            <div className="rounded-2xl border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-white/50">Tin đăng</span>
                  <span className="text-[18px] font-black text-white">
                    {totalCount > 0 ? totalCount.toLocaleString('vi-VN') : '—'}
                  </span>
                </div>
                <div className="h-px bg-white/8"/>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-white/50">Giá trung bình</span>
                  <span className="text-[16px] font-black text-white">
                    {overallAvg ? fmtPrice(overallAvg) : '—'}
                  </span>
                </div>
                <div className="h-px bg-white/8"/>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-white/50">30 ngày qua</span>
                  <span className={[
                    'text-[13px] font-bold',
                    trend === null ? 'text-white/40' :
                    trendPositive  ? 'text-vio-primary' : 'text-red-400',
                  ].join(' ')}>
                    {trend ?? '—'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">

        {/* ── S2: Featured Land ─────────────────────────────────── */}
        {featuredListings.length > 0 && (
          <section className="py-14" aria-labelledby="featured-heading">
            <div className="mb-6 flex items-center justify-between">
              <h2 id="featured-heading"
                  className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                Đất nổi bật tại {province.name}
              </h2>
              <Link
                href={`/tim-kiem?province=${province.slug}`}
                className="text-[13px] font-semibold text-vio-forest no-underline
                           transition-colors hover:text-vio-forest/70"
              >
                Xem tất cả
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredListings.map(listing => (
                <Link
                  key={listing.id}
                  href={`/dat/${listing.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-100
                             bg-white no-underline shadow-[0_1px_4px_rgba(0,0,0,0.04)]
                             transition-shadow hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)]
                             hover:-translate-y-px"
                >
                  {/* Thumbnail */}
                  <div className="relative h-[160px] overflow-hidden bg-neutral-100">
                    {listing.cover_url ? (
                      <Image
                        src={listing.cover_url}
                        alt={listing.title}
                        fill
                        sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-300">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M3 16l5-5 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}
                    {listing.is_featured && (
                      <span className="absolute left-3 top-3 rounded-full bg-vio-amber px-2 py-0.5
                                       text-[10px] font-bold uppercase tracking-wide text-white">
                        Nổi bật
                      </span>
                    )}
                    {listing.is_verified && (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center
                                       rounded-full bg-vio-forest/90 text-white">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    {listing.price_text ? (
                      <p className="m-0 text-[17px] font-black leading-none tracking-tight text-[#1d1d1f]">
                        {listing.price_text}
                      </p>
                    ) : (
                      <p className="m-0 text-[14px] font-semibold text-neutral-400">Thương lượng</p>
                    )}
                    <p className="m-0 line-clamp-2 text-[13px] font-semibold leading-snug text-[#1d1d1f]">
                      {listing.title}
                    </p>
                    {listing.location_text && (
                      <div className="mt-auto flex items-center gap-1.5 pt-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-neutral-300">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        </svg>
                        <span className="truncate text-[11px] text-neutral-400">{listing.location_text}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── S3: Area Grid ────────────────────────────────────── */}
        {districtRows.length > 0 && (
          <section className="border-t border-neutral-100 py-14" aria-labelledby="district-heading">
            <h2 id="district-heading"
                className="mb-6 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Theo quận / huyện
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {districtRows.map(d => (
                <Link
                  key={d.id}
                  href={`/tim-kiem?province=${province.slug}&district=${d.slug}`}
                  className="group flex flex-col gap-2 rounded-xl border border-neutral-100 bg-white
                             p-4 no-underline shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                             transition-all hover:border-vio-forest/20 hover:bg-[#F4FAF5]"
                >
                  <p className="m-0 text-[13px] font-semibold text-[#1d1d1f]
                                group-hover:text-vio-forest transition-colors">
                    {d.name}
                  </p>
                  <p className="m-0 text-[11px] text-neutral-400">
                    {d.listingCount > 0
                      ? `${d.listingCount} tin`
                      : 'Chưa có tin'}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── S4: Market Insight ───────────────────────────────── */}
        <section className="border-t border-neutral-100 py-14" aria-labelledby="market-heading">
          <h2 id="market-heading"
              className="mb-6 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
            Thị trường đất nông nghiệp {province.name}
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

            {/* Avg price */}
            <div className="rounded-2xl border border-neutral-100 bg-white p-5
                            shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                Giá trung bình
              </p>
              <p className="m-0 mt-2 text-[22px] font-black leading-none tracking-tight text-[#1d1d1f]">
                {overallAvg ? fmtPrice(overallAvg) : '—'}
              </p>
              <p className="m-0 mt-1 text-[11px] text-neutral-400">
                {pricesAll.length > 0 ? `${pricesAll.length} lô có giá` : 'Chưa đủ dữ liệu'}
              </p>
            </div>

            {/* Price trend */}
            <div className="rounded-2xl border border-neutral-100 bg-white p-5
                            shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                Xu hướng giá
              </p>
              <p className={[
                'm-0 mt-2 text-[22px] font-black leading-none tracking-tight',
                trend === null ? 'text-neutral-300' :
                trendPositive  ? 'text-vio-forest'  : 'text-red-500',
              ].join(' ')}>
                {trend ?? '—'}
              </p>
              <p className="m-0 mt-1 text-[11px] text-neutral-400">
                so với trung bình
              </p>
            </div>

            {/* Supply */}
            <div className="rounded-2xl border border-neutral-100 bg-white p-5
                            shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                Nguồn cung
              </p>
              <p className="m-0 mt-2 text-[22px] font-black leading-none tracking-tight text-[#1d1d1f]">
                {supplyLabel(totalCount)}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-vio-forest/60 transition-all"
                  style={{ width: `${supplyBar(totalCount)}%` }}
                />
              </div>
              <p className="m-0 mt-1 text-[11px] text-neutral-400">{totalCount} tin đang hiển thị</p>
            </div>

            {/* Demand */}
            <div className="rounded-2xl border border-neutral-100 bg-white p-5
                            shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                Nhu cầu
              </p>
              <p className="m-0 mt-2 text-[22px] font-black leading-none tracking-tight text-[#1d1d1f]">
                {demandLabel(savesCount)}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-vio-amber/70 transition-all"
                  style={{ width: `${demandBar(savesCount)}%` }}
                />
              </div>
              <p className="m-0 mt-1 text-[11px] text-neutral-400">{savesCount} lượt lưu / 30 ngày</p>
            </div>

          </div>
        </section>

        {/* ── S5: Map ──────────────────────────────────────────── */}
        <section className="border-t border-neutral-100 py-14" aria-labelledby="map-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="map-heading"
                className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Bản đồ đất nông nghiệp {province.name}
            </h2>
            {mapListings.length > 0 && (
              <span className="text-[12px] text-neutral-400">{mapListings.length} vị trí</span>
            )}
          </div>

          <ProvinceMap
            provinceId={province.id}
            provinceName={province.name}
            listings={mapListings}
          />

          <p className="mt-2 text-[11px] text-neutral-400">
            Vị trí hiển thị là trung tâm tỉnh/huyện. Liên hệ chủ đất để xem vị trí chính xác.
          </p>
        </section>

        {/* ── S6: Similar provinces ────────────────────────────── */}
        {similarProvs.length > 0 && (
          <section className="border-t border-neutral-100 py-14" aria-labelledby="similar-heading">
            <h2 id="similar-heading"
                className="mb-6 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Tỉnh lân cận — {province.region}
            </h2>

            <div className="flex flex-wrap gap-2">
              {similarProvs.map(p => (
                <Link
                  key={p.id}
                  href={`/tinh/${p.slug}`}
                  className="rounded-full border border-neutral-200 bg-white px-4 py-2
                             text-[13px] font-semibold text-neutral-600 no-underline
                             shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                             transition-all hover:border-vio-forest/25 hover:text-vio-forest"
                >
                  Đất nông nghiệp {p.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── SEO text ─────────────────────────────────────────── */}
        <section className="border-t border-neutral-100 py-14">
          <div className="mx-auto max-w-[760px]">
            <h2 className="m-0 mb-4 text-[18px] font-bold text-[#1d1d1f]">
              Mua đất nông nghiệp {province.name}
            </h2>
            <div className="space-y-3 text-[14px] leading-relaxed text-neutral-500">
              <p className="m-0">
                VIO AGRI là nền tảng chuyên về đất nông nghiệp tại {province.name_full}.
                Hiện tại có <strong className="text-[#1d1d1f]">{totalCount} lô đất</strong> đang
                được rao bán, bao gồm đất lúa, đất vườn, đất cây lâu năm, đất lâm nghiệp và đất trang trại.
              </p>
              <p className="m-0">
                Tất cả tin đăng đều có thông tin pháp lý rõ ràng (Sổ đỏ, Sổ hồng) và được kiểm duyệt
                trước khi hiển thị. Người mua có thể liên hệ trực tiếp với chủ đất hoặc môi giới thông qua
                hệ thống của VIO AGRI.
              </p>
              {overallAvg && (
                <p className="m-0">
                  Giá trung bình đất nông nghiệp {province.name} hiện ở mức{' '}
                  <strong className="text-[#1d1d1f]">{fmtPrice(overallAvg)}</strong> mỗi lô.
                  Giá cả biến động tùy theo vị trí, diện tích và loại đất.
                </p>
              )}
            </div>

            {/* SEO FAQ */}
            <div className="mt-8 space-y-4">
              <div>
                <h3 className="m-0 text-[14px] font-bold text-[#1d1d1f]">
                  Đất nông nghiệp {province.name} có sổ đỏ không?
                </h3>
                <p className="m-0 mt-1.5 text-[13px] text-neutral-500">
                  Có. Nhiều lô đất tại {province.name} đã có Sổ đỏ (GCNQSDĐ) hoặc Sổ hồng.
                  Bạn có thể lọc theo pháp lý ngay trên trang tìm kiếm của VIO AGRI.
                </p>
              </div>
              <div>
                <h3 className="m-0 text-[14px] font-bold text-[#1d1d1f]">
                  Làm sao để liên hệ chủ đất tại {province.name}?
                </h3>
                <p className="m-0 mt-1.5 text-[13px] text-neutral-500">
                  Nhấn vào bất kỳ tin đăng nào để xem chi tiết. Người dùng Pro có thể xem
                  số điện thoại và Zalo trực tiếp. Người dùng Free có thể nâng cấp để tiếp cận
                  thông tin liên hệ.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
