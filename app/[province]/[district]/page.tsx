import { notFound, redirect } from 'next/navigation'
import type { Metadata }      from 'next'
import { createClient }       from '@/lib/supabase/server'
import { getDistrictStorefronts } from '@/lib/discovery/queries'
import { getPageState, getRobotsMeta } from '@/lib/seo/thin-page'
import type { Province, District } from '@/lib/geo/types'

export const revalidate = 3600

// ---------------------------------------------------------------------------
// Geo resolution
// ---------------------------------------------------------------------------

interface GeoResolved {
  province:     Province
  district:     District
  redirectPath?: string
}

async function resolveGeo(provinceSlug: string, districtSlug: string): Promise<GeoResolved | null> {
  const supabase = await createClient()

  // Resolve province — direct then alias
  const { data: province } = await supabase
    .from('provinces')
    .select('id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at')
    .eq('slug', provinceSlug)
    .maybeSingle()

  let resolvedProvince = province as Province | null
  let canonicalProvinceSlug = provinceSlug

  if (!resolvedProvince) {
    const { data: alias } = await supabase
      .from('geographic_aliases')
      .select('provinces!inner(id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at)')
      .eq('alias_slug', provinceSlug)
      .eq('entity_type', 'province')
      .maybeSingle()
    if (alias?.provinces) {
      const p = Array.isArray(alias.provinces) ? alias.provinces[0] : alias.provinces
      resolvedProvince     = p as Province
      canonicalProvinceSlug = p.slug
    }
  }

  if (!resolvedProvince) return null

  // Resolve district — must belong to the resolved province
  const { data: district } = await supabase
    .from('districts')
    .select('id, code, name, name_full, slug, province_id, lat, lng, created_at, updated_at')
    .eq('slug', districtSlug)
    .eq('province_id', resolvedProvince.id)
    .maybeSingle()

  let resolvedDistrict = district as District | null
  let canonicalDistrictSlug = districtSlug

  if (!resolvedDistrict) {
    const { data: alias } = await supabase
      .from('geographic_aliases')
      .select('districts!inner(id, code, name, name_full, slug, province_id, lat, lng, created_at, updated_at)')
      .eq('alias_slug', districtSlug)
      .eq('entity_type', 'district')
      .maybeSingle()
    if (alias?.districts) {
      const d = Array.isArray(alias.districts) ? alias.districts[0] : alias.districts
      resolvedDistrict     = d as District
      canonicalDistrictSlug = d.slug
    }
  }

  if (!resolvedDistrict) return null

  const needsRedirect = canonicalProvinceSlug !== provinceSlug || canonicalDistrictSlug !== districtSlug
  return {
    province:     resolvedProvince,
    district:     resolvedDistrict,
    redirectPath: needsRedirect ? `/${canonicalProvinceSlug}/${canonicalDistrictSlug}` : undefined,
  }
}

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ province: string; district: string }> },
): Promise<Metadata> {
  const { province: pSlug, district: dSlug } = await params
  const geo = await resolveGeo(pSlug, dSlug)
  if (!geo) return { title: 'Không tìm thấy' }

  const { province, district } = geo
  const title       = `Hộ kinh doanh tại ${district.name_full}, ${province.name}`
  const description = `Danh sách hộ kinh doanh tại ${district.name_full}, ${province.name}. Tìm kiếm nhà cung cấp nông sản và dịch vụ địa phương gần bạn.`

  return {
    title,
    description,
    openGraph: { title, description, url: `/${province.slug}/${district.slug}` },
    alternates: { canonical: `/${province.slug}/${district.slug}` },
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function DistrictPage(
  { params }: { params: Promise<{ province: string; district: string }> },
) {
  const { province: pSlug, district: dSlug } = await params

  const geo = await resolveGeo(pSlug, dSlug)
  if (!geo) notFound()

  const { province, district, redirectPath } = geo
  if (redirectPath) redirect(redirectPath, 301 as any)

  const supabase = await createClient()
  const { items: storefronts, total } = await getDistrictStorefronts(supabase, district.id)

  const pageState = getPageState('district', total)
  if (pageState === 'not-found') notFound()
  const robots = getRobotsMeta(pageState)

  return (
    <>
      <meta name="robots" content={robots} />

      <main className="page-wrap" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          <a href="/" style={{ color: 'var(--muted)' }}>Trang chủ</a>
          {' / '}
          <a href={`/${province.slug}`} style={{ color: 'var(--muted)' }}>{province.name}</a>
          {' / '}
          <span style={{ color: 'var(--sea-ink)' }}>{district.name}</span>
        </nav>

        {/* Header */}
        <header style={{ marginBottom: '1.5rem' }}>
          <p className="island-kicker" style={{ marginBottom: '0.5rem' }}>Hộ kinh doanh địa phương</p>
          <h1 style={{ fontSize: 'clamp(1.375rem, 4vw, 1.875rem)', fontWeight: 700, color: 'var(--sea-ink)', margin: 0 }}>
            {district.name_full}
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--sea-ink-soft)' }}>
            {province.name_full}
          </p>
          {pageState === 'indexed' && (
            <p style={{ marginTop: '0.375rem', fontSize: '0.875rem', color: 'var(--sea-ink-soft)' }}>
              {total} hộ kinh doanh đang hoạt động
            </p>
          )}
        </header>

        {pageState === 'noindex' && (
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--chip-bg)', borderRadius: '0.5rem', border: '1px solid var(--chip-line)' }}>
            {district.name_full} hiện có {total} hộ kinh doanh. Danh sách đầy đủ sẽ hiển thị khi có thêm tin đăng.
          </p>
        )}

        <section aria-label="Danh sách hộ kinh doanh">
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', listStyle: 'none', margin: 0, padding: 0 }}>
            {storefronts.map(sf => (
              <li key={sf.id as string}>
                <StorefrontCard storefront={sf as any} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}

// ---------------------------------------------------------------------------
// StorefrontCard
// ---------------------------------------------------------------------------

interface CardProps {
  storefront: {
    id: string; slug: string; business_name: string
    description: string | null; avatar_url: string | null
    is_verified: boolean
  }
}

function StorefrontCard({ storefront: sf }: CardProps) {
  return (
    <a
      href={`/ho-kinh-doanh/${sf.slug}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
        padding: '1rem', borderRadius: '0.75rem',
        border: '1px solid var(--line)', background: 'var(--surface)',
        textDecoration: 'none', height: '100%',
        transition: 'border-color 150ms',
      }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{
          width: '48px', height: '48px', flexShrink: 0,
          borderRadius: '0.5rem', overflow: 'hidden',
          background: 'var(--sand)', border: '1px solid var(--line)',
        }}>
          {sf.avatar_url ? (
            <img src={sf.avatar_url} alt="" width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '1.25rem' }}>🏪</div>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--sea-ink)', lineHeight: 1.3 }}>
              {sf.business_name}
            </span>
            {sf.is_verified && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--palm)', background: 'rgba(47,106,74,0.1)', padding: '1px 6px', borderRadius: '999px' }}>
                ✓ Đã xác thực
              </span>
            )}
          </div>
          {sf.description && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--sea-ink-soft)', lineHeight: 1.5,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
              {sf.description}
            </p>
          )}
        </div>
      </div>
    </a>
  )
}
