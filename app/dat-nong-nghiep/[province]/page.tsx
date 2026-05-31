import { notFound, redirect } from 'next/navigation'
import type { Metadata }      from 'next'
import Link                   from 'next/link'
import { createClient }       from '@/lib/supabase/server'
import { LandListingCard }    from '@/entities/listing'
import { listingToLandCard }  from '@/entities/listing'
import { getPageState, getRobotsMeta } from '@/lib/seo/thin-page'
import {
  getLandListingsByProvinceSEO,
  seoRowToListing,
} from '@/features/seo/api/seo-feeds.server'
import type { Province } from '@/lib/geo/types'

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
// Listings read from listings_featured_by_province MV via getLandListingsByProvinceSEO().
// Falls back to search_listings_hybrid() if MV is unavailable (logged as [seo-feed-fallback]).

export default async function LandProvincePage(
  { params }: { params: Promise<{ province: string }> },
) {
  const { province: slug } = await params

  const result = await resolveProvince(slug)
  if (!result) notFound()

  const { province, redirectSlug } = result
  if (redirectSlug) redirect(`/dat-nong-nghiep/${redirectSlug}`, 301 as any)

  const { items, total } = await getLandListingsByProvinceSEO(province.id, { type: 'land' })

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
        {items.length > 0 ? (
          <section aria-label="Danh sách đất nông nghiệp">
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 list-none m-0 p-0">
              {items.map(row => (
                <li key={row.id}>
                  <LandListingCard {...listingToLandCard(seoRowToListing(row))} />
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
