import { notFound }             from 'next/navigation'
import type { Metadata }         from 'next'
import Link                      from 'next/link'
import { createClient }          from '@/lib/supabase/server'
import {
  getCategoryPageContext,
  resolveCategoryAlias,
}                                from '@/entities/category'
import type {
  Category,
  CategoryCrumb,
  CategoryAttribute,
}                                from '@/entities/category'
import { Skeleton }              from '@/shared/ui/skeleton'

export const revalidate = 3600

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Metadata> {
  const { path } = await params
  const fullSlug  = path.join('/')
  const ctx       = await getCategoryPageContext(fullSlug)
  if (!ctx) return { title: 'Không tìm thấy' }

  const { category: c, breadcrumbs } = ctx
  const title       = c.seo_title ?? `${c.name} | VIO LOCAL`
  const description = c.seo_description
    ?? `Khám phá ${c.name} trên VIO LOCAL — nền tảng giao thương địa phương hàng đầu Việt Nam.`

  const crumbSchema = {
    '@context':        'https://schema.org',
    '@type':           'BreadcrumbList',
    itemListElement:   breadcrumbs.map((b, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      name:       b.name,
      item:       `https://violocal.vn${b.href}`,
    })),
  }

  return {
    title,
    description,
    keywords:   c.seo_keywords ?? undefined,
    openGraph:  { title, description, url: `/${fullSlug}` },
    alternates: { canonical: `/${fullSlug}` },
    other:      { 'schema:breadcrumb': JSON.stringify(crumbSchema) },
  }
}

// ── Data: listings in this category ──────────────────────────────────────────

