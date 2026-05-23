import { notFound, redirect } from 'next/navigation'
import type { Metadata }      from 'next'
import { createClient }       from '@/lib/supabase/server'
import { getLandListingsByProvince } from '@/features/land-listings/services/land-listings'
import { getPageState, getRobotsMeta } from '@/lib/seo/thin-page'
import { LAND_TYPE_LABELS } from '@/features/land-listings/types'
import type { LandListing }  from '@/features/land-listings/types'
import type { Province }     from '@/lib/geo/types'

export const revalidate = 3600

// ---------------------------------------------------------------------------
// Geo resolution
// ---------------------------------------------------------------------------

async function resolveProvince(slug: string): Promise<{ province: Province; redirectSlug?: string } | null> {
  const supabase = await createClient()

  const { data: direct } = await supabase
    .from('provinces')
    .select('id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (direct) return { province: direct as Province }

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
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ province: string }> },
): Promise<Metadata> {
  const { province: slug } = await params
  const result = await resolveProvince(slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { province } = result
  const title       = `Đất nông nghiệp tại ${province.name_full}`
  const description = `Danh sách đất nông nghiệp cần bán và cho thuê tại ${province.name_full}. Đất lúa, cây ăn trái, cây lâu năm và nhiều loại đất khác.`

  return {
    title,
    description,
    openGraph: { title, description, url: `/dat-nong-nghiep/${province.slug}` },
    alternates: { canonical: `/dat-nong-nghiep/${province.slug}` },
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function LandProvincePage(
  { params }: { params: Promise<{ province: string }> },
) {
  const { province: slug } = await params

  const result = await resolveProvince(slug)
  if (!result) notFound()

  const { province, redirectSlug } = result
  if (redirectSlug) redirect(`/dat-nong-nghiep/${redirectSlug}`, 301 as any)

  const supabase = await createClient()
  const { items: listings, total } = await getLandListingsByProvince(supabase, province.id)

  const pageState = getPageState('province', total)
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
          <a href="/dat-nong-nghiep" style={{ color: 'var(--muted)' }}>Đất nông nghiệp</a>
          {' / '}
          <span style={{ color: 'var(--sea-ink)' }}>{province.name}</span>
        </nav>

        {/* Header */}
        <header style={{ marginBottom: '1.5rem' }}>
          <p className="island-kicker" style={{ marginBottom: '0.5rem' }}>Đất nông nghiệp</p>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--sea-ink)', margin: 0 }}>
            {province.name_full}
          </h1>
          {pageState === 'indexed' && (
            <p style={{ marginTop: '0.375rem', fontSize: '0.875rem', color: 'var(--sea-ink-soft)' }}>
              {total} tin đăng đất nông nghiệp
            </p>
          )}
        </header>

        {pageState === 'noindex' && (
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--chip-bg)', borderRadius: '0.5rem', border: '1px solid var(--chip-line)' }}>
            {province.name_full} hiện có {total} tin đăng. Danh sách đầy đủ sẽ hiển thị khi có thêm tin đăng.
          </p>
        )}

        {/* Listings grid */}
        <section aria-label="Danh sách đất nông nghiệp">
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', listStyle: 'none', margin: 0, padding: 0 }}>
            {listings.map(listing => (
              <li key={listing.id}>
                <LandListingCard listing={listing} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}

// ---------------------------------------------------------------------------
// LandListingCard
// ---------------------------------------------------------------------------

function LandListingCard({ listing: l }: { listing: LandListing }) {
  const landTypeLabel = l.land_type ? LAND_TYPE_LABELS[l.land_type] : null

  return (
    <a
      href={`/dat-nong-nghiep/chi-tiet/${l.slug}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: '0.625rem',
        padding: '1rem', borderRadius: '0.75rem',
        border: '1px solid var(--line)', background: 'var(--surface)',
        textDecoration: 'none', height: '100%',
        transition: 'border-color 150ms',
      }}
    >
      {/* Tags row */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
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

      {/* Title */}
      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sea-ink)', lineHeight: 1.4 }}>
        {l.title}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
        {l.land_area_text && <span>📐 {l.land_area_text}</span>}
        {l.crop_type      && <span>🌿 {l.crop_type}</span>}
      </div>

      {/* Price */}
      {l.price_text && (
        <div style={{ marginTop: 'auto', fontWeight: 700, fontSize: '1rem', color: 'var(--lagoon-deep)' }}>
          {l.price_text}
        </div>
      )}
    </a>
  )
}
