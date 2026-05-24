import { notFound }     from 'next/navigation'
import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { getLandListingDetail } from '@/features/land-listings/services/land-listing-detail'
import { LAND_TYPE_LABELS }     from '@/features/land-listings/types'
import { SellerCard }           from '@/components/seller-card'

export const revalidate = 3600

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatPrice(amount: number): string {
  if (amount >= 1_000_000_000) {
    const ty  = amount / 1_000_000_000
    const str = ty % 1 === 0 ? `${ty}` : ty.toFixed(1).replace(/\.0$/, '')
    return `${str} Tỷ`
  }
  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)} Triệu`
  return `${amount.toLocaleString('vi-VN')} đ`
}

function normalizeCrops(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return (value as unknown[]).map(String).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function extractLatLng(listing: Record<string, unknown>): { lat: number; lng: number } | null {
  // PostGIS GeoJSON: { type: 'Point', coordinates: [lng, lat] }
  const loc = listing.location as { type?: string; coordinates?: number[] } | undefined
  if (loc?.type === 'Point' && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    const [lng, lat] = loc.coordinates
    return { lat, lng }
  }
  // Separate numeric columns
  if (typeof listing.lat === 'number' && typeof listing.lng === 'number') {
    return { lat: listing.lat, lng: listing.lng }
  }
  // Text "lat, lng"
  if (typeof listing.coordinates_text === 'string') {
    const parts = listing.coordinates_text.split(/[\s,]+/).map(parseFloat)
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] }
    }
  }
  return null
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const supabase  = await createClient()
  const result    = await getLandListingDetail(supabase, slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { listing, geo } = result
  const locationParts = [geo.district?.name, geo.province?.name].filter(Boolean)
  const locationText  = locationParts.length ? ` tại ${locationParts.join(', ')}` : ''
  const title         = `${listing.title}${locationText}`
  const description   = listing.description
    ?? `Đất nông nghiệp${locationText}. ${listing.land_area_text ?? ''}`.trim()

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:    `/dat-nong-nghiep/${listing.slug}`,
      images: result.coverImage ? [{ url: result.coverImage, width: 1200, height: 630 }] : [],
    },
    alternates: { canonical: `/dat-nong-nghiep/${listing.slug}` },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LandListingDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase  = await createClient()
  const result    = await getLandListingDetail(supabase, slug)
  if (!result) notFound()

  const { listing: l, images, geo, profile } = result
  const rawListing = l as unknown as Record<string, unknown>

  const landTypeLabel = l.land_type ? LAND_TYPE_LABELS[l.land_type] : null
  const locationText  = [geo.ward?.name_full, geo.district?.name_full, geo.province?.name_full]
    .filter(Boolean).join(', ')
  const crops         = normalizeCrops(rawListing.current_crops ?? l.crop_type)
  const coords        = extractLatLng(rawListing)
  const coverImage    = images[0]?.image_url ?? null

  // Phone: prefer profile phone, fall back to listing phone
  const phone = profile?.phone ?? l.phone

  const specs: { icon: string; label: string; value: string }[] = ([
    l.land_area_text    && { icon: '📐', label: 'Diện tích',   value: l.land_area_text },
    landTypeLabel       && { icon: '🌾', label: 'Loại đất',    value: landTypeLabel },
    l.legal_status_text && { icon: '📄', label: 'Pháp lý',     value: l.legal_status_text },
    rawListing.soil_type  && { icon: '🪨', label: 'Chất đất',  value: String(rawListing.soil_type) },
    rawListing.water_source && { icon: '💧', label: 'Nguồn nước', value: String(rawListing.water_source) },
    crops.length === 1  && { icon: '🌿', label: 'Cây trồng',   value: crops[0] },
  ] as (false | { icon: string; label: string; value: string })[]).filter(Boolean) as { icon: string; label: string; value: string }[]

  return (
    <>
      <main
        className="min-h-screen"
        style={{ paddingBottom: phone ? 'calc(6rem + env(safe-area-inset-bottom, 0px))' : '3rem' }}
      >
        {/* ── Hero Gallery ── */}
        <div className="relative h-[50vh] min-h-[280px] overflow-hidden rounded-b-[2rem] bg-gray-100 dark:bg-gray-900">
          {coverImage ? (
            <img
              src={coverImage}
              alt={l.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="select-none text-8xl opacity-10" aria-hidden="true">🌾</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          <Link
            href="/dat-nong-nghiep"
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white no-underline backdrop-blur-xl"
            aria-label="Quay lại"
          >
            ←
          </Link>

          {l.legal_status_text && (
            <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
              {l.legal_status_text}
            </span>
          )}

          {images.length > 1 && (
            <span className="absolute bottom-4 right-4 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
              {images.length} ảnh
            </span>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 pt-3">
            {images.slice(1, 7).map(img => (
              <div key={img.id} className="h-[60px] w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                <img src={img.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        <div className="mx-auto max-w-2xl space-y-6 px-4 pt-6">

          {/* Header */}
          <div>
            {l.price_text && (
              <p className="m-0 mb-2 text-[2.5rem] font-bold leading-none tracking-tight text-black dark:text-white">
                {l.price_text}
              </p>
            )}
            <div className="mb-3 flex flex-wrap gap-2">
              {l.legal_status_text && (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {l.legal_status_text}
                </span>
              )}
              {landTypeLabel && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {landTypeLabel}
                </span>
              )}
              {l.is_featured && (
                <span className="rounded-full bg-[#0071E3]/10 px-3 py-1 text-xs font-bold text-[#0071E3] dark:text-[#409CFF]">
                  Nổi bật
                </span>
              )}
            </div>
            <h1 className="m-0 text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
              {l.title}
            </h1>
            {locationText && (
              <p className="m-0 mt-2 text-[0.9375rem] text-gray-500 dark:text-gray-400">
                📍 {locationText}
              </p>
            )}
          </div>

          {/* ── Bento Spec Widgets ── */}
          {specs.length > 0 && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                Thông số
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {specs.map(s => (
                  <div key={s.label} className="rounded-2xl bg-gray-50 p-4 dark:bg-[#1C1C1E]">
                    <p className="m-0 mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-gray-400">
                      {s.icon} {s.label}
                    </p>
                    <p className="m-0 text-[0.9375rem] font-semibold leading-snug text-gray-900 dark:text-white">
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Seller Card ── */}
          {profile && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                Người bán
              </p>
              <SellerCard
                fullName={profile.full_name}
                avatarUrl={profile.avatar_url}
                phone={profile.phone}
                isVerified={profile.is_verified}
              />
            </div>
          )}

          {/* ── Map View ── */}
          {coords && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                Vị trí trên bản đồ
              </p>
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
              <p className="m-0 mt-2 text-center text-xs text-gray-400">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Current crops tags — array with multiple items */}
          {crops.length > 1 && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                🌿 Cây trồng
              </p>
              <div className="flex flex-wrap gap-2">
                {crops.map(crop => (
                  <span
                    key={crop}
                    className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300"
                  >
                    {crop}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {l.description && (
            <div>
              <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
                Mô tả
              </p>
              <p className="m-0 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-gray-600 dark:text-gray-400">
                {l.description}
              </p>
            </div>
          )}

        </div>
      </main>

      {/* ── Sticky Action Bar ── */}
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
