import type { MetadataRoute } from 'next'
import { createClient }          from '@/lib/supabase/server'
import { getLandSitemapFeedSEO } from '@/features/seo/api/seo-feeds.server'

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

// ── Main export ───────────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Listings read from MV (pre-filtered, no moderation conditions needed).
  // Other entities have no MV yet — direct table reads remain.
  const [listings, provincesRes, categoriesRes, storefrontsRes] = await Promise.all([
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
  ])

  const provinces   = (provincesRes.data   ?? []) as ProvinceRow[]
  const categories  = (categoriesRes.data  ?? []) as CategoryRow[]
  const storefronts = (storefrontsRes.data ?? []) as StorefrontRow[]

  return [
    ...buildStaticEntries(),
    ...buildLandProvinceEntries(provinces),
    ...buildListingEntries(listings),
    ...buildCategoryEntries(categories),
    ...buildStorefrontEntries(storefronts),
  ]
}
