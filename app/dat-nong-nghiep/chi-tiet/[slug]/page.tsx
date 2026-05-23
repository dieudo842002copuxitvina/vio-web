import { notFound }    from 'next/navigation'
import type { Metadata } from 'next'
import { createClient }  from '@/lib/supabase/server'
import { getLandListingDetail } from '@/features/land-listings/services/land-listing-detail'
import { LAND_TYPE_LABELS } from '@/features/land-listings/types'
import type { LandListing } from '@/features/land-listings/types'

export const revalidate = 3600

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

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
    <main className="page-wrap" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
        <a href="/" style={{ color: 'var(--muted)' }}>Trang chủ</a>
        {' / '}
        <a href="/dat-nong-nghiep" style={{ color: 'var(--muted)' }}>Đất nông nghiệp</a>
        {geo.province && (
          <>
            {' / '}
            <a href={`/dat-nong-nghiep/${geo.province.slug}`} style={{ color: 'var(--muted)' }}>{geo.province.name}</a>
          </>
        )}
        {' / '}
        <span style={{ color: 'var(--sea-ink)' }}>{l.title}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: '2rem', alignItems: 'start' }}>
        {/* Left column */}
        <div>
          {/* Cover image */}
          {images.length > 0 && (
            <div style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--line)', marginBottom: '1.5rem', background: 'var(--sand)' }}>
              <img
                src={images[0].image_url}
                alt={l.title}
                width={760}
                height={440}
                style={{ width: '100%', height: 'clamp(200px, 38vw, 440px)', objectFit: 'cover', display: 'block' }}
                loading="eager"
              />
            </div>
          )}

          {/* Image gallery */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {images.slice(1).map(img => (
                <div key={img.id} style={{ flexShrink: 0, width: '96px', height: '72px', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <img src={img.image_url} alt="" width={96} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {/* Title + tags */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
              {l.is_featured && (
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--lagoon-deep)', background: 'rgba(79,184,178,0.12)', padding: '2px 8px', borderRadius: '999px' }}>
                  Nổi bật
                </span>
              )}
              {landTypeLabel && (
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--palm)', background: 'rgba(47,106,74,0.08)', padding: '2px 8px', borderRadius: '999px' }}>
                  {landTypeLabel}
                </span>
              )}
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)', fontWeight: 700, color: 'var(--sea-ink)', lineHeight: 1.3 }}>
              {l.title}
            </h1>
          </div>

          {/* Spec grid */}
          <div className="island-shell" style={{ borderRadius: '0.875rem', padding: '1.125rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.875rem' }}>
              {l.land_area_text    && <SpecItem icon="📐" label="Diện tích"    value={l.land_area_text} />}
              {l.price_text        && <SpecItem icon="💰" label="Giá"          value={l.price_text} />}
              {landTypeLabel       && <SpecItem icon="🌾" label="Loại đất"     value={landTypeLabel} />}
              {l.crop_type         && <SpecItem icon="🌿" label="Cây trồng"    value={l.crop_type} />}
              {l.legal_status_text && <SpecItem icon="📄" label="Pháp lý"      value={l.legal_status_text} />}
              {l.coordinates_text  && <SpecItem icon="📍" label="Tọa độ"       value={l.coordinates_text} />}
            </div>
          </div>

          {/* Location */}
          {(geo.province || geo.district || geo.ward) && (
            <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--line)', background: 'var(--surface)' }}>
              <p className="island-kicker" style={{ margin: '0 0 0.5rem' }}>Vị trí</p>
              <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--sea-ink)' }}>
                {[geo.ward?.name_full, geo.district?.name_full, geo.province?.name_full].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Description */}
          {l.description && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sea-ink)', marginBottom: '0.625rem' }}>Mô tả</h2>
              <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--sea-ink-soft)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                {l.description}
              </p>
            </div>
          )}
        </div>

        {/* Right sidebar — contact card (desktop only) */}
        <aside style={{ position: 'sticky', top: '72px' }}>
          <div className="island-shell" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
            <p className="island-kicker" style={{ margin: '0 0 0.75rem' }}>Liên hệ người bán</p>
            {l.price_text && (
              <p style={{ margin: '0 0 1rem', fontSize: '1.375rem', fontWeight: 700, color: 'var(--lagoon-deep)' }}>
                {l.price_text}
              </p>
            )}
            {l.phone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <a
                  href={`tel:${l.phone}`}
                  className="btn-primary"
                  style={{ justifyContent: 'center', gap: '0.5rem' }}
                >
                  📞 Gọi Ngay
                </a>
                <a
                  href={`https://zalo.me/${l.phone.replace(/^0/, '84')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ justifyContent: 'center', gap: '0.5rem' }}
                >
                  💬 Zalo
                </a>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)' }}>Thông tin liên hệ đang cập nhật.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Nearby listings */}
      {nearby.length > 0 && (
        <section style={{ marginTop: '2.5rem' }} aria-label="Đất gần đây">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--sea-ink)' }}>Đất nông nghiệp gần đây</h2>
            <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          </div>
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem', listStyle: 'none', margin: 0, padding: 0 }}>
            {nearby.map(n => <li key={n.id}><NearbyCard listing={n} /></li>)}
          </ul>
        </section>
      )}

      {/* Mobile sticky bar */}
      {l.phone && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', gap: '0.75rem',
          padding: '0.75rem 1rem',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
          background: 'var(--header-bg)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--line)',
          boxShadow: '0 -4px 24px rgba(23,58,64,0.10)',
        }}
          className="sticky-contact-bar"
        >
          <a
            href={`tel:${l.phone}`}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', minHeight: '48px', borderRadius: '0.75rem',
              border: '1px solid transparent', background: 'var(--lagoon)',
              color: '#fff', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none',
            }}
          >
            📞 Gọi Ngay
          </a>
          <a
            href={`https://zalo.me/${l.phone.replace(/^0/, '84')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', minHeight: '48px', borderRadius: '0.75rem',
              border: '1px solid var(--chip-line)', background: 'var(--chip-bg)',
              color: 'var(--sea-ink)', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none',
            }}
          >
            💬 Zalo
          </a>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .sticky-contact-bar { display: none !important; }
        }
        @media (max-width: 767px) {
          aside { display: none !important; }
        }
      `}</style>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SpecItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--sea-ink)' }}>{value}</div>
    </div>
  )
}

function NearbyCard({ listing: n }: { listing: LandListing }) {
  const label = n.land_type ? LAND_TYPE_LABELS[n.land_type] : null
  return (
    <a
      href={`/dat-nong-nghiep/chi-tiet/${n.slug}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        padding: '0.875rem', borderRadius: '0.75rem',
        border: '1px solid var(--line)', background: 'var(--surface)',
        textDecoration: 'none', height: '100%',
      }}
    >
      {label && (
        <span style={{ alignSelf: 'flex-start', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--palm)', background: 'rgba(47,106,74,0.08)', padding: '1px 7px', borderRadius: '999px' }}>
          {label}
        </span>
      )}
      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--sea-ink)', lineHeight: 1.4 }}>{n.title}</div>
      {n.price_text && (
        <div style={{ marginTop: 'auto', fontWeight: 700, fontSize: '0.875rem', color: 'var(--lagoon-deep)' }}>{n.price_text}</div>
      )}
    </a>
  )
}
