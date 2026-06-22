import { notFound, redirect }    from 'next/navigation'
import { Suspense }              from 'react'
import type { Metadata }         from 'next'
import Link                      from 'next/link'
import { createCachedClient }    from '@/lib/supabase/server'
import {
  getCategoryPageContext,
  resolveCategoryAlias,
}                                from '@/entities/category'
import type {
  Category,
  CategoryCrumb,
  CategoryAttribute,
  AttributeInputType,
}                                from '@/entities/category'
import { SectionHeader }         from '@/shared/ui/section-header'
import { CategoryFilters }       from './_components/CategoryFilters'
import {
  CategoryListingCard,
  type CategoryListing,
}                                from './_components/CategoryListingCard'
import { SortSelect }            from './_components/SortSelect'
import type { SortMode }         from './_components/SortSelect'

export const revalidate = 3600

// ── Active filter parsing ─────────────────────────────────────────────────────
//
// URL contract:
//   select      → ?soil_type=agricultural
//   multiselect → ?water_source=well,canal
//   range       → ?area_m2_min=1000&area_m2_max=5000
//   boolean     → ?road_access=true

interface ActiveFilters {
  select:      Record<string, string>
  multiselect: Record<string, string[]>
  range:       Record<string, { min?: number; max?: number }>
  boolean:     Record<string, boolean>
}

function parseActiveFilters(
  searchParams: Record<string, string | string[] | undefined>,
  attributes:  CategoryAttribute[],
): ActiveFilters {
  const select:      Record<string, string>                        = {}
  const multiselect: Record<string, string[]>                     = {}
  const range:       Record<string, { min?: number; max?: number }> = {}
  const boolean:     Record<string, boolean>                      = {}

  for (const attr of attributes) {
    const raw = searchParams[attr.key]
    const val = Array.isArray(raw) ? raw[0] : raw

    switch (attr.input_type as AttributeInputType) {
      case 'select':
        if (val) select[attr.key] = val
        break
      case 'multiselect': {
        const values = (val ?? '').split(',').filter(Boolean)
        if (values.length) multiselect[attr.key] = values
        break
      }
      case 'range': {
        const minRaw = searchParams[`${attr.key}_min`]
        const maxRaw = searchParams[`${attr.key}_max`]
        const min    = minRaw ? Number(Array.isArray(minRaw) ? minRaw[0] : minRaw) : undefined
        const max    = maxRaw ? Number(Array.isArray(maxRaw) ? maxRaw[0] : maxRaw) : undefined
        if (min !== undefined || max !== undefined) range[attr.key] = { min, max }
        break
      }
      case 'boolean':
        if (val === 'true') boolean[attr.key] = true
        break
    }
  }

  return { select, multiselect, range, boolean }
}

function countActiveFilters(af: ActiveFilters): number {
  return (
    Object.keys(af.select).length +
    Object.keys(af.multiselect).length +
    Object.keys(af.range).length +
    Object.keys(af.boolean).length
  )
}

function parseSort(raw: string | string[] | undefined): SortMode {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v === 'price_asc' || v === 'price_desc' || v === 'featured') return v
  return 'newest'
}

// ── Listing row type from Supabase ────────────────────────────────────────────

interface RawListingRow {
  id:            string
  slug:          string
  title:         string
  price_text:    string | null
  price_amount:  number | null
  cover_url:     string | null
  location_text: string | null
  is_featured:   boolean
  is_verified:   boolean
  type:          string
  listing_attribute_values: Array<{
    value_text:   string | null
    value_number: number | null
    value_json:   unknown
    listing_attribute_schemas: { key: string } | null
  }> | null
}

// ── JS-side attribute filter ──────────────────────────────────────────────────

