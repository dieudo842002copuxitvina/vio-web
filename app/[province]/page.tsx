import { notFound, redirect }  from 'next/navigation'
import type { Metadata }        from 'next'
import Link                     from 'next/link'
import { createCachedClient }   from '@/lib/supabase/server'
import { LandListingCard }       from '@/entities/listing'
import {
  getRegionalMarketSummary,
  getPriceBenchmarks,
  getInventoryPressure,
  getTrustedMerchantFeed,
  getMarketEvents,
  getEconomicTelemetry,
} from '@/features/commerce/api/regional-ops.server'
import { getTrendingListings }   from '@/features/recommendation/api/recommendation.server'
import { TrackableCard }         from '@/features/recommendation/components/TrackableCard'
import { SectionHeader }         from '@/shared/ui/section-header'
import { ProvinceHero }          from './_components/ProvinceHero'
import { MarketSnapshot }        from './_components/MarketSnapshot'
import { CategoryIntelligence }  from './_components/CategoryIntelligence'
import { OpportunityAlerts }     from './_components/OpportunityAlerts'

export const revalidate = 1800

// ── Province type ─────────────────────────────────────────────────────────────

interface Province {
  id:        number
  code:      string
  name:      string
  name_full: string
  slug:      string
  type:      string
  region:    string
  lat:       number | null
  lng:       number | null
}

// ── Geo resolution ────────────────────────────────────────────────────────────

async function resolveProvince(
  slug: string,
): Promise<{ province: Province; redirectSlug?: string } | null> {
  const supabase = createCachedClient()

  const { data: direct } = await supabase
    .from('provinces')
    .select('id, code, name, name_full, slug, type, region, lat, lng')
    .eq('slug', slug)
    .maybeSingle()

  if (direct) return { province: direct as Province }

  const { data: alias } = await supabase
    .from('geographic_aliases')
    .select('provinces!inner(id, code, name, name_full, slug, type, region, lat, lng)')
    .eq('alias_slug', slug)
    .eq('entity_type', 'province')
    .maybeSingle()

  if (alias?.provinces) {
    const prov = Array.isArray(alias.provinces) ? alias.provinces[0] : alias.provinces
    return { province: prov as Province, redirectSlug: (prov as Province).slug }
  }

  return null
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ province: string }> },
): Promise<Metadata> {
  const { province: slug } = await params
  const result = await resolveProvince(slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { province } = result
  const title       = `${province.name} — Kinh tế địa phương | VIO LOCAL`
  const description = `Thị trường nông nghiệp, doanh nghiệp và đất đai tại ${province.name_full}. Phân tích cung cầu, giá cả và cơ hội đầu tư theo thời gian thực.`

  return {
    title,
    description,
    openGraph: { title, description, url: `/${province.slug}`, type: 'website' },
    alternates: { canonical: `/${province.slug}` },
  }
}

// ── Helper fns (shared by inline sections) ────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function avatarColor(name: string): string {
  const p = ['#1A4D2E', '#0071E3', '#FF9500', '#34C759', '#5856D6', '#FF3B30']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return p[Math.abs(h) % p.length]!
}

function formatResponse(hrs: number): string {
  if (hrs < 1)  return '< 1 giờ'
  if (hrs < 24) return `${Math.round(hrs)} giờ`
  return `${Math.round(hrs / 24)} ngày`
}

// ── Section: Trusted Merchants (province-scoped) ──────────────────────────────

interface StorefrontRow {
  merchant_id:   string
  slug:          string
  business_name: string
  description:   string | null
  avatar_url:    string | null
  is_verified:   boolean
}

