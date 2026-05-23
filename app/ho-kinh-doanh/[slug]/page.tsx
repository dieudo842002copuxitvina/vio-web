import { notFound }    from 'next/navigation'
import type { Metadata } from 'next'
import { createClient }  from '@/lib/supabase/server'
import { getStorefrontDetail } from '@/features/storefronts/services/storefront-detail'
import type { StorefrontDetailResult, ProductRef, ServiceRef, NearbyRef } from '@/features/storefronts/services/storefront-detail'
import StickyContactBar from './sticky-contact-bar'

// ISR — cache 1 giờ, revalidate khi hết hạn
export const revalidate = 3600

// ---------------------------------------------------------------------------
// generateMetadata — SEO
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug }  = await params
  const supabase  = await createClient()
  const result    = await getStorefrontDetail(supabase, slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { storefront: sf, province, district } = result
  const locationParts = [district?.name, province?.name].filter(Boolean)
  const locationText  = locationParts.length ? ` tại ${locationParts.join(', ')}` : ''
  const title         = `${sf.business_name}${locationText}`
  const description   = sf.description
    ?? `Hộ kinh doanh ${sf.business_name}${locationText}. Xem sản phẩm, dịch vụ và liên hệ trực tiếp.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:    `/ho-kinh-doanh/${sf.slug}`,
      images: sf.avatar_url ? [{ url: sf.avatar_url, width: 400, height: 400 }] : [],
    },
    alternates: { canonical: `/ho-kinh-doanh/${sf.slug}` },
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function StorefrontDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const result   = await getStorefrontDetail(supabase, slug)
  if (!result) notFound()

  const { storefront: sf, province, district, ward, products, services, nearby } = result
  const hasContact = !!(sf.phone || sf.zalo_url)

  const breadcrumbItems = [
    { label: 'Trang chủ', href: '/' },
    province ? { label: province.name, href: `/${province.slug}` } : null,
    district ? { label: district.name, href: `/${province?.slug}/${district.slug}` } : null,
    { label: sf.business_name, href: null },
  ].filter(Boolean) as { label: string; href: string | null }[]

  return (
    <>
      <main
        className="page-wrap"
        style={{
          paddingTop:    '1.5rem',
          // Extra bottom padding on mobile so sticky bar doesn't cover content
          paddingBottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Breadcrumb */}
        <nav style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
          {breadcrumbItems.map((item, i) => (
            <span key={i}>
              {i > 0 && <span style={{ margin: '0 0.375rem' }}>/</span>}
              {item.href ? (
                <a href={item.href} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{item.label}</a>
              ) : (
                <span style={{ color: 'var(--sea-ink)' }}>{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Cover image */}
        {sf.cover_image_url && (
          <div style={{
            width: '100%', height: 'clamp(160px, 28vw, 260px)',
            borderRadius: '1rem', overflow: 'hidden',
            marginBottom: '1.5rem', border: '1px solid var(--line)',
          }}>
            <img
              src={sf.cover_image_url}
              alt=""
              width={1080}
              height={260}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="eager"
            />
          </div>
        )}

        {/* Header card */}
        <div className="island-shell" style={{ borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{
              width: '72px', height: '72px', flexShrink: 0,
              borderRadius: '0.75rem', overflow: 'hidden',
              background: 'var(--sand)', border: '1px solid var(--line)',
            }}>
              {sf.avatar_url ? (
                <img src={sf.avatar_url} alt="" width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '1.75rem' }}>🏪</div>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.125rem, 3.5vw, 1.5rem)', fontWeight: 700, color: 'var(--sea-ink)', lineHeight: 1.25 }}>
                  {sf.business_name}
                </h1>
                {sf.is_verified && (
                  <span style={{ flexShrink: 0, fontSize: '0.6875rem', fontWeight: 600, color: 'var(--palm)', background: 'rgba(47,106,74,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
                    ✓ Đã xác thực
                  </span>
                )}
              </div>

              {/* Location line */}
              {(ward || district || province) && (
                <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>📍</span>
                  {[ward?.name, district?.name, province?.name].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {sf.description && (
            <p style={{ margin: '1rem 0 0', fontSize: '0.9375rem', color: 'var(--sea-ink-soft)', lineHeight: 1.7 }}>
              {sf.description}
            </p>
          )}

          {/* Desktop contact buttons — hidden on mobile (sticky bar handles it) */}
          {hasContact && (
            <div className="desktop-contact" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              {sf.phone && (
                <a
                  href={`tel:${sf.phone}`}
                  className="btn-primary"
                  style={{ minWidth: '140px', gap: '0.375rem' }}
                >
                  📞 Gọi Ngay
                </a>
              )}
              {sf.zalo_url && (
                <a
                  href={sf.zalo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ minWidth: '140px', gap: '0.375rem' }}
                >
                  💬 Zalo
                </a>
              )}
              {sf.facebook_url && (
                <a
                  href={sf.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ gap: '0.375rem' }}
                >
                  Facebook
                </a>
              )}
            </div>
          )}
        </div>

        {/* Products section */}
        {products.length > 0 && (
          <section style={{ marginBottom: '2rem' }} aria-label="Sản phẩm">
            <SectionHeader label="Sản phẩm" />
            <ul style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.875rem',
              listStyle: 'none', margin: 0, padding: 0,
            }}>
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </ul>
          </section>
        )}

        {/* Services section */}
        {services.length > 0 && (
          <section style={{ marginBottom: '2rem' }} aria-label="Dịch vụ">
            <SectionHeader label="Dịch vụ" />
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none', margin: 0, padding: 0 }}>
              {services.map(s => <ServiceRow key={s.id} service={s} />)}
            </ul>
          </section>
        )}

        {/* Nearby storefronts */}
        {nearby.length > 0 && (
          <section style={{ marginBottom: '2rem' }} aria-label="Hộ kinh doanh lân cận">
            <SectionHeader label="Hộ kinh doanh lân cận" />
            <ul style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '0.75rem',
              listStyle: 'none', margin: 0, padding: 0,
            }}>
              {nearby.map(n => <NearbyCard key={n.id} storefront={n} />)}
            </ul>
          </section>
        )}
      </main>

      {/* Sticky Bottom Action Bar — mobile only */}
      {hasContact && (
        <StickyContactBar
          phone={sf.phone ?? null}
          zaloUrl={sf.zalo_url ?? null}
        />
      )}

      {/* Hide desktop contact on mobile via style tag */}
      <style>{`
        @media (max-width: 767px) {
          .desktop-contact { display: none !important; }
        }
        @media (min-width: 768px) {
          .sticky-contact-bar { display: none !important; }
        }
      `}</style>
    </>
  )
}

// ---------------------------------------------------------------------------
// Sub-components — all Server Components
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
      <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--sea-ink)' }}>{label}</h2>
      <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
    </div>
  )
}

function ProductCard({ product: p }: { product: ProductRef }) {
  return (
    <li>
      <a
        href={`/san-pham/${p.slug}`}
        style={{
          display: 'flex', flexDirection: 'column',
          padding: '0.875rem',
          borderRadius: '0.75rem', border: '1px solid var(--line)',
          background: 'var(--surface)', textDecoration: 'none',
          transition: 'border-color 150ms',
          height: '100%',
        }}
      >
        {p.is_featured && (
          <span style={{ alignSelf: 'flex-start', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--lagoon-deep)', background: 'rgba(79,184,178,0.12)', padding: '1px 7px', borderRadius: '999px', marginBottom: '0.5rem' }}>
            Nổi bật
          </span>
        )}
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--sea-ink)', lineHeight: 1.4 }}>{p.title}</span>
        {p.price_text && (
          <span style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'var(--palm)', fontWeight: 700 }}>
            {p.price_text}
          </span>
        )}
      </a>
    </li>
  )
}

function ServiceRow({ service: s }: { service: ServiceRef }) {
  return (
    <li>
      <a
        href={`/dich-vu/${s.slug}`}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem',
          borderRadius: '0.75rem', border: '1px solid var(--line)',
          background: 'var(--surface)', textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: '1.125rem' }}>🔧</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--sea-ink)' }}>{s.title}</div>
          {s.service_area_text && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.125rem' }}>{s.service_area_text}</div>
          )}
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>›</span>
      </a>
    </li>
  )
}

function NearbyCard({ storefront: n }: { storefront: NearbyRef }) {
  return (
    <li>
      <a
        href={`/ho-kinh-doanh/${n.slug}`}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem',
          borderRadius: '0.75rem', border: '1px solid var(--line)',
          background: 'var(--surface)', textDecoration: 'none',
        }}
      >
        <div style={{
          width: '40px', height: '40px', flexShrink: 0,
          borderRadius: '0.5rem', overflow: 'hidden',
          background: 'var(--sand)', border: '1px solid var(--line)',
        }}>
          {n.avatar_url ? (
            <img src={n.avatar_url} alt="" width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '1.1rem' }}>🏪</div>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--sea-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {n.business_name}
          </div>
          {n.is_verified && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--palm)', marginTop: '1px' }}>✓ Đã xác thực</div>
          )}
        </div>
      </a>
    </li>
  )
}
