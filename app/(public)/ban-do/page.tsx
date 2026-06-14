import type { Metadata }               from 'next'
import { Suspense }                    from 'react'
import {
  fetchLandListings,
  fetchProvinces,
}                                      from '@/features/search/api/land-search.server'
import { MapSearchPanel }              from './_components/MapSearchPanel'
import type { MapFilters }             from './_components/MapSearchPanel'

export const revalidate = 60

export const metadata: Metadata = {
  title:       'Bản đồ đất nông nghiệp | VIO AGRI',
  description: 'Khám phá đất nông nghiệp trên bản đồ toàn quốc. Lọc theo tỉnh thành, giá, diện tích và loại đất.',
  robots:      { index: true, follow: true },
}

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

export default async function BanDoPage({ searchParams }: PageProps) {
  const sp = await searchParams

  const filters: MapFilters = {
    province:  sp.province  ?? '',
    priceMin:  sp.priceMin  ?? '',
    priceMax:  sp.priceMax  ?? '',
    areaMin:   sp.areaMin   ?? '',
    areaMax:   sp.areaMax   ?? '',
    landType:  sp.landType  ?? '',
  }

  // Resolve province id from slug
  const provinces = await fetchProvinces()
  const activeProv = filters.province
    ? provinces.find(p => p.slug === filters.province)
    : undefined

  // Build query params
  const priceMax  = filters.priceMax  ? Number(filters.priceMax)  : undefined
  const areaMax   = filters.areaMax   ? Number(filters.areaMax)   : undefined
  const landTypes = filters.landType  ? [filters.landType]        : undefined

  const result = await fetchLandListings({
    provinceId: activeProv?.id,
    priceMax,
    landTypes,
    sort: 'newest',
    page: 1,
  })

  // Area filter is a post-query client-side approximation for now
  // (land-search doesn't expose areaMax param yet — handled in MapSearchPanel)

  return (
    // Full viewport minus top nav (pt-14 mobile / pt-16 desktop) + bottom tab bar on mobile
    <div className="h-[calc(100dvh-3.5rem-3.5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-4rem)]
                    overflow-hidden -mx-0">
      <Suspense>
        <MapSearchPanel
          initialListings={result.listings}
          provinces={provinces}
          initialFilters={filters}
          total={result.total}
        />
      </Suspense>
    </div>
  )
}