async function ProvinceMerchants({
  provinceId, provinceName, provinceSlug,
}: { provinceId: number; provinceName: string; provinceSlug: string }) {
  const trusted = await getTrustedMerchantFeed(provinceId, 6)
  if (!trusted.length) return null

  const supabase = createCachedClient()
  const { data } = await supabase
    .from('storefronts')
    .select('merchant_id, slug, business_name, description, avatar_url, is_verified')
    .in('merchant_id', trusted.map(t => t.profile_id))
    .eq('is_public', true)

  const sfMap = new Map<string, StorefrontRow>(
    ((data ?? []) as StorefrontRow[]).map(s => [s.merchant_id, s]),
  )

  type Merchant = StorefrontRow & {
    trust_score: number; active_listings: number
    avg_response_hours: number; identity_verified: boolean
  }

  const merchants: Merchant[] = trusted
    .map(t => {
      const s = sfMap.get(t.profile_id)
      if (!s) return null
      return {
        ...s,
        trust_score:        t.trust_score,
        active_listings:    t.active_listings,
        avg_response_hours: t.avg_response_hours,
        identity_verified:  t.identity_verified,
      }
    })
    .filter((m): m is Merchant => m !== null)

  if (!merchants.length) return null

  return (
    <section
      className="bg-white px-4 sm:px-6 lg:px-8 py-16 md:py-20"
      aria-labelledby="province-merchants-heading"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          kicker="Doanh nghiệp uy tín"
          kickerColor="text-vio-blue"
          title={`Đối tác đáng tin cậy tại ${provinceName}`}
          subtitle="Xếp hạng theo điểm uy tín, xác thực danh tính và lịch sử giao dịch"
          action={{ label: 'Xem tất cả →', href: `/doanh-nghiep?province=${provinceSlug}` }}
          className="mb-8"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {merchants.map(m => (
            <Link
              key={m.slug}
              href={`/doanh-nghiep/${m.slug}`}
              className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 no-underline
                         shadow-sm transition-all duration-300
                         hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
            >
              <div className="mb-4 flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden
                             rounded-2xl text-sm font-bold text-white"
                  style={{ backgroundColor: avatarColor(m.business_name) }}
                  aria-hidden="true"
                >
                  {m.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    : initials(m.business_name)
                  }
                </div>
                <div className="min-w-0">
                  <p className="m-0 truncate text-[0.9375rem] font-bold leading-tight text-[#0A0A0A]
                                group-hover:text-vio-forest transition-colors">
                    {m.business_name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.identity_verified && (
                      <span className="rounded-full bg-vio-primary/10 px-2 py-0.5 text-[10px] font-bold text-vio-forest">
                        ✓ Định danh
                      </span>
                    )}
                    {m.is_verified && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                        ✓ Xác thực
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {m.description && (
                <p className="m-0 mb-4 line-clamp-2 text-[0.8125rem] leading-snug text-neutral-500">
                  {m.description}
                </p>
              )}

              <div className="mb-3">
                <div className="mb-1 flex justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                    Điểm uy tín
                  </span>
                  <span className="text-[0.8125rem] font-black text-vio-forest">
                    {m.trust_score}
                    <span className="text-[10px] font-normal text-neutral-400">/100</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-vio-primary" style={{ width: `${m.trust_score}%` }} />
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3">
                <div>
                  <p className="m-0 text-sm font-black text-[#0A0A0A]">{m.active_listings}</p>
                  <p className="m-0 text-[10px] text-neutral-400">Tin đăng</p>
                </div>
                <div className="h-6 w-px bg-neutral-100" />
                <div>
                  <p className="m-0 text-sm font-black text-[#0A0A0A]">{formatResponse(m.avg_response_hours)}</p>
                  <p className="m-0 text-[10px] text-neutral-400">Phản hồi</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section: Trending Listings (province-scoped) ──────────────────────────────

async function ProvinceTrending({
  provinceId, provinceName, provinceSlug,
}: { provinceId: number; provinceName: string; provinceSlug: string }) {
  const listings = await getTrendingListings('province', provinceId, 8)
  if (!listings.length) return null

  return (
    <section
      className="bg-neutral-50 px-4 sm:px-6 lg:px-8 py-16 md:py-20"
      aria-labelledby="province-trending-heading"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          kicker="Đang được quan tâm"
          title={`Tin đăng nổi bật tại ${provinceName}`}
          action={{ label: 'Xem thêm →', href: `/dat-nong-nghiep/${provinceSlug}` }}
          className="mb-7"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map(({ id, ...card }, i) => (
            <div key={id} className="relative">
              {i < 4 && (
                <div
                  className="absolute -left-1.5 -top-1.5 z-10 flex h-7 w-7 items-center justify-center
                             rounded-full bg-vio-forest shadow-md ring-2 ring-white"
                  aria-label={`Xu hướng #${i + 1}`}
                >
                  <span className="text-[11px] font-black leading-none text-white">{i + 1}</span>
                </div>
              )}
              <TrackableCard targetId={id} type="seo">
                <LandListingCard {...card} />
              </TrackableCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProvincePage(
  { params }: { params: Promise<{ province: string }> },
) {
  const { province: slug } = await params

  const result = await resolveProvince(slug)
  if (!result) notFound()

  const { province, redirectSlug } = result
  if (redirectSlug) redirect(`/${redirectSlug}`, 301 as never)

  // ── Parallel data fetch (all cached 30 min) ─────────────────────────────────
  const [marketSummary, priceBenchmarks, inventoryPressure, marketEvents, telemetry] =
    await Promise.all([
      getRegionalMarketSummary(province.id, 8),
      getPriceBenchmarks(province.id),
      getInventoryPressure(province.id, 8),
      getMarketEvents({ provinceId: province.id, limit: 6 }),
      getEconomicTelemetry(province.id, 7),
    ])

  // Aggregate hero stats from summary rows
  const totalListings  = marketSummary.reduce((s, r) => s + r.active_listings, 0)
  const totalMerchants = marketSummary.reduce((s, r) => s + r.merchant_count,  0)
  const topSummary     = marketSummary[0]  // highest heat_index (ordered DESC)

  return (
    <main>
      {/* ── 1. Province Hero ────────────────────────────────── */}
      <ProvinceHero
        slug={province.slug}
        name={province.name}
        nameFull={province.name_full}
        region={province.region}
        totalListings={totalListings}
        merchantCount={totalMerchants}
        heatTier={topSummary?.heat_tier ?? null}
      />

      {/* ── 2. Market Snapshot ──────────────────────────────── */}
      <MarketSnapshot
        telemetry={telemetry}
        summary={marketSummary}
      />

      {/* ── 3. Category Intelligence ────────────────────────── */}
      <CategoryIntelligence
        summary={marketSummary}
        benchmarks={priceBenchmarks}
        provinceSlug={province.slug}
      />

      {/* ── 4. Trusted Businesses ───────────────────────────── */}
      <ProvinceMerchants
        provinceId={province.id}
        provinceName={province.name}
        provinceSlug={province.slug}
      />

      {/* ── 5. Trending Listings ────────────────────────────── */}
      <ProvinceTrending
        provinceId={province.id}
        provinceName={province.name}
        provinceSlug={province.slug}
      />

      {/* ── 6. Opportunity Alerts ───────────────────────────── */}
      <OpportunityAlerts
        events={marketEvents}
        pressure={inventoryPressure}
      />
    </main>
  )
}
