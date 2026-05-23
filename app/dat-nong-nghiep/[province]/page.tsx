import { notFound, redirect } from 'next/navigation'
import type { Metadata }      from 'next'
import Link                   from 'next/link'
import { createClient }       from '@/lib/supabase/server'
import { getLandListingsByProvince } from '@/features/land-listings/services/land-listings'
import { getPageState, getRobotsMeta } from '@/lib/seo/thin-page'
import { LAND_TYPE_LABELS } from '@/features/land-listings/types'
import type { LandListing }  from '@/features/land-listings/types'
import type { Province }     from '@/lib/geo/types'

export const revalidate = 3600

// ── Geo resolution ─────────────────────────────────────────────────────────

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

// ── generateMetadata ────────────────────────────────────────────────────────

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

// ── Page ────────────────────────────────────────────────────────────────────

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

      <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-20">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[0.8125rem] text-gray-400 mb-8 flex-wrap">
          <Link href="/" className="text-gray-400 no-underline hover:text-gray-600 transition-colors">
            Trang chủ
          </Link>
          <span className="text-gray-300">/</span>
          <Link href="/dat-nong-nghiep" className="text-gray-400 no-underline hover:text-gray-600 transition-colors">
            Đất nông nghiệp
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">{province.name}</span>
        </nav>

        {/* ── Page header — iOS Large Title ── */}
        <header className="mb-8">
          <span className="inline-flex items-center mb-3 px-3 py-1 rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15 text-[#34C759] dark:text-[#30D158] text-[0.6875rem] font-bold tracking-[0.1em] uppercase">
            Đất nông nghiệp
          </span>
          <h1 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-tight text-gray-900 dark:text-white m-0 leading-tight">
            {province.name_full}
          </h1>
          {pageState === 'indexed' && (
            <p className="mt-2 text-[0.9375rem] text-gray-500 dark:text-gray-400">
              {total} tin đăng đất nông nghiệp
            </p>
          )}
        </header>

        {/* ── Thin page notice ── */}
        {pageState === 'noindex' && (
          <div className="mb-8 px-5 py-4 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-[0_1px_6px_rgb(0,0,0,0.06)] text-[0.875rem] text-gray-500 dark:text-gray-400 leading-relaxed">
            {province.name_full} hiện có <strong className="text-gray-700 dark:text-gray-300">{total}</strong> tin đăng. Danh sách đầy đủ sẽ hiển thị khi có thêm tin đăng.
          </div>
        )}

        {/* ── Listings grid ── */}
        {listings.length > 0 ? (
          <section aria-label="Danh sách đất nông nghiệp">
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 list-none m-0 p-0">
              {listings.map(listing => (
                <li key={listing.id}>
                  <LandListingCard listing={listing} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="text-6xl opacity-20 mb-5 select-none" aria-hidden="true">🌾</span>
            <p className="text-gray-500 text-[0.9375rem]">Chưa có tin đăng đất nông nghiệp tại {province.name}.</p>
          </div>
        )}

      </main>
    </>
  )
}

// ── LandListingCard ─────────────────────────────────────────────────────────

function LandListingCard({ listing: l }: { listing: LandListing }) {
  const landTypeLabel = l.land_type ? LAND_TYPE_LABELS[l.land_type] : null

  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${l.slug}`}
      className="group flex flex-col h-full p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-[0_2px_8px_rgb(0,0,0,0.07)] dark:shadow-[0_2px_8px_rgb(0,0,0,0.25)] no-underline transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Tags row */}
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

      <p className="m-0 font-semibold text-[0.9375rem] text-gray-900 dark:text-white leading-snug mb-2">
        {l.title}
      </p>

      <div className="flex gap-3 text-[0.8125rem] text-gray-400 dark:text-gray-500 flex-wrap">
        {l.land_area_text && <span>📐 {l.land_area_text}</span>}
        {l.crop_type      && <span>🌿 {l.crop_type}</span>}
      </div>

      {l.price_text && (
        <p className="mt-auto pt-2 m-0 font-bold text-[0.9375rem] text-[#34C759] dark:text-[#30D158]">
          {l.price_text}
        </p>
      )}
    </Link>
  )
}
