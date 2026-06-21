// Internal linking graph for GEO SEO pages.
// Each function returns a set of related page links for a given context.
// Used to build "see also" sections that pass PageRank between geo pages.

import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InternalLink {
  label: string
  href:  string
  count?: number   // listing count for anchor text enrichment
}

export interface InternalLinkGroup {
  heading: string
  links:   InternalLink[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Land types — canonical slug ↔ display label
// ─────────────────────────────────────────────────────────────────────────────

export const LAND_TYPE_LABELS: Record<string, string> = {
  lua:            'Đất lúa',
  rau_mau:        'Đất rau màu',
  cay_lau_nam:    'Đất cây lâu năm',
  cay_an_trai:    'Đất cây ăn trái',
  lam_nghiep:     'Đất lâm nghiệp',
  mat_nuoc:       'Đất mặt nước',
  hon_hop:        'Đất hỗn hợp',
}

export const LAND_TYPE_SLUGS = Object.keys(LAND_TYPE_LABELS)

// ─────────────────────────────────────────────────────────────────────────────
// getProvinceInternalLinks
// Used on: /dat-nong-nghiep/[province]
// ─────────────────────────────────────────────────────────────────────────────

export async function getProvinceInternalLinks(
  provinceId: string,
  provinceSlug: string,
): Promise<InternalLinkGroup[]> {
  const supabase = await createClient()

  const { data: districts } = await supabase
    .from('districts')
    .select('id, name, slug')
    .eq('province_id', provinceId)
    .order('name', { ascending: true })
    .limit(20)

  const districtLinks: InternalLink[] = (districts ?? []).map(d => ({
    label: d.name as string,
    href:  `/dat-nong-nghiep/${provinceSlug}/${d.slug}`,
  }))

  const landTypeLinks: InternalLink[] = LAND_TYPE_SLUGS.map(slug => ({
    label: LAND_TYPE_LABELS[slug],
    href:  `/dat-nong-nghiep/${provinceSlug}/loai/${slug}`,
  }))

  const groups: InternalLinkGroup[] = []

  if (districtLinks.length > 0) {
    groups.push({ heading: 'Theo huyện / thị xã', links: districtLinks })
  }
  groups.push({ heading: 'Theo loại đất', links: landTypeLinks })

  return groups
}

// ─────────────────────────────────────────────────────────────────────────────
// getDistrictInternalLinks
// Used on: /dat-nong-nghiep/[province]/[district]
// ─────────────────────────────────────────────────────────────────────────────

export async function getDistrictInternalLinks(
  districtId:   string,
  districtSlug: string,
  provinceSlug: string,
  provinceName: string,
): Promise<InternalLinkGroup[]> {
  const supabase = await createClient()

  const { data: wards } = await supabase
    .from('wards')
    .select('id, name, slug')
    .eq('district_id', districtId)
    .order('name', { ascending: true })
    .limit(30)

  const wardLinks: InternalLink[] = (wards ?? []).map(w => ({
    label: w.name as string,
    href:  `/dat-nong-nghiep/${provinceSlug}/${districtSlug}/${w.slug}`,
  }))

  const landTypeLinks: InternalLink[] = LAND_TYPE_SLUGS.map(slug => ({
    label: LAND_TYPE_LABELS[slug],
    href:  `/dat-nong-nghiep/${provinceSlug}/${districtSlug}?loai=${slug}`,
  }))

  const groups: InternalLinkGroup[] = []

  if (wardLinks.length > 0) {
    groups.push({ heading: 'Theo xã / phường', links: wardLinks })
  }
  groups.push({ heading: 'Theo loại đất', links: landTypeLinks })
  groups.push({
    heading: 'Xem thêm',
    links: [
      { label: `Toàn tỉnh ${provinceName}`, href: `/dat-nong-nghiep/${provinceSlug}` },
      { label: 'Tất cả tỉnh thành',         href: '/dat-nong-nghiep' },
    ],
  })

  return groups
}

// ─────────────────────────────────────────────────────────────────────────────
// getCommuneInternalLinks
// Used on: /dat-nong-nghiep/[province]/[district]/[commune]
// ─────────────────────────────────────────────────────────────────────────────

export async function getCommuneInternalLinks(
  districtId:   string,
  districtName: string,
  districtSlug: string,
  provinceSlug: string,
  provinceName: string,
  currentWardSlug: string,
): Promise<InternalLinkGroup[]> {
  const supabase = await createClient()

  const { data: siblingWards } = await supabase
    .from('wards')
    .select('id, name, slug')
    .eq('district_id', districtId)
    .neq('slug', currentWardSlug)
    .order('name', { ascending: true })
    .limit(15)

  const siblingLinks: InternalLink[] = (siblingWards ?? []).map(w => ({
    label: w.name as string,
    href:  `/dat-nong-nghiep/${provinceSlug}/${districtSlug}/${w.slug}`,
  }))

  const groups: InternalLinkGroup[] = []

  if (siblingLinks.length > 0) {
    groups.push({ heading: `Xã phường khác tại ${districtName}`, links: siblingLinks })
  }
  groups.push({
    heading: 'Lên cấp trên',
    links: [
      { label: `Toàn huyện ${districtName}`,  href: `/dat-nong-nghiep/${provinceSlug}/${districtSlug}` },
      { label: `Toàn tỉnh ${provinceName}`,   href: `/dat-nong-nghiep/${provinceSlug}` },
      { label: 'Tất cả tỉnh thành',           href: '/dat-nong-nghiep' },
    ],
  })

  return groups
}

// ─────────────────────────────────────────────────────────────────────────────
// getLandTypeInternalLinks
// Used on: /dat-nong-nghiep/loai/[type]
// ─────────────────────────────────────────────────────────────────────────────

export async function getLandTypeInternalLinks(
  currentType: string,
): Promise<InternalLinkGroup[]> {
  const supabase = await createClient()

  // Provinces with at least 1 listing of this land type
  const { data: provinceRows } = await supabase
    .from('listings')
    .select('province_id, provinces!inner(name, slug)')
    .eq('land_type', currentType)
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .limit(200)

  // Deduplicate
  const seen = new Set<string>()
  const provinceLinks: InternalLink[] = []
  for (const r of (provinceRows ?? [])) {
    const prov = (r as unknown as { provinces: { name: string; slug: string } }).provinces
    if (!seen.has(prov.slug)) {
      seen.add(prov.slug)
      provinceLinks.push({
        label: prov.name,
        href:  `/dat-nong-nghiep/${prov.slug}/loai/${currentType}`,
      })
    }
  }

  const otherTypes: InternalLink[] = LAND_TYPE_SLUGS
    .filter(s => s !== currentType)
    .map(s => ({
      label: LAND_TYPE_LABELS[s],
      href:  `/dat-nong-nghiep/loai/${s}`,
    }))

  const groups: InternalLinkGroup[] = []

  if (provinceLinks.length > 0) {
    groups.push({ heading: 'Theo tỉnh thành', links: provinceLinks.slice(0, 20) })
  }
  groups.push({ heading: 'Loại đất khác', links: otherTypes })

  return groups
}

// ─────────────────────────────────────────────────────────────────────────────
// InternalLinkSection — pure TSX-compatible render helper
// Exported as a plain object so callers can render it without importing React.
// ─────────────────────────────────────────────────────────────────────────────

export function flattenGroups(groups: InternalLinkGroup[]): InternalLink[] {
  return groups.flatMap(g => g.links)
}