async function getListingsForCategory(
  categoryId: number,
  entityTypes: string[],
  geoSlug?: string,
  limit = 24,
) {
  const supabase = await createClient()
  const results: { type: string; id: string; slug: string; title: string; price_text: string | null; image_url: string | null }[] = []

  // Land listings
  if (entityTypes.includes('land_listing')) {
    const { data } = await supabase
      .from('listings')
      .select('id, slug, title, price_text')
      .eq('type', 'land')
      .eq('category_id', categoryId)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .order('created_at',  { ascending: false })
      .limit(limit)
    ;(data ?? []).forEach(r => results.push({ type: 'land', ...r, image_url: null }))
  }

  // Products
  if (entityTypes.includes('product')) {
    const { data } = await supabase
      .from('listings')
      .select('id, slug, title, price_text')
      .eq('type', 'product')
      .eq('category_id', categoryId)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .limit(limit)
    ;(data ?? []).forEach(r => results.push({ type: 'product', ...r, image_url: null }))
  }

  // Services
  if (entityTypes.includes('service')) {
    const { data } = await supabase
      .from('listings')
      .select('id, slug, title, price_text')
      .eq('type', 'service')
      .eq('category_id', categoryId)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .limit(limit)
    ;(data ?? []).forEach(r => results.push({ type: 'service', ...r, image_url: null }))
  }

  return results.slice(0, limit)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Breadcrumbs({ crumbs }: { crumbs: CategoryCrumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-gray-400" aria-label="Breadcrumb">
      <Link href="/" className="text-gray-400 no-underline hover:text-gray-600">Trang chủ</Link>
      {crumbs.map((c, i) => (
        <span key={c.id} className="flex items-center gap-1.5">
          <span className="text-gray-300" aria-hidden="true">/</span>
          {i < crumbs.length - 1
            ? <Link href={c.href} className="text-gray-400 no-underline hover:text-gray-600">{c.name}</Link>
            : <span className="font-medium text-gray-700">{c.name}</span>
          }
        </span>
      ))}
    </nav>
  )
}

function SubCategoryPills({ children }: { children: Category[] }) {
  if (children.length === 0) return null
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {children.map(c => (
        <Link
          key={c.id}
          href={`/${c.full_slug}`}
          className={[
            'flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200',
            'bg-white px-4 py-2 text-[0.875rem] font-semibold text-gray-700 no-underline',
            'transition-colors hover:bg-gray-50 dark:bg-[#1C1C1E] dark:border-white/[0.1] dark:text-gray-200',
          ].join(' ')}
        >
          {c.icon_emoji && <span aria-hidden="true">{c.icon_emoji}</span>}
          {c.name}
          {c.listing_count > 0 && (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-gray-500 dark:bg-white/[0.08]">
              {c.listing_count > 999 ? `${Math.floor(c.listing_count / 1000)}k` : c.listing_count}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}

function AttributeFilters({ attributes }: { attributes: CategoryAttribute[] }) {
  if (attributes.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {attributes.map(attr => (
        attr.input_type === 'select' && attr.options ? (
          <div key={attr.id} className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-gray-400">
              {attr.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {attr.options.slice(0, 5).map(opt => (
                <Link
                  key={opt.value}
                  href={`?${attr.key}=${opt.value}`}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[0.8125rem] font-medium text-gray-700 no-underline transition-colors hover:bg-gray-50 dark:bg-[#1C1C1E] dark:border-white/[0.1] dark:text-gray-300"
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null
      ))}
    </div>
  )
}

function ListingGrid({ items }: { items: Awaited<ReturnType<typeof getListingsForCategory>> }) {
  if (items.length === 0) return (
    <div className="rounded-3xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-white/[0.08]">
      <p className="m-0 text-3xl" aria-hidden="true">🔍</p>
      <p className="m-0 mt-3 text-[0.9375rem] text-gray-500">Chưa có tin đăng trong danh mục này</p>
    </div>
  )

  const typeHref: Record<string, string> = {
    land:    '/dat-nong-nghiep/chi-tiet',
    product: '/san-pham',
    service: '/dich-vu',
  }

  return (
    <ul className="grid grid-cols-1 gap-4 list-none m-0 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(item => (
        <li key={`${item.type}-${item.id}`}>
          <Link
            href={`${typeHref[item.type] ?? ''}/${item.slug}`}
            className="flex h-full flex-col gap-2 rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] no-underline transition-transform duration-200 hover:scale-[1.02] dark:bg-[#1C1C1E]"
          >
            {/* Image placeholder */}
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
              {item.image_url && (
                <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </div>
            <p className="m-0 text-[0.9375rem] font-semibold leading-snug text-gray-900 dark:text-white">
              {item.title}
            </p>
            {item.price_text && (
              <p className="m-0 mt-auto text-[0.9375rem] font-bold text-[#34C759]">
                {item.price_text}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CategoryPage(
  { params, searchParams }: {
    params:       Promise<{ path: string[] }>
    searchParams: Promise<Record<string, string | string[]>>
  },
) {
  const { path } = await params
  const fullSlug  = path.join('/')

  const ctx = await getCategoryPageContext(fullSlug)

  if (!ctx) {
    // Try alias resolution before giving up
    const canonical = await resolveCategoryAlias(fullSlug)
    if (canonical) {
      // Permanent redirect — Next.js handles this via redirect()
      const { redirect } = await import('next/navigation')
      redirect(`/${canonical}`)
    }
    notFound()
  }

  const { category, breadcrumbs, children, attributes, siblings } = ctx

  const listings = await getListingsForCategory(
    category.id,
    category.entity_types,
  )

  // JSON-LD
  const breadcrumbSchema = {
    '@context':      'https://schema.org',
    '@type':         'BreadcrumbList',
    itemListElement: [...breadcrumbs, { id: category.id, name: category.name, full_slug: fullSlug, href: `/${fullSlug}` }].map(
      (b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: `https://violocal.vn${b.href}` }),
    ),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">

        <Breadcrumbs crumbs={[...breadcrumbs]} />

        {/* Category hero */}
        <div className="my-6">
          {category.icon_emoji && (
            <p className="m-0 mb-2 text-4xl" aria-hidden="true">{category.icon_emoji}</p>
          )}
          <h1 className="m-0 text-[2rem] font-bold tracking-tight text-gray-900 dark:text-white">
            {category.name}
          </h1>
          {category.description && (
            <p className="m-0 mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-gray-500 dark:text-gray-400">
              {category.description}
            </p>
          )}
          {category.listing_count > 0 && (
            <p className="m-0 mt-1.5 text-[0.8125rem] text-gray-400">
              {category.listing_count.toLocaleString('vi-VN')} tin đăng
            </p>
          )}
        </div>

        {/* Sub-categories */}
        <SubCategoryPills children={children} />

        {/* Sibling nav (if no children) */}
        {children.length === 0 && siblings.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Danh mục liên quan</p>
            <SubCategoryPills children={siblings} />
          </div>
        )}

        {/* Attribute filters */}
        {attributes.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">Lọc theo</p>
            <AttributeFilters attributes={attributes} />
          </div>
        )}

        {/* Listings grid */}
        <div className="mt-8">
          <div className="mb-5 flex items-center gap-3">
            <h2 className="m-0 shrink-0 text-[1.0625rem] font-bold text-gray-900 dark:text-white">
              {listings.length > 0 ? `${listings.length} kết quả` : 'Tin đăng'}
            </h2>
            <div className="h-px flex-1 bg-gray-200/70 dark:bg-white/[0.07]" />
          </div>
          <ListingGrid items={listings} />
        </div>

      </div>
    </>
  )
}
