import { notFound }    from 'next/navigation'
import type { Metadata } from 'next'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { getLandListingDetail } from '@/features/land-listings/services/land-listing-detail'
import { LAND_TYPE_LABELS } from '@/features/land-listings/types'
import type { LandListing } from '@/features/land-listings/types'

export const revalidate = 3600

// ── generateMetadata ────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug }  = await params
  const supabase  = await createClient()
  const result    = await getLandListingDetail(supabase, slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { listing, geo } = result
  const locationParts = [geo.district?.name, geo.province?.name].filter(Boolean)
  const locationText  = locationParts.length ? ` tại ${locationParts.join(', ')}` : ''
  const title         = `${listing.title}${locationText}`
  const description   = listing.description
    ?? `Đất nông nghiệp ${listing.land_type ? LAND_TYPE_LABELS[listing.land_type] : ''}${locationText}. ${listing.land_area_text ?? ''}`.trim()

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:    `/dat-nong-nghiep/chi-tiet/${listing.slug}`,
      images: result.coverImage ? [{ url: result.coverImage, width: 1200, height: 630 }] : [],
    },
    alternates: { canonical: `/dat-nong-nghiep/chi-tiet/${listing.slug}` },
  }
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function LandListingDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const result   = await getLandListingDetail(supabase, slug)
  if (!result) notFound()

  const { listing: l, images, geo, nearby } = result
  const landTypeLabel = l.land_type ? LAND_TYPE_LABELS[l.land_type] : null

  return (
    <>
      <main
        className="max-w-5xl mx-auto px-4 md:px-8 pt-6"
        style={{ paddingBottom: l.phone ? 'calc(5rem + env(safe-area-inset-bottom, 0px))' : '3rem' }}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[0.8125rem] text-gray-400 mb-6 flex-wrap">
          <Link href="/" className="text-gray-400 no-underline hover:text-gray-600 transition-colors">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <Link href="/dat-nong-nghiep" className="text-gray-400 no-underline hover:text-gray-600 transition-colors">Đất nông nghiệp</Link>
          {geo.province && (
            <>
              <span className="text-gray-300">/</span>
              <Link href={`/dat-nong-nghiep/${geo.province.slug}`} className="text-gray-400 no-underline hover:text-gray-600 transition-colors">
                {geo.province.name}
              </Link>
            </>
          )}
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[200px]">{l.title}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">

          {/* ── Left column ── */}
          <div>
            {/* Cover image */}
            {images.length > 0 && (
              <div className="w-full overflow-hidden rounded-[2rem] shadow-[0_4px_24px_rgb(0,0,0,0.10)] mb-6 bg-gray-100 dark:bg-gray-800">
                <img
                  src={images[0].image_url}
                  alt={l.title}
                  width={760}
                  height={440}
                  className="w-full object-cover block"
                  style={{ height: 'clamp(200px, 38vw, 440px)' }}
                  loading="eager"
                />
              </div>
            )}

            {/* Image gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {images.slice(1).map(img => (
                  <div key={img.id} className="shrink-0 w-24 h-[72px] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={img.image_url} alt="" width={96} height={72} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            )}

            {/* Tags + title */}
            <div className="mb-5">
              <div className="flex gap-1.5 flex-wrap mb-2">
                {l.is_featured && (
                  <span className="px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] dark:text-[#409CFF] text-[0.625rem] font-bold tracking-wide uppercase">
                    Nổi bật
                  </span>
                )}
                {landTypeLabel && (
                  <span className="px-2 py-0.5 rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15 text-[#34C759] dark:text-[#30D158] text-[0.625rem] font-bold tracking-wide uppercase">
                    {landTypeLabel}
                  </span>
                )}
              </div>
              <h1 className="m-0 text-[1.625rem] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                {l.title}
              </h1>
            </div>

            {/* Spec grid */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-[0_1px_6px_rgb(0,0,0,0.07)] dark:shadow-[0_1px_6px_rgb(0,0,0,0.25)] p-5 mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {l.land_area_text    && <SpecItem icon="📐" label="Diện tích" value={l.land_area_text} />}
                {l.price_text        && <SpecItem icon="💰" label="Giá"       value={l.price_text} />}
                {landTypeLabel       && <SpecItem icon="🌾" label="Loại đất"  value={landTypeLabel} />}
                {l.crop_type         && <SpecItem icon="🌿" label="Cây trồng" value={l.crop_type} />}
                {l.legal_status_text && <SpecItem icon="📄" label="Pháp lý"   value={l.legal_status_text} />}
                {l.coordinates_text  && <SpecItem icon="📍" label="Tọa độ"    value={l.coordinates_text} />}
              </div>
            </div>

            {/* Location */}
            {(geo.province || geo.district || geo.ward) && (
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-[0_1px_6px_rgb(0,0,0,0.07)] dark:shadow-[0_1px_6px_rgb(0,0,0,0.25)] px-5 py-4 mb-5">
                <p className="m-0 mb-1.5 text-[0.6875rem] font-bold tracking-[0.1em] uppercase text-gray-400">Vị trí</p>
                <p className="m-0 text-[0.9375rem] text-gray-900 dark:text-white font-medium">
                  {[geo.ward?.name_full, geo.district?.name_full, geo.province?.name_full].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {/* Description */}
            {l.description && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="m-0 text-[1.0625rem] font-bold tracking-tight text-gray-900 dark:text-white shrink-0">Mô tả</h2>
                  <div className="flex-1 h-px bg-gray-200/70 dark:bg-white/[0.07]" />
                </div>
                <p className="m-0 text-[0.9375rem] text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {l.description}
                </p>
              </div>
            )}
          </div>

          {/* ── Right sidebar — desktop only ── */}
          <aside className="land-detail-sidebar sticky top-[72px]">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.07)] dark:shadow-[0_2px_12px_rgb(0,0,0,0.3)] p-5">
              <p className="m-0 mb-3 text-[0.6875rem] font-bold tracking-[0.1em] uppercase text-gray-400">Liên hệ người bán</p>
              {l.price_text && (
                <p className="m-0 mb-4 text-[1.375rem] font-bold text-[#0071E3] dark:text-[#409CFF]">
                  {l.price_text}
                </p>
              )}
              {l.phone ? (
                <div className="flex flex-col gap-2.5">
                  <a
                    href={`tel:${l.phone}`}
                    className="flex items-center justify-center gap-2 h-11 rounded-full bg-[#0071E3] hover:bg-[#005BBB] active:opacity-75 text-white font-semibold text-[0.9375rem] no-underline transition-colors"
                  >
                    📞 Gọi Ngay
                  </a>
                  <a
                    href={`https://zalo.me/${l.phone.replace(/^0/, '84')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 h-11 rounded-full bg-black/[0.06] dark:bg-white/[0.1] hover:bg-black/[0.1] active:opacity-75 text-gray-900 dark:text-white font-semibold text-[0.9375rem] no-underline transition-colors"
                  >
                    💬 Zalo
                  </a>
                </div>
              ) : (
                <p className="m-0 text-[0.875rem] text-gray-400">Thông tin liên hệ đang cập nhật.</p>
              )}
            </div>
          </aside>
        </div>

        {/* ── Nearby listings ── */}
        {nearby.length > 0 && (
          <section className="mt-10" aria-label="Đất gần đây">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="m-0 text-[1.0625rem] font-bold tracking-tight text-gray-900 dark:text-white shrink-0">
                Đất nông nghiệp gần đây
              </h2>
              <div className="flex-1 h-px bg-gray-200/70 dark:bg-white/[0.07]" />
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 list-none m-0 p-0">
              {nearby.map(n => <li key={n.id}><NearbyCard listing={n} /></li>)}
            </ul>
          </section>
        )}

      </main>

      {/* ── Mobile floating pill ── */}
      {l.phone && (
        <div
          className="land-sticky-bar fixed bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none px-5"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="pointer-events-auto flex gap-2 p-1.5 rounded-full backdrop-blur-2xl bg-white/80 dark:bg-black/80 shadow-[0_8px_32px_rgb(0,0,0,0.14)] border border-black/[0.06] dark:border-white/[0.08]">
            <a
              href={`tel:${l.phone}`}
              className="flex items-center gap-1.5 px-5 h-11 rounded-full bg-[#0071E3] active:opacity-75 text-white font-semibold text-[0.9375rem] no-underline"
            >
              📞 Gọi Ngay
            </a>
            <a
              href={`https://zalo.me/${l.phone.replace(/^0/, '84')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-5 h-11 rounded-full bg-black/[0.06] dark:bg-white/[0.15] active:opacity-75 text-gray-900 dark:text-white font-semibold text-[0.9375rem] no-underline"
            >
              💬 Zalo
            </a>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .land-sticky-bar { display: none !important; } }
        @media (max-width: 767px) { .land-detail-sidebar { display: none !important; } }
      `}</style>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SpecItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <p className="m-0 mb-0.5 text-[0.6875rem] font-bold tracking-[0.08em] uppercase text-gray-400">{icon} {label}</p>
      <p className="m-0 text-[0.9375rem] font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

function NearbyCard({ listing: n }: { listing: LandListing }) {
  const label = n.land_type ? LAND_TYPE_LABELS[n.land_type] : null
  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${n.slug}`}
      className="flex flex-col gap-1.5 h-full p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-[0_1px_6px_rgb(0,0,0,0.07)] dark:shadow-[0_1px_6px_rgb(0,0,0,0.25)] no-underline transition-transform duration-200 hover:scale-[1.02]"
    >
      {label && (
        <span className="self-start px-2 py-0.5 rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15 text-[#34C759] dark:text-[#30D158] text-[0.625rem] font-bold tracking-wide uppercase">
          {label}
        </span>
      )}
      <p className="m-0 font-semibold text-[0.875rem] text-gray-900 dark:text-white leading-snug">{n.title}</p>
      {n.price_text && (
        <p className="mt-auto m-0 font-bold text-[0.875rem] text-[#34C759] dark:text-[#30D158]">{n.price_text}</p>
      )}
    </Link>
  )
}