function matchesFilters(listing: RawListingRow, af: ActiveFilters): boolean {
  const avs = listing.listing_attribute_values ?? []

  // Build key → value map for this listing's attributes
  const attrMap = new Map<string, { text: string | null; number: number | null; json: unknown }>()
  for (const av of avs) {
    const key = av.listing_attribute_schemas?.key
    if (key) attrMap.set(key, { text: av.value_text, number: av.value_number, json: av.value_json })
  }

  // Select: single match required
  for (const [key, value] of Object.entries(af.select)) {
    if (attrMap.get(key)?.text !== value) return false
  }

  // Multiselect: at least one of the selected values must match
  for (const [key, values] of Object.entries(af.multiselect)) {
    const av       = attrMap.get(key)
    const jsonArr  = Array.isArray(av?.json) ? (av.json as string[]) : []
    const textArr  = av?.text ? [av.text] : []
    const haystack = [...jsonArr, ...textArr]
    if (!values.some(v => haystack.includes(v))) return false
  }

  // Range: value_number must fall within min/max
  for (const [key, { min, max }] of Object.entries(af.range)) {
    const num = attrMap.get(key)?.number
    if (num == null) return false
    if (min !== undefined && num < min) return false
    if (max !== undefined && num > max) return false
  }

  // Boolean: value must match
  for (const [key, value] of Object.entries(af.boolean)) {
    const av       = attrMap.get(key)
    const boolVal  = av?.json === true || av?.text === 'true'
    if (boolVal !== value) return false
  }

  return true
}

// ── Data: filtered listings ───────────────────────────────────────────────────

async function fetchFilteredListings(
  categoryId:   number,
  entityTypes:  string[],
  af:           ActiveFilters,
  sort:         SortMode = 'newest',
  limit = 36,
): Promise<CategoryListing[]> {
  const supabase   = createCachedClient()
  const hasFilters = countActiveFilters(af) > 0
  const needsPrice = sort === 'price_asc' || sort === 'price_desc'

  // Resolve listing_types from entity_types
  const typeMap: Record<string, string> = {
    land_listing: 'land',
    product:      'product',
    service:      'service',
    restaurant:   'restaurant',
    tourism:      'tourism',
    rental:       'rental',
    event:        'event',
    storefront:   'storefront',
  }
  const listingTypes = entityTypes
    .map(et => typeMap[et] ?? et)
    .filter(t => t !== 'storefront')

  if (!listingTypes.length) return []

  const selectFields = hasFilters
    ? `id, slug, title, price_text, price_amount, cover_url, location_text, is_featured, is_verified, listing_type:type,
       listing_attribute_values(value_text, value_number, value_json,
         listing_attribute_schemas!inner(key))`
    : 'id, slug, title, price_text, price_amount, cover_url, location_text, is_featured, is_verified, listing_type:type'

  const { data, error } = await supabase
    .from('listings')
    .select(selectFields)
    .eq('category_id', categoryId)
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .in('listing_type', listingTypes)
    .order('is_featured', { ascending: false })
    .order('created_at',  { ascending: false })
    .limit(hasFilters || needsPrice ? 200 : limit)

  if (error) {
    console.error('[category/listings]', categoryId, error.message)
    return []
  }

  const rows = (data ?? []) as unknown as RawListingRow[]
  const filtered = hasFilters ? rows.filter(r => matchesFilters(r, af)) : rows

  // JS-side price sort
  if (sort === 'price_asc') {
    filtered.sort((a, b) => (a.price_amount ?? Infinity) - (b.price_amount ?? Infinity))
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => (b.price_amount ?? -Infinity) - (a.price_amount ?? -Infinity))
  }

  return filtered.slice(0, limit).map(r => ({
    id:            r.id,
    slug:          r.slug,
    title:         r.title,
    price_text:    r.price_text,
    cover_url:     r.cover_url,
    location_text: r.location_text,
    is_featured:   r.is_featured,
    is_verified:   r.is_verified,
    type:          r.type,
  }))
}

// ── Data: featured merchants ──────────────────────────────────────────────────

interface MerchantRow {
  id:            string
  slug:          string
  business_name: string
  description:   string | null
  avatar_url:    string | null
  is_verified:   boolean
}

