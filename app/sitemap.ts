import type { MetadataRoute } from 'next'
import { createClient }          from '@/lib/supabase/server'
import { getLandSitemapFeedSEO } from '@/features/seo/api/seo-feeds.server'

// Land type DB key → URL slug (mirrors LAND_TYPES in province+type page)
const LAND_TYPE_SLUG: Record<string, string> = {
  lua:          'lua',
  rau_mau:      'rau-mau',
  cay_lau_nam:  'cay-lau-nam',
  cay_an_trai:  'an-trai',
  lam_nghiep:   'lam-nghiep',
  mat_nuoc:     'mat-nuoc',
  hon_hop:      'hon-hop',
}

// ── Base URL ──────────────────────────────────────────────────────────────────
// Hardcoded — this is a public, production-only document.
// NEXT_PUBLIC_SITE_URL is intentionally NOT used here: it is set to
// http://localhost:3000 in .env.local, which would produce invalid sitemap
// entries if that variable were accidentally missing in a production deploy.

const BASE = 'https://violocal.vn'

// Regenerate at most once per hour.
// (sitemap.ts is a cached Route Handler; revalidate controls ISR TTL.)
export const revalidate = 3600

// ── Helpers ───────────────────────────────────────────────────────────────────

type SitemapEntry = MetadataRoute.Sitemap[number]

function u(path: string): string {
  return `${BASE}${path}`
}

// ── Supabase row shapes ───────────────────────────────────────────────────────
// Only the columns sitemap generation needs — no wildcard selects, no joins.

interface ProvinceRow   { slug: string; updated_at: string }
interface CategoryRow   { full_slug: string; updated_at: string }
interface StorefrontRow { slug: string; updated_at: string }

// ── URL group builders ────────────────────────────────────────────────────────

function buildStaticEntries(): SitemapEntry[] {
  return [
    {
      url:             u('/'),
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        1.0,
    },
    {
      url:             u('/dat-nong-nghiep'),
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        0.9,
    },
    {
      url:             u('/tim-kiem'),
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        0.8,
    },
    {
      url:             u('/ban-do'),
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        0.7,
    },
    {
      url:             u('/ban-do-nong-nghiep'),
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.8,
    },
  ]
}

function buildLandProvinceEntries(provinces: ProvinceRow[]): SitemapEntry[] {
  return provinces.map(p => ({
    url:             u(`/dat-nong-nghiep/${p.slug}`),
    lastModified:    p.updated_at,
    changeFrequency: 'daily' as const,
    priority:        0.8,
  }))
}

function buildListingEntries(
  listings: { slug: string; updated_at: string; is_featured: boolean }[],
): SitemapEntry[] {
  // Route: app/dat/[slug]/page.tsx — canonical listing detail URL.
  // app/dat-nong-nghiep/chi-tiet/[slug] 308-redirects here.
  //
  // Source: listings_featured_by_province MV (pre-filtered public/approved/published).
  // Scaling note: Google enforces a 50,000 URL/sitemap limit.
  // At 100k+ listings, split into app/dat/sitemap.ts using generateSitemaps().
  return listings.map(l => ({
    url:             u(`/dat/${l.slug}`),
    lastModified:    l.updated_at,
    changeFrequency: 'weekly' as const,
    priority:        l.is_featured ? 0.9 : 0.7,
  }))
}

function buildCategoryEntries(categories: CategoryRow[]): SitemapEntry[] {
  return categories.map(c => ({
    url:             u(`/${c.full_slug}`),
    lastModified:    c.updated_at,
    changeFrequency: 'weekly' as const,
    priority:        0.7,
  }))
}

function buildStorefrontEntries(storefronts: StorefrontRow[]): SitemapEntry[] {
  return storefronts.map(s => ({
    url:             u(`/doanh-nghiep/${s.slug}`),
    lastModified:    s.updated_at,
    changeFrequency: 'weekly' as const,
    priority:        0.6,
  }))
}

interface DistrictComboRow {
  province_slug: string
  district_slug: string
  updated_at:    string
}

interface ProvinceTypeComboRow {
  province_slug: string
  land_type:     string
  updated_at:    string
}

function buildDistrictEntries(rows: DistrictComboRow[]): SitemapEntry[] {
  return rows.map(r => ({
    url:             u(`/dat-nong-nghiep/${r.province_slug}/${r.district_slug}`),
    lastModified:    r.updated_at,
    changeFrequency: 'weekly' as const,
    priority:        0.6,
  }))
}

function buildProvinceTypeEntries(rows: ProvinceTypeComboRow[]): SitemapEntry[] {
  return rows
    .filter(r => LAND_TYPE_SLUG[r.land_type])
    .map(r => ({
      url:             u(`/dat-nong-nghiep/${r.province_slug}/loai/${LAND_TYPE_SLUG[r.land_type]}`),
      lastModified:    r.updated_at,
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }))
}

// ── Main export ───────────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Listings read from MV (pre-filtered, no moderation conditions needed).
  // Other entities have no MV yet — direct table reads remain.
  const [listings, provincesRes, categoriesRes, storefrontsRes, districtComboRes, typeComboRes] = await Promise.all([
    getLandSitemapFeedSEO(1_000),

    supabase
      .from('provinces')
      .select('slug, updated_at')
      .order('name'),

    supabase
      .from('categories')
      .select('full_slug, updated_at')
      .eq('is_active', true)
      .order('sort_order'),

    supabase
      .from('storefronts')
      .select('slug, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(500),

    // Districts with >= 3 approved listings
    supabase.rpc('get_district_sitemap_combos', { min_count: 3 }).limit(2_000),

    // Province × land_type combos with >= 3 approved listings
    supabase.rpc('get_province_type_sitemap_combos', { min_count: 3 }).limit(1_000),
  ])

  const provinces        = (provincesRes.data      ?? []) as ProvinceRow[]
  const categories       = (categoriesRes.data     ?? []) as CategoryRow[]
  const storefronts      = (storefrontsRes.data    ?? []) as StorefrontRow[]
  const districtCombos   = (districtComboRes.data  ?? []) as DistrictComboRow[]
  const typeProvCombos   = (typeComboRes.data       ?? []) as ProvinceTypeComboRow[]

  return [
    ...buildStaticEntries(),
    ...buildLandProvinceEntries(provinces),
    ...buildListingEntries(listings),
    ...buildCategoryEntries(categories),
    ...buildStorefrontEntries(storefronts),
    ...buildDistrictEntries(districtCombos),
    ...buildProvinceTypeEntries(typeProvCombos),
  ]
}
