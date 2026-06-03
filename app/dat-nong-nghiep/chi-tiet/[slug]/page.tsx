import { notFound }          from 'next/navigation'
import { Suspense }           from 'react'
import type { Metadata }      from 'next'
import Link                   from 'next/link'
import { createClient }       from '@/lib/supabase/server'
import {
  getListingDetail,
}                             from '@/entities/listing/api/listing.server'
import type { Listing }       from '@/entities/listing'
import { SimilarListings }    from '@/features/recommendation/components/SimilarListings'

export const revalidate = 3600

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeCrops(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return (value as unknown[]).map(String).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function extractLatLng(coordsText: string | null | undefined): { lat: number; lng: number } | null {
  if (!coordsText) return null
  const p = coordsText.split(/[\s,]+/).map(parseFloat)
  if (p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1])) return { lat: p[0], lng: p[1] }
  return null
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const result   = await getListingDetail(slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { listing: l, geo } = result
  const loc   = [geo.district?.name, geo.province?.name].filter(Boolean).join(', ')
  const title = `${l.title}${loc ? ` tại ${loc}` : ''}`
  const desc  = l.description ?? `${l.price_text ?? ''} ${loc ? `tại ${loc}` : ''}`.trim()

  return {
    title,
    description: desc,
    openGraph: {
      title, description: desc,
      url: `/dat-nong-nghiep/chi-tiet/${l.slug}`,
      images: result.coverImage ? [{ url: result.coverImage, width: 1200, height: 630 }] : [],
    },
    alternates: { canonical: `/dat-nong-nghiep/chi-tiet/${l.slug}` },
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NearbyCard({ n }: { n: Listing }) {
  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${n.slug}`}
      className="flex h-full flex-col gap-1.5 rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgb(0,0,0,0.07)] no-underline transition-transform duration-200 hover:scale-[1.02] dark:bg-[#1C1C1E]"
    >
      <p className="m-0 text-[0.875rem] font-semibold leading-snug text-gray-900 dark:text-white">{n.title}</p>
      {n.price_text && (
        <p className="m-0 mt-auto text-[0.875rem] font-bold text-[#34C759]">{n.price_text}</p>
      )}
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LandDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const result   = await getListingDetail(slug)
  if (!result) notFound()

  const { listing: l, media, geo, nearby, profile, attrs } = result

  // Resolve land-specific display values from attribute map
  const areaText      = attrs.area_m2 ?? null
  const legalStatus   = attrs.legal_status ?? null
  const soilType      = attrs.soil_type ?? null
  const waterSource   = attrs.water_source ?? null
  // current_crops may be stored as multiselect JSON; attrs map already resolves to string
  const cropsResolved = attrs.current_crops ?? null
  const crops         = normalizeCrops(cropsResolved)

  const phone         = profile?.phone ?? l.contact_phone
  const locationText  = [geo.ward?.name_full, geo.district?.name_full, geo.province?.name_full].filter(Boolean).join(', ')

  // coords: not in listings table; skip map embed for now
  const coords = null as { lat: number; lng: number } | null

  // Attribute grid (mirrors the original attrGrid shape)
  const attrGrid: { icon: string; label: string; value: string }[] = [
    areaText   && { icon: '📐', label: 'Diện tích',  value: areaText },
    legalStatus && { icon: '📄', label: 'Pháp lý',    value: legalStatus },
    soilType   && { icon: '🪨', label: 'Chất đất',   value: soilType },
    waterSource && { icon: '💧', label: 'Nguồn nước', value: waterSource },
    crops.length === 1 && { icon: '🌿', label: 'Cây trồng', value: crops[0] },
  ].filter(Boolean) as { icon: string; label: string; value: string }[]

  // JSON-LD schema
  const schema = {
    '@context': 'https://schema.org',
    '@type':    'RealEstateListing',
    name:        l.title,
    description: l.description ?? undefined,
    url:         `/dat-nong-nghiep/chi-tiet/${l.slug}`,
    image:       result.coverImage ?? undefined,
    offers: l.price_text ? {
      '@type':        'Offer',
      priceCurrency:  'VND',
      priceSpecification: { '@type': 'PriceSpecification', description: l.price_text },
    } : undefined,
    address: locationText ? {
      '@type':         'PostalAddress',
      addressLocality: geo.district?.name ?? undefined,
      addressRegion:   geo.province?.name ?? undefined,
      addressCountry:  'VN',
    } : undefined,
  }

  return (
    <>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <main
        className="min-h-screen"
        style={{ paddingBottom: phone ? 'calc(6rem + env(safe-area-inset-bottom, 0px))' : '3rem' }}
      >

        {/* ── Image Gallery Grid ── */}
        {media.length > 0 ? (
          <div className="grid h-[55vw] max-h-[480px] min-h-[260px] overflow-hidden rounded-b-[2rem] bg-gray-100 dark:bg-gray-900"
            style={{ gridTemplateColumns: media.length > 1 ? '2fr 1fr' : '1fr', gridTemplateRows: media.length > 2 ? '1fr 1fr' : '1fr' }}
          >
            {/* Hero image */}
            <div className="relative row-span-2 overflow-hidden">
              <img
                src={media[0].url}
                alt={l.title}
                className="h-full w-full object-cover"
                loading="eager"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
            {/* Thumbnails */}
            {media.slice(1, 3).map((img, i) => (
              <div key={img.id} className={['relative overflow-hidden', i === 1 ? '' : 'border-t border-white/30'].join(' ')}>
                <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                {i === 1 && media.length > 3 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-lg font-bold text-white">+{media.length - 3}</span>
                  </div>
                )}
              </div>
            ))}
            {/* Back button */}
            <Link
              href="/dat-nong-nghiep"
              className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white no-underline backdrop-blur-xl"
              aria-label="Quay lại"
            >
              ←
            </Link>
          </div>
        ) : (
          <div className="relative h-[40vw] max-h-[320px] min-h-[200px] overflow-hidden rounded-b-[2rem] bg-gray-100 dark:bg-gray-900">
            <div className="flex h-full items-center justify-center">
              <span className="select-none text-8xl opacity-10" aria-hidden="true">🌾</span>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            <Link
              href="/dat-nong-nghiep"
              className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white no-underline backdrop-blur-xl"
              aria-label="Quay lại"
            >
              ←
            </Link>
          </div>
        )}

        {/* ── Key Metrics Bar ── */}
        <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/[0.07] dark:bg-black/90">
          {l.price_text && (
            <p className="m-0 text-[1.375rem] font-bold leading-none tracking-tight text-gray-900 dark:text-white">
              {l.price_text}
            </p>
          )}
          {l.price_text && areaText && (
            <div className="h-5 w-px bg-gray-200 dark:bg-white/20" />
          )}
          {areaText && (
            <p className="m-0 text-[0.9375rem] font-semibold text-gray-500 dark:text-gray-400">
              📐 {areaText}
            </p>
          )}
          {legalStatus && (
            <span className="ml-auto rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {legalStatus}
            </span>
          )}
        </div>

        {/* ── Content ── */}
        <div className="mx-auto max-w-2xl space-y-6 px-4 pt-6">

          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-gray-400" aria-label="Breadcrumb">
            <Link href="/" className="text-gray-400 no-underline hover:text-gray-600">Trang chủ</Link>
            <span aria-hidden="true" className="text-gray-300">/</span>
            <Link href="/dat-nong-nghiep" className="text-gray-400 no-underline hover:text-gray-600">Đất nông nghiệp</Link>
            {geo.province && (
              <>
                <span aria-hidden="true" className="text-gray-300">/</span>
                <Link href={`/dat-nong-nghiep/${geo.province.slug}`} className="text-gray-400 no-underline hover:text-gray-600">
                  {geo.province.name}
                </Link>
              </>
            )}
            <span aria-hidden="true" className="text-gray-300">/</span>
            <span className="max-w-[200px] truncate font-medium text-gray-700 dark:text-gray-300">{l.title}</span>
          </nav>

          {/* Title + location */}
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {l.is_featured && (
                <span className="rounded-full bg-[#0071E3]/10 px-3 py-1 text-xs font-bold text-[#0071E3]">
                  Nổi bật
                </span>
              )}
            </div>
            <h1 className="m-0 text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
              {l.title}
            </h1>
            {locationText && (
              <p className="m-0 mt-2 text-[0.9375rem] text-gray-500 dark:text-gray-400">📍 {locationText}</p>
            )}
          </div>

          {/* ── Attributes Grid ── */}
          {attrGrid.length > 0 && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Thông số</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attrGrid.map(a => (
                  <div key={a.label} className="rounded-2xl bg-gray-50 p-4 dark:bg-[#1C1C1E]">
                    <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-gray-400">
                      {a.icon} {a.label}
                    </p>
                    <p className="m-0 text-[0.9375rem] font-semibold leading-snug text-gray-900 dark:text-white">
                      {a.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Multiple crops */}
          {crops.length > 1 && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">🌿 Cây trồng</p>
              <div className="flex flex-wrap gap-2">
                {crops.map(crop => (
                  <span key={crop} className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300">
                    {crop}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Seller Identity Card ── */}
          {profile && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Người bán</p>
              <div className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#1C1C1E]">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    : <div className="flex h-full w-full items-center justify-center text-2xl select-none">👤</div>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-semibold text-gray-900 dark:text-white truncate">
                    {profile.full_name ?? 'Chủ đất'}
                  </p>
                  {profile.is_verified && (
                    <p className="m-0 mt-0.5 text-[0.75rem] font-semibold text-[#34C759]">✓ Đã xác thực</p>
                  )}
                </div>
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="shrink-0 rounded-xl bg-vio-primary px-4 py-2.5 text-sm font-bold text-white no-underline transition-opacity hover:opacity-90"
                  >
                    Liên hệ ngay
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── Map placeholder — coords not in listings table yet ── */}
          {coords && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Vị trí trên bản đồ</p>
              <div className="h-64 overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-800">
                <iframe
                  title="Vị trí lô đất"
                  src={`https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`}
                  width="100%"
                  height="100%"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="border-0"
                />
              </div>
            </div>
          )}

          {/* ── Description ── */}
          {l.description && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Mô tả</p>
              <p className="m-0 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-gray-600 dark:text-gray-400">
                {l.description}
              </p>
            </div>
          )}

          {/* ── Nearby listings ── */}
          {nearby.length > 0 && (
            <section aria-label="Đất nông nghiệp gần đây">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="m-0 shrink-0 text-[1.0625rem] font-bold tracking-tight text-gray-900 dark:text-white">
                  Đất gần đây
                </h2>
                <div className="h-px flex-1 bg-gray-200/70 dark:bg-white/[0.07]" />
              </div>
              <ul className="grid grid-cols-1 gap-3 list-none m-0 p-0 sm:grid-cols-2">
                {nearby.map(n => <li key={n.id}><NearbyCard n={n} /></li>)}
              </ul>
            </section>
          )}

          {/* ── Similar listings (Recommendation Engine) ── */}
          <Suspense fallback={null}>
            <SimilarListings
              listingId={l.id}
              provinceId={l.province_id}
              categoryId={l.category_id}
            />
          </Suspense>

        </div>
      </main>

      {/* ── Sticky Call Bar ── */}
      {phone && (
        <div
          className="fixed bottom-0 z-50 w-full border-t border-gray-200 bg-white/80 p-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/80"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <a
            href={`tel:${phone}`}
            className="flex w-full items-center justify-center rounded-full bg-black py-4 text-lg font-bold text-white no-underline transition-opacity active:opacity-70 dark:bg-white dark:text-black"
          >
            📞 Gọi Chủ Đất
          </a>
        </div>
      )}
    </>
  )
}