async function fetchCategoryMerchants(categoryId: number, limit = 6): Promise<MerchantRow[]> {
  const supabase = createCachedClient()

  // Storefronts that have at least one listing in this category
  const { data, error } = await supabase
    .from('storefronts')
    .select(`
      id, slug, business_name, description, avatar_url, is_verified,
      listings!inner(id)
    `)
    .eq('listings.category_id', categoryId)
    .eq('listings.is_public', true)
    .eq('is_public', true)
    .order('is_verified', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[category/merchants]', categoryId, error.message)
    return []
  }

  return ((data ?? []) as unknown as MerchantRow[]).slice(0, limit)
}

// ── Metadata ──────────────────────────────────────────────────────────────────

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
    ?? `Khám phá ${c.name} trên VIO LOCAL — đất đai, doanh nghiệp và dịch vụ địa phương.`

  const crumbSchema = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      ...breadcrumbs,
      { id: c.id, name: c.name, full_slug: fullSlug, href: `/${fullSlug}` },
    ].map((b, i) => ({
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

// ── Sub-components ────────────────────────────────────────────────────────────

function Breadcrumbs({ crumbs }: { crumbs: CategoryCrumb[] }) {
  return (
    <nav
      className="mb-4 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-neutral-400"
      aria-label="Đường dẫn"
    >
      <Link href="/" className="no-underline hover:text-neutral-600 transition-colors">
        Trang chủ
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.id} className="flex items-center gap-1.5">
          <span aria-hidden="true">/</span>
          {i < crumbs.length - 1
            ? <Link href={c.href} className="no-underline hover:text-neutral-600 transition-colors">{c.name}</Link>
            : <span className="font-medium text-[#0A0A0A]">{c.name}</span>
          }
        </span>
      ))}
    </nav>
  )
}

