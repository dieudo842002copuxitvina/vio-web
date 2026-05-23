import type { MetadataRoute } from 'next'
import { createClient }       from '@/lib/supabase/server'

export const revalidate = 86400  // 24h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base     = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://violocal.vn'
  const supabase = await createClient()

  const [provincesRes, storefrontsRes, listingsRes] = await Promise.all([
    supabase.from('provinces').select('slug, updated_at').order('slug'),
    supabase.from('storefronts').select('slug, updated_at').eq('is_public', true).order('updated_at', { ascending: false }).limit(1000),
    supabase.from('land_listings').select('slug, updated_at').eq('is_public', true).eq('moderation_status', 'approved').order('updated_at', { ascending: false }).limit(1000),
  ])

  const provinceUrls: MetadataRoute.Sitemap = (provincesRes.data ?? []).map(p => ({
    url:          `${base}/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const storefrontUrls: MetadataRoute.Sitemap = (storefrontsRes.data ?? []).map(s => ({
    url:          `${base}/ho-kinh-doanh/${s.slug}`,
    lastModified: s.updated_at,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const listingUrls: MetadataRoute.Sitemap = (listingsRes.data ?? []).map(l => ({
    url:          `${base}/dat-nong-nghiep/chi-tiet/${l.slug}`,
    lastModified: l.updated_at,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    { url: base, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/dat-nong-nghiep`, changeFrequency: 'daily', priority: 0.9 },
    ...provinceUrls,
    ...storefrontUrls,
    ...listingUrls,
  ]
}
