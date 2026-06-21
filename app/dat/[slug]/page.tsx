import { notFound }              from 'next/navigation'
import type { Metadata }         from 'next'
import { createClient }          from '@/lib/supabase/server'
import { breadcrumbSchema }      from '@/lib/seo/schema'
import { getListingDetail, getNearbyListings } from '@/entities/listing/api/listing.server'
import { getActiveSubscription }              from '@/features/billing/api/subscription.server'
import { getMerchantMetrics }                 from '@/features/merchant/api/merchant.server'

import { Gallery }               from './_components/Gallery'
import { KeyFacts, ICONS, type FactItem } from './_components/KeyFacts'
import { LegalDocuments }        from './_components/LegalDocuments'
import { SellerProfile }         from './_components/SellerProfile'
import { MapSection }            from './_components/MapSection'
import { NearbyArea }            from './_components/NearbyArea'
import { SimilarListings }       from './_components/SimilarListings'
import { RightPanel, type TrustChecks } from './_components/RightPanel'
import { MobileBar }             from './_components/MobileBar'
import { ListingQualityScore, type QualityInputs } from './_components/ListingQualityScore'
import { InternalLinks }         from './_components/InternalLinks'
import { AgriculturalSuitability } from './_components/AgriculturalSuitability'
import { LandFactsSheet, type LandFactsSheetProps } from './_components/LandFactsSheet'
import { CrossSellBanner }           from '@/app/_components/CrossSellBanner'
import { AISummarySection }          from './_components/AISummarySection'
import { CropRecommendationSection } from './_components/CropRecommendationSection'
import { LegalReviewCTA }            from './_components/LegalReviewCTA'
import type { SoilType, WaterSource } from '@/entities/listing/model/normalized-types'
import { computeLandScore }          from '@/lib/ai/land-scoring'
import { SharePanel }               from './_components/SharePanel'
import { ExportOpportunities }       from './_components/ExportOpportunities'

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const detail   = await getListingDetail(slug)
  if (!detail) return { title: 'Không tìm thấy' }

  const { listing, geo } = detail
  const province = geo.province?.name ?? ''
  const title    = `${listing.title} — ${province}`
  const desc     = listing.short_description
    ?? `${listing.price_text ?? 'Thương lượng'} · ${province}`

  const enc    = encodeURIComponent
  const ogUrl  = `/api/og?type=listing&title=${enc(listing.title)}&price=${enc(listing.price_text ?? '')}&province=${enc(province)}`
  const ogImages = [{ url: ogUrl, width: 1200, height: 630, alt: title }]

  return {
    title,
    description: desc,
    alternates: { canonical: `/dat/${listing.slug}` },
    openGraph: {
      title,
      description: desc,
      images:      ogImages,
      type:        'article',
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description: desc,
      images:      [ogUrl],
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'mới đây'
  const ms   = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days <= 0)   return 'hôm nay'
  if (days === 1)  return '1 ngày trước'
  if (days < 30)   return `${days} ngày trước`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} tháng trước`
  return `${Math.floor(months / 12)} năm trước`
}

function formatJoinDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  } catch { return null }
}

// ── JSON-LD ───────────────────────────────────────────────────────────────────

function buildJsonLd(
  listing:    ReturnType<typeof Object['assign']>,
  province:   string,
  coverImage: string | null,
) {
  return {
    '@context':   'https://schema.org',
    '@type':      'RealEstateListing',
    name:         listing.title,
    description:  listing.short_description ?? undefined,
    image:        coverImage ?? undefined,
    url:          `https://violocal.vn/dat/${listing.slug}`,
    address:      { '@type': 'PostalAddress', addressLocality: province, addressCountry: 'VN' },
    offers: listing.price_amount
      ? { '@type': 'Offer', price: listing.price_amount, priceCurrency: 'VND' }
      : undefined,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function DatDetailPage({ params }: PageProps) {
  const { slug } = await params

  // Parallel: listing detail + auth
  const supabase   = await createClient()
  const [detail, { data: { user } }] = await Promise.all([
    getListingDetail(slug),
    supabase.auth.getUser(),
  ])

  if (!detail) notFound()

  const {
    listing, media, coverImage, geo, profile, attrs,
    infrastructure, agriculture, completeness,
  } = detail

  // ── Pro check + seller metrics (parallel) ─────────────────────────────────
  let isPro = false
  const [subResult, similar, sellerMetrics] = await Promise.all([
    user ? getActiveSubscription(user.id) : Promise.resolve(null),
    getNearbyListings(
      { id: listing.id, district_id: listing.district_id, province_id: listing.province_id },
      listing.type,
      6,
    ),
    listing.owner_id ? getMerchantMetrics(listing.owner_id) : Promise.resolve(null),
  ])
  if (subResult?.plan_id === 'pro') isPro = true

  // ── Derived display values ────────────────────────────────────────────────
  const province     = geo.province?.name ?? ''
  const district     = geo.district?.name ?? ''
  const locationText = listing.location_text
    ?? ([district, province].filter(Boolean).join(', ') || null)

  const daysListed = formatRelativeDate(listing.published_at ?? listing.created_at)

  // Build location breadcrumb
  const locationParts = [district, province].filter(Boolean)

  // ── Key facts ─────────────────────────────────────────────────────────────
  const areaRaw   = attrs['area_m2']
  const legalRaw  = attrs['legal_status']
  const soilRaw   = attrs['soil_type']
  const waterRaw  = attrs['water_source']
  const roadRaw   = attrs['road_access']
  const cropRaw   = attrs['current_crops']
  const frontRaw  = attrs['frontage']
  const elecRaw   = attrs['electricity']

  const keyFactItems: FactItem[] = []
  if (areaRaw)            keyFactItems.push({ label: 'Diện tích',  value: `${areaRaw} m²`,  icon: ICONS.area })
  if (listing.price_text) keyFactItems.push({ label: 'Giá',        value: listing.price_text, icon: ICONS.price })
  if (legalRaw)           keyFactItems.push({ label: 'Pháp lý',    value: legalRaw,           icon: ICONS.legal })
  if (soilRaw)            keyFactItems.push({ label: 'Loại đất',   value: soilRaw,            icon: ICONS.land })
  if (frontRaw)           keyFactItems.push({ label: 'Mặt tiền',   value: frontRaw,           icon: ICONS.frontage })
  if (roadRaw)            keyFactItems.push({ label: 'Đường vào',  value: roadRaw,            icon: ICONS.road })
  if (waterRaw)           keyFactItems.push({ label: 'Nguồn nước', value: waterRaw,           icon: ICONS.water })
  if (elecRaw)            keyFactItems.push({ label: 'Điện',       value: elecRaw,            icon: ICONS.electricity })
  if (cropRaw)            keyFactItems.push({ label: 'Cây trồng',  value: cropRaw,            icon: ICONS.crop })

  // ── Trust checks ──────────────────────────────────────────────────────────
  const trust: TrustChecks = {
    hasImages:     media.length > 0,
    hasLocation:   !!locationText,
    hasLegal:      !!legalRaw,
    ownerVerified: profile?.is_verified ?? false,
  }

  // ── Land type (coded key e.g. lua, rau_mau) ─────────────────────────────
  const landTypeKey = (listing as unknown as { land_type?: string | null }).land_type ?? null

  const LAND_TYPE_LABELS: Record<string, string> = {
    lua: 'Đất lúa', rau_mau: 'Rau màu', cay_lau_nam: 'Cây lâu năm',
    an_trai: 'Cây ăn trái', lam_nghiep: 'Lâm nghiệp',
    mat_nuoc: 'Nuôi thuỷ sản', hon_hop: 'Đất hỗn hợp',
  }
  const landTypeLabel = landTypeKey ? (LAND_TYPE_LABELS[landTypeKey] ?? null) : null

  // ── Price per m² ─────────────────────────────────────────────────────────
  const pricePerM2: string | null = (() => {
    const area  = areaRaw ? parseFloat(areaRaw) : null
    const price = listing.price_amount
    if (!area || !price || area <= 0) return null
    const ppm2 = price / area
    if (ppm2 < 1000) return null
    return ppm2 >= 1_000_000
      ? `${(ppm2 / 1_000_000).toFixed(1)} triệu/m²`
      : `${Math.round(ppm2).toLocaleString('vi-VN')} ₫/m²`
  })()

  // ── Land Facts Sheet props ────────────────────────────────────────────────
  const landFactsProps: LandFactsSheetProps = {
    areaM2:        areaRaw,
    price_text:    listing.price_text,
    pricePerM2,
    legalStatus:   legalRaw,
    landType:      landTypeKey,
    landTypeLabel,
    roadAccess:    roadRaw,
    waterSource:   waterRaw,
    electricity:   elecRaw,
    irrigation:    attrs['irrigation'] ?? null,
    soilType:      soilRaw,
    currentCrops:  cropRaw,
    frontage:      frontRaw,
    slope:         attrs['slope'] ?? null,
    elevation:     attrs['elevation'] ?? null,
    provinceName:  geo.province?.name ?? null,
    districtName:  geo.district?.name ?? null,
    locationText,
    coordinates:   null,
    isVerified:    listing.is_verified ?? false,
    isPro,
  }

  // ── Quality score inputs (legacy fallback for listings pre-migration 030) ──
  const qualityInputs: QualityInputs = {
    mediaCount:        media.length,
    hasPrice:          !!listing.price_text,
    hasArea:           !!attrs['area_m2'],
    hasLegalStatus:    !!legalRaw,
    descriptionLen:    listing.description?.length ?? 0,
    ownerVerified:     profile?.is_verified ?? false,
    hasLocation:       !!locationText,
    hasLandType:       !!landTypeKey,
    hasContact:        !!listing.contact_phone,
    // Normalized fields (present when listing has sub-entity rows)
    hasGps:            !!(infrastructure?.lat && infrastructure?.lng),
    hasRoadAccess:     infrastructure?.road_access ?? undefined,
    hasWaterSource:    infrastructure?.water_source != null || undefined,
    hasSoilType:       !!agriculture?.soil_type,
    hasCurrentCrops:   !!(agriculture?.current_crops?.length),
    hasCertifications: !!(agriculture?.certifications?.length),
    mediaVideoCount:   media.filter(m => m.type === 'video').length,
  }

  // ── AI features ──────────────────────────────────────────────────────────
  const landScore = computeLandScore(detail)

  // Crop recommendations are shown when we have soil + water data
  const canShowCrops = !!agriculture?.soil_type

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const jsonLd       = buildJsonLd(listing, province, coverImage)
  const breadcrumbs  = breadcrumbSchema([
    { name: 'Trang chủ',        href: '/' },
    { name: 'Đất nông nghiệp',  href: '/dat-nong-nghiep' },
    ...(geo.province
      ? [{ name: geo.province.name, href: `/dat-nong-nghiep/${geo.province.slug}` }]
      : []),
    { name: listing.title },
  ])

  return (
    <>
      {/* JSON-LD — RealEstateListing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* JSON-LD — BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Gallery — full width, bleeds on mobile */}
      <div className="-mx-4 sm:mx-0">
        <Gallery media={media} title={listing.title}/>
      </div>

      {/* Main layout */}
      <div className="mx-auto max-w-[1440px] px-4 pb-32 sm:px-6 lg:px-8">
        <div className="flex gap-8 lg:gap-10">

          {/* ── LEFT COLUMN (70%) ─────────────────────────────────────── */}
          <div className="min-w-0 flex-1 space-y-10 py-8">

            {/* Section 2: Property header */}
            <section>
              {/* Location breadcrumb */}
              {locationParts.length > 0 && (
                <div className="mb-3 flex items-center gap-1.5 text-[12px] text-neutral-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                  {locationParts.join(', ')}
                  {legalRaw && (
                    <>
                      <span className="text-neutral-200">·</span>
                      <span className="font-semibold text-vio-forest">{legalRaw}</span>
                    </>
                  )}
                </div>
              )}

              {/* Title */}
              <h1 className="m-0 text-[22px] font-black leading-snug tracking-tight text-[#1d1d1f]
                             sm:text-[28px]">
                {listing.title}
              </h1>

              {/* Price + area row */}
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {listing.price_text ? (
                  <span className="text-[24px] font-black tracking-tight text-[#1d1d1f] sm:text-[28px]">
                    {listing.price_text}
                  </span>
                ) : (
                  <span className="text-[20px] font-bold text-neutral-400">Thương lượng</span>
                )}
                {areaRaw && (
                  <span className="text-[15px] font-semibold text-neutral-400">
                    {areaRaw} m²
                  </span>
                )}
              </div>

              {/* Verified badge */}
              {listing.is_verified && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full
                                bg-vio-forest/8 px-3 py-1 text-[12px] font-semibold text-vio-forest">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Tin đã xác thực
                </div>
              )}
            </section>

            {/* Share buttons with UTM attribution */}
            <SharePanel
              slug={listing.slug}
              title={listing.title}
              provinceSlug={geo.province?.slug ?? 'viet-nam'}
            />

            {/* AI summary — generated/cached Vietnamese marketing copy */}
            <AISummarySection listingId={listing.id}/>

            {/* Section 3: Key facts */}
            {keyFactItems.length > 0 && <KeyFacts items={keyFactItems}/>}

            {/* Section 4: Land facts sheet */}
            <LandFactsSheet {...landFactsProps}/>

            {/* Section 5: Legal documents */}
            <LegalDocuments
              legalStatus={legalRaw ?? null}
              landType={soilRaw ?? null}
              isPro={isPro}
              listingId={listing.id}
            />

            {/* Legal review CTA — paid verification service */}
            <LegalReviewCTA listingId={listing.id} listingTitle={listing.title}/>

            {/* Section 6: Agricultural suitability */}
            {landTypeKey && (
              <AgriculturalSuitability
                landType={landTypeKey}
                soilTypeAttr={soilRaw ?? null}
                provinceName={geo.province?.name ?? null}
              />
            )}

            {/* Crop recommendations — when soil_type is known */}
            {canShowCrops && (
              <CropRecommendationSection
                soilType={agriculture!.soil_type as SoilType}
                waterSource={(infrastructure?.water_source ?? null) as WaterSource | null}
                provinceName={geo.province?.name ?? ''}
              />
            )}

            {/* Section 6b: Export opportunities for premium crops on this soil */}
            {canShowCrops && agriculture?.soil_type && (
              <ExportOpportunities
                soilType={agriculture.soil_type as SoilType}
                provinceSlug={geo.province?.slug ?? ''}
              />
            )}

            {/* Section 6c: Cross-sell — VIO LOCAL / VIO EXPORT */}
            <CrossSellBanner landType={landTypeKey} />

            {/* Section 7: Description */}
            {listing.description && (
              <section aria-labelledby="desc-heading">
                <h2
                  id="desc-heading"
                  className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
                >
                  Mô tả
                </h2>
                <div className="prose prose-sm max-w-none text-[15px] leading-relaxed text-neutral-600
                                [&_p]:m-0 [&_p+p]:mt-3">
                  {listing.description.split('\n').map((line, i) => (
                    <p key={i}>{line || <br/>}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Section 8: Listing quality score (trust layer) + land score */}
            <ListingQualityScore
              persisted={completeness ?? undefined}
              inputs={completeness ? undefined : qualityInputs}
            />

            {/* Land quality grade */}
            <section>
              {(() => {
                const GRADE_COLOR: Record<string, string> = {
                  A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                  B: 'bg-blue-100   text-blue-700   border-blue-200',
                  C: 'bg-amber-100  text-amber-700  border-amber-200',
                  D: 'bg-neutral-100 text-neutral-500 border-neutral-200',
                }
                const color = GRADE_COLOR[landScore.grade] ?? GRADE_COLOR.D
                return (
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[18px] font-black ${color}`}>
                      {landScore.grade}
                    </div>
                    <div>
                      <p className="m-0 text-[13px] font-semibold text-[#1d1d1f]">
                        Điểm chất lượng đất: {landScore.total}/100
                      </p>
                      <p className="m-0 text-[12px] text-neutral-500">{landScore.summary_vi}</p>
                    </div>
                  </div>
                )
              })()}
            </section>

            {/* Section 9: Seller profile */}
            <SellerProfile
              profile={profile}
              joinDate={null}
              activeListings={null}
              storefrontSlug={null}
            />

            {/* Section 8: Map */}
            <MapSection provinceId={listing.province_id} locationText={locationText}/>

            {/* Section 9: Nearby area */}
            <NearbyArea/>

            {/* Similar listings */}
            <SimilarListings listings={similar}/>

            {/* Internal SEO links */}
            <InternalLinks
              provinceSlug={geo.province?.slug ?? null}
              provinceName={geo.province?.name ?? null}
              districtSlug={geo.district?.slug ?? null}
              districtName={geo.district?.name ?? null}
              landType={landTypeKey}
              landTypeLabel={null}
            />

          </div>

          {/* ── RIGHT COLUMN (30%) ─────────────────────────────────────── */}
          <div className="hidden w-[360px] shrink-0 lg:block xl:w-[400px]">
            <div className="sticky top-[72px]">
              <RightPanel
                price_text={listing.price_text}
                price_per_m2={pricePerM2}
                area_text={areaRaw ? `${areaRaw} m²` : null}
                legal_status={legalRaw ?? null}
                profile={profile}
                profileRole="Chủ đất"
                joinDate={formatJoinDate(null)}
                activeListings={sellerMetrics?.active_listings ?? null}
                sellerTrustScore={sellerMetrics?.trust_score ?? null}
                sellerResponseRate={sellerMetrics?.response_rate_7d ?? null}
                sellerAvgResponseHours={sellerMetrics?.avg_response_hours ?? null}
                isPro={isPro}
                phone={listing.contact_phone}
                zalo={listing.contact_zalo}
                email={listing.contact_email}
                trust={trust}
                listingId={listing.id}
                listingTitle={listing.title}
                daysListed={daysListed}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Mobile sticky bar */}
      <MobileBar
        isPro={isPro}
        phone={listing.contact_phone}
        zalo={listing.contact_zalo}
        email={listing.contact_email}
        listingId={listing.id}
        title={listing.title}
      />
    </>
  )
}
