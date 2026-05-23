import { notFound, redirect } from 'next/navigation'
import type { Metadata }       from 'next'
import Link                    from 'next/link'
import { createClient }        from '@/lib/supabase/server'
import { getProvinceStorefronts, getProvinceDistrictSummary } from '@/lib/discovery/queries'
import { getPageState, getRobotsMeta, shouldShowInProvinceNav } from '@/lib/seo/thin-page'
import type { Province } from '@/lib/geo/types'
import { StorefrontCard } from '@/features/storefronts/components/storefront-card'

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
  const title       = `Hộ kinh doanh tại ${province.name_full}`
  const description = `Danh sách hộ kinh doanh, nông sản và dịch vụ địa phương tại ${province.name_full}. Tìm kiếm nhà cung cấp uy tín gần bạn.`

  return {
    title,
    description,
    openGraph: { title, description, url: `/${province.slug}` },
    alternates: { canonical: `/${province.slug}` },
  }
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function ProvincePage(
  { params }: { params: Promise<{ province: string }> },
) {
  const { province: slug } = await params

  const result = await resolveProvince(slug)
  if (!result) notFound()

  const { province, redirectSlug } = result
  if (redirectSlug) redirect(`/${redirectSlug}`, 301 as any)

  const supabase = await createClient()
  const [{ items: storefronts, total }, districts] = await Promise.all([
    getProvinceStorefronts(supabase, province.id),
    getProvinceDistrictSummary(supabase, province.id),
  ])

  const districtNameById = new Map(districts.map(d => [d.district_id, d.name]))
  const pageState        = getPageState('province', total)
  if (pageState === 'not-found') notFound()

  const robots       = getRobotsMeta(pageState)
  const navDistricts = districts.filter(d => shouldShowInProvinceNav(d.storefront_count))

  return (
    <>
      <meta name="robots" content={robots} />

      <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-20">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[0.8125rem] text-gray-400 mb-8">
          <Link href="/" className="text-gray-400 no-underline hover:text-gray-600 transition-colors">
            Trang chủ
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 dark:text-gray-300 font-medium">{province.name}</span>
        </nav>

        {/* ── Page header — iOS Large Title ── */}
        <header className="mb-8">
          <span className="inline-flex items-center mb-3 px-3 py-1 rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15 text-[#34C759] dark:text-[#30D158] text-[0.6875rem] font-bold tracking-[0.1em] uppercase">
            Hộ kinh doanh địa phương
          </span>
          <h1 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-tight text-gray-900 dark:text-white m-0 leading-tight">
            {province.name_full}
          </h1>
          {pageState === 'indexed' && (
            <p className="mt-2 text-[0.9375rem] text-gray-500 dark:text-gray-400">
              {total} hộ kinh doanh đang hoạt động
            </p>
          )}
        </header>

        {/* ── District chips — pill style ── */}
        {navDistricts.length > 0 && (
          <nav aria-label="Huyện / Thành phố" className="mb-8">
            <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
              {navDistricts.map(d => (
                <li key={d.district_id}>
                  <Link
                    href={`/${province.slug}/${d.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-[#1C1C1E] shadow-[0_1px_4px_rgb(0,0,0,0.08)] dark:shadow-[0_1px_4px_rgb(0,0,0,0.25)] text-[0.8125rem] font-medium text-gray-600 dark:text-gray-300 no-underline transition-[box-shadow,transform] duration-200 hover:shadow-[0_2px_8px_rgb(0,0,0,0.12)] hover:scale-[1.02] whitespace-nowrap"
                  >
                    {d.name}
                    <span className="text-gray-400 dark:text-gray-500 text-xs">{d.storefront_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* ── Thin page notice ── */}
        {pageState === 'noindex' && (
          <div className="mb-8 px-5 py-4 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-[0_1px_6px_rgb(0,0,0,0.06)] text-[0.875rem] text-gray-500 dark:text-gray-400 leading-relaxed">
            {province.name_full} hiện có <strong className="text-gray-700 dark:text-gray-300">{total}</strong> hộ kinh doanh. Danh sách đầy đủ sẽ hiển thị khi có thêm tin đăng.
          </div>
        )}

        {/* ── Storefront grid ── */}
        {storefronts.length > 0 ? (
          <section aria-label="Danh sách hộ kinh doanh">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {storefronts.map(sf => (
                <StorefrontCard
                  key={sf.id as string}
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
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="text-6xl opacity-20 mb-5 select-none" aria-hidden="true">🏪</span>
            <p className="text-gray-500 text-[0.9375rem]">Chưa có hộ kinh doanh nào tại {province.name}.</p>
          </div>
        )}

      </main>
    </>
  )
}
