import { notFound, redirect } from 'next/navigation'
import type { Metadata }      from 'next'
import { createClient }       from '@/lib/supabase/server'
import { getProvinceStorefronts, getProvinceDistrictSummary } from '@/lib/discovery/queries'
import { getPageState, getRobotsMeta, shouldShowInProvinceNav } from '@/lib/seo/thin-page'
import type { Province } from '@/lib/geo/types'
import { StorefrontCard } from '@/features/storefronts/components/storefront-card'

// ISR — contet caches 1 giờ, tự revalidate khi hết hạn
export const revalidate = 3600

// ---------------------------------------------------------------------------
// Geo resolution helpers
// ---------------------------------------------------------------------------

async function resolveProvince(slug: string): Promise<{ province: Province; redirectSlug?: string } | null> {
  const supabase = await createClient()

  // 1. Direct match
  const { data: direct } = await supabase
    .from('provinces')
    .select('id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (direct) return { province: direct as Province }

  // 2. Alias lookup (old/colloquial names → 301 redirect)
  const { data: alias } = await supabase
    .from('geographic_aliases')
    .select('provinces!inner(id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at)')
    .eq('alias_slug', slug)
    .eq('entity_type', 'province')
    .maybeSingle()

  if (alias?.provinces) {
    const prov = Array.isArray(alias.provinces) ? alias.provinces[0] : alias.provinces
    return { province: prov as Province, redirectSlug: prov.slug }
  }

  return null
}

// ---------------------------------------------------------------------------
// generateMetadata — SEO
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ province: string }> },
): Promise<Metadata> {
  const { province: slug } = await params
  const result = await resolveProvince(slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { province } = result
  const title       = `Hộ kinh doanh tại ${province.name_full}`
  const description = `Danh sách hộ kinh doanh, nông sản và dịch vụ địa phương tại ${province.name_full}. Tìm kiếm nhà cung cấp uy tín gần bạn.`

  return {
    title,
    description,
    openGraph: { title, description, url: `/${province.slug}` },
    alternates: { canonical: `/${province.slug}` },
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ProvincePage(
  { params }: { params: Promise<{ province: string }> },
) {
  const { province: slug } = await params

  // Resolve province (handles alias redirect)
  const result = await resolveProvince(slug)
  if (!result) notFound()

  const { province, redirectSlug } = result
  if (redirectSlug) redirect(`/${redirectSlug}`, 301 as any)

  // Parallel data fetch
  const supabase = await createClient()
  const [{ items: storefronts, total }, districts] = await Promise.all([
    getProvinceStorefronts(supabase, province.id),
    getProvinceDistrictSummary(supabase, province.id),
  ])

  const districtNameById = new Map(districts.map(d => [d.district_id, d.name]))

  // Thin-page decision
  const pageState = getPageState('province', total)
  if (pageState === 'not-found') notFound()
  const robots    = getRobotsMeta(pageState)

  // District nav — only districts above threshold
  const navDistricts = districts.filter(d => shouldShowInProvinceNav(d.storefront_count))

  return (
    <>
      {/* robots meta via Next.js headers */}
      <meta name="robots" content={robots} />

      <main className="page-wrap" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          <a href="/" style={{ color: 'var(--muted)' }}>Trang chủ</a>
          {' / '}
          <span style={{ color: 'var(--sea-ink)' }}>{province.name}</span>
        </nav>

        {/* Page header */}
        <header style={{ marginBottom: '1.5rem' }}>
          <p className="island-kicker" style={{ marginBottom: '0.5rem' }}>Hộ kinh doanh địa phương</p>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--sea-ink)', margin: 0 }}>
            {province.name_full}
          </h1>
          {pageState === 'indexed' && (
            <p style={{ marginTop: '0.375rem', fontSize: '0.875rem', color: 'var(--sea-ink-soft)' }}>
              {total} hộ kinh doanh đang hoạt động
            </p>
          )}
        </header>

        {/* District navigation chips */}
        {navDistricts.length > 0 && (
          <nav aria-label="Huyện / Thành phố" style={{ marginBottom: '1.5rem' }}>
            <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
              {navDistricts.map(d => (
                <li key={d.district_id}>
                  <a
                    href={`/${province.slug}/${d.slug}`}
                    style={{
                      display:         'inline-block',
                      padding:         '0.375rem 0.875rem',
                      borderRadius:    '999px',
                      border:          '1px solid var(--chip-line)',
                      background:      'var(--chip-bg)',
                      fontSize:        '0.8125rem',
                      fontWeight:      500,
                      color:           'var(--sea-ink-soft)',
                      textDecoration:  'none',
                      whiteSpace:      'nowrap',
                    }}
                  >
                    {d.name}
                    <span style={{ marginLeft: '0.375rem', color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {d.storefront_count}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Thin page message */}
        {pageState === 'noindex' && (
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--chip-bg)', borderRadius: '0.5rem', border: '1px solid var(--chip-line)' }}>
            {province.name_full} hiện có {total} hộ kinh doanh. Danh sách đầy đủ sẽ hiển thị khi có thêm tin đăng.
          </p>
        )}

        {/* Storefront grid */}
        <section aria-label="Danh sách hộ kinh doanh">
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', listStyle: 'none', margin: 0, padding: 0 }}>
            {storefronts.map(sf => (
              <li key={sf.id as string}>
                <StorefrontCard
                  storefront={{
                    slug:          sf.slug          as string,
                    business_name: sf.business_name as string,
                    avatar_url:    sf.avatar_url    as string | null,
                    is_verified:   sf.is_verified   as boolean,
                    district_name: sf.district_id != null
                      ? districtNameById.get(sf.district_id as number)
                      : undefined,
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}