function SubCategoryPills({ subcategories, siblings }: { subcategories: Category[]; siblings: Category[] }) {
  const items = subcategories.length > 0 ? subcategories : siblings.slice(0, 8)
  if (!items.length) return null
  const label = subcategories.length > 0 ? 'Danh mục con' : 'Danh mục liên quan'

  return (
    <div className="mt-5">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible">
        {items.map(c => (
          <Link
            key={c.id}
            href={`/${c.full_slug}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200
                       bg-white px-4 py-2 text-[0.875rem] font-medium text-[#0A0A0A] no-underline
                       transition-all hover:border-vio-primary/30 hover:bg-neutral-50"
          >
            {c.icon_emoji && <span aria-hidden="true">{c.icon_emoji}</span>}
            {c.name}
            {c.listing_count > 0 && (
              <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[0.625rem] font-bold text-neutral-500">
                {c.listing_count > 999 ? `${Math.floor(c.listing_count / 1000)}k+` : c.listing_count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

function ActiveFilterChips({
  af, attributes, fullSlug,
}: {
  af:         ActiveFilters
  attributes: CategoryAttribute[]
  fullSlug:   string
}) {
  type Chip = { label: string; clearParam: string; clearValue?: string }
  const chips: Chip[] = []

  const attrMap = new Map(attributes.map(a => [a.key, a]))

  for (const [key, value] of Object.entries(af.select)) {
    const attr = attrMap.get(key)
    const opt  = attr?.options?.find(o => o.value === value)
    chips.push({ label: `${attr?.label ?? key}: ${opt?.label ?? value}`, clearParam: key })
  }

  for (const [key, values] of Object.entries(af.multiselect)) {
    const attr = attrMap.get(key)
    const labels = values.map(v => attr?.options?.find(o => o.value === v)?.label ?? v)
    chips.push({ label: `${attr?.label ?? key}: ${labels.join(', ')}`, clearParam: key })
  }

  for (const [key, { min, max }] of Object.entries(af.range)) {
    const attr  = attrMap.get(key)
    const parts = [min !== undefined ? `từ ${min}` : null, max !== undefined ? `đến ${max}` : null].filter(Boolean)
    chips.push({ label: `${attr?.label ?? key}: ${parts.join(' ')}`, clearParam: `${key}_range` })
  }

  for (const [key] of Object.entries(af.boolean)) {
    const attr = attrMap.get(key)
    chips.push({ label: attr?.label ?? key, clearParam: key })
  }

  if (!chips.length) return null

  function clearHref(chip: Chip): string {
    const base = new URLSearchParams()
    // Rebuild all params except this chip's
    for (const [key, value] of Object.entries(af.select)) {
      if (chip.clearParam !== key) base.set(key, value)
    }
    for (const [key, values] of Object.entries(af.multiselect)) {
      if (chip.clearParam !== key) base.set(key, values.join(','))
    }
    for (const [key, { min, max }] of Object.entries(af.range)) {
      if (chip.clearParam !== `${key}_range`) {
        if (min !== undefined) base.set(`${key}_min`, String(min))
        if (max !== undefined) base.set(`${key}_max`, String(max))
      }
    }
    for (const [key, value] of Object.entries(af.boolean)) {
      if (chip.clearParam !== key) base.set(key, String(value))
    }
    const qs = base.toString()
    return qs ? `/${fullSlug}?${qs}` : `/${fullSlug}`
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map(chip => (
        <Link
          key={chip.label}
          href={clearHref(chip)}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200
                     bg-white px-3 py-1 text-[0.8125rem] font-medium text-[#0A0A0A] no-underline
                     transition-colors hover:bg-neutral-50"
        >
          {chip.label}
          <span className="text-neutral-400" aria-hidden="true">×</span>
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={`/${fullSlug}`}
          className="self-center text-[0.8125rem] text-neutral-400 no-underline hover:text-neutral-600"
        >
          Xóa tất cả
        </Link>
      )}
    </div>
  )
}

// ── Merchant card ─────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}
function avatarColor(name: string) {
  const p = ['#1A4D2E', '#0071E3', '#FF9500', '#34C759', '#5856D6', '#FF3B30']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return p[Math.abs(h) % p.length]!
}

function MerchantCard({ m }: { m: MerchantRow }) {
  return (
    <Link
      href={`/doanh-nghiep/${m.slug}`}
      className="group flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-4
                 shadow-sm no-underline transition-all duration-300
                 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden
                   rounded-2xl text-sm font-bold text-white"
        style={{ backgroundColor: avatarColor(m.business_name) }}
        aria-hidden="true"
      >
        {m.avatar_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          : initials(m.business_name)
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="m-0 truncate text-[0.9375rem] font-bold leading-tight text-[#0A0A0A]
                        group-hover:text-vio-forest transition-colors">
            {m.business_name}
          </p>
          {m.is_verified && (
            <span className="shrink-0 rounded-full bg-vio-primary/10 px-2 py-0.5
                             text-[10px] font-bold text-vio-forest">
              ✓ Xác thực
            </span>
          )}
        </div>
        {m.description && (
          <p className="m-0 mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-neutral-500">
            {m.description}
          </p>
        )}
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params:       Promise<{ path: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { path }  = await params
  const rawParams = await searchParams
  const fullSlug  = path.join('/')

  // ── Resolve category ────────────────────────────────────────────────────────
  const ctx = await getCategoryPageContext(fullSlug)

  if (!ctx) {
    const canonical = await resolveCategoryAlias(fullSlug)
    if (canonical) {
      redirect(`/${canonical}`)
    }
    notFound()
  }

  const { category, breadcrumbs, children, attributes, siblings } = ctx

  // ── Parse active filters + sort ────────────────────────────────────────────
  const af               = parseActiveFilters(rawParams, attributes)
  const activeFilterCount = countActiveFilters(af)
  const sort              = parseSort(rawParams['sort'])

  // ── Parallel data fetch ─────────────────────────────────────────────────────
  const [listings, merchants] = await Promise.all([
    fetchFilteredListings(category.id, category.entity_types, af, sort),
    fetchCategoryMerchants(category.id),
  ])

  // ── JSON-LD ─────────────────────────────────────────────────────────────────
  const breadcrumbSchema = {
    '@context':      'https://schema.org',
    '@type':         'BreadcrumbList',
    itemListElement: [
      ...breadcrumbs,
      { id: category.id, name: category.name, full_slug: fullSlug, href: `/${fullSlug}` },
    ].map((b, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      b.name,
      item:      `https://violocal.vn${b.href}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="border-b border-gray-200/60 bg-[#FBFBFD] px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <Breadcrumbs crumbs={breadcrumbs} />

          <div className="flex items-start gap-4">
            {category.icon_emoji && (
              <span className="text-4xl leading-none" aria-hidden="true">{category.icon_emoji}</span>
            )}
            <div className="min-w-0">
              <h1 className="m-0 text-3xl font-black tracking-tight text-[#0A0A0A] sm:text-4xl">
                {category.name}
              </h1>
              {category.description && (
                <p className="m-0 mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-neutral-500">
                  {category.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {category.listing_count > 0 && (
                  <span className="rounded-full bg-vio-primary/10 px-3 py-1 text-[0.8125rem] font-bold text-vio-forest">
                    {category.listing_count.toLocaleString('vi-VN')} tin đăng
                  </span>
                )}
                {merchants.length > 0 && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[0.8125rem] font-bold text-blue-600">
                    {merchants.length}+ doanh nghiệp
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sub-categories + siblings */}
          <SubCategoryPills subcategories={children} siblings={siblings} />

          {/* Active filter chips */}
          <ActiveFilterChips af={af} attributes={attributes} fullSlug={fullSlug} />
        </div>
      </div>

      {/* ── Main content: sidebar + results ───────────────── */}
      <div className="bg-[#FBFBFD] px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start gap-8">

            {/* CategoryFilters renders its own desktop sidebar + mobile FAB */}
            <CategoryFilters
              attributes={attributes}
              activeFilterCount={activeFilterCount}
            />

            {/* Results column */}
            <div className="flex-1 min-w-0 space-y-12">

              {/* ── Featured Merchants ────────────────────── */}
              {merchants.length > 0 && (
                <section aria-labelledby="merchants-heading">
                  <SectionHeader
                    kicker="Doanh nghiệp"
                    kickerColor="text-vio-blue"
                    title="Doanh nghiệp trong ngành"
                    action={{ label: 'Tất cả doanh nghiệp →', href: '/doanh-nghiep' }}
                    className="mb-5"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {merchants.map(m => <MerchantCard key={m.id} m={m} />)}
                  </div>
                </section>
              )}

              {/* ── Listings Grid ─────────────────────────── */}
              <section aria-labelledby="listings-heading">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2
                      id="listings-heading"
                      className="m-0 text-[0.9375rem] font-bold text-gray-900"
                    >
                      {activeFilterCount > 0 ? `${listings.length} kết quả` : `${listings.length} tin đăng`}
                    </h2>
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[0.75rem] font-semibold text-green-700">
                        {activeFilterCount} bộ lọc
                      </span>
                    )}
                  </div>
                  <Suspense fallback={null}>
                    <SortSelect current={sort} />
                  </Suspense>
                </div>

                {listings.length > 0 ? (
                  <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                    {listings.map(listing => (
                      <li key={listing.id}>
                        <CategoryListingCard listing={listing} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-neutral-200 py-20 text-center">
                    <p className="m-0 text-3xl" aria-hidden="true">🔍</p>
                    <p className="m-0 mt-3 text-[0.9375rem] font-semibold text-[#0A0A0A]">
                      Không có tin đăng phù hợp
                    </p>
                    <p className="m-0 mt-1 text-[0.8125rem] text-neutral-500">
                      Thử thay đổi bộ lọc hoặc tìm kiếm với từ khoá khác
                    </p>
                    {activeFilterCount > 0 && (
                      <Link
                        href={`/${fullSlug}`}
                        className="mt-4 inline-flex h-9 items-center rounded-xl border border-neutral-200
                                   bg-white px-5 text-sm font-semibold text-[#0A0A0A] no-underline
                                   transition-colors hover:bg-neutral-50"
                      >
                        Xóa tất cả bộ lọc
                      </Link>
                    )}
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
