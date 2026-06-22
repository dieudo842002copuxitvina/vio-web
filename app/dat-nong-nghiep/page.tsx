import type { Metadata }          from 'next'
import { Suspense }               from 'react'
import Link                       from 'next/link'
import { fetchLandListings,
         fetchProvinces }         from '@/features/search/api/land-search.server'
import { getTrendingListings }    from '@/features/recommendation/api/recommendation.server'
import { getTrendingSearches }    from '@/features/search/api/search.server'
import { TrendingListingsSection } from '@/features/recommendation/components/TrendingListingsSection'
import { TrendingSearches }       from '@/features/recommendation/components/TrendingSearches'
import { LandListingCard }        from '@/entities/listing'
import { FilterSidebar }          from './_components/FilterSidebar'
import { FilterMobileSheet }      from './_components/FilterMobileSheet'
import { SortSelectClient }       from './_components/SortSelectClient'

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Khám phá Đất Nông Nghiệp toàn quốc | VIO AGRI',
  description: 'Mua bán và cho thuê đất nông nghiệp trên toàn 63 tỉnh thành Việt Nam. Đất lúa, cây ăn trái, cây lâu năm, lâm nghiệp và nhiều loại khác.',
  alternates:  { canonical: '/dat-nong-nghiep' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTyToVnd(ty: string): number | undefined {
  const n = parseFloat(ty)
  return isNaN(n) ? undefined : Math.round(n * 1_000_000_000)
}

function countActiveFilters(sp: Record<string, string | string[]>): number {
  const keys = ['giao_dich','tinh','loai','gia_min','gia_max',
                'dien_tich_min','dien_tich_max','phap_ly',
                'xac_minh','duong_o_to','nguon_nuoc','dien']
  return keys.filter(k => {
    const v = sp[k]
    return v && v !== '' && v !== '0'
  }).length
}



// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F2F2F7]">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="13" cy="13" r="8" stroke="#8E8E93" strokeWidth="1.8"/>
          <path d="M19 19l5 5" stroke="#8E8E93" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M10 13h6M13 10v6" stroke="#8E8E93" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="text-[17px] font-semibold text-[#1d1d1f]">Không tìm thấy kết quả</p>
      <p className="max-w-[280px] text-[14px] text-[#6e6e73]">
        Thử điều chỉnh bộ lọc hoặc mở rộng phạm vi tìm kiếm.
      </p>
      <Link
        href="/dat-nong-nghiep"
        className="mt-2 rounded-full bg-[#1A4D2E] px-5 py-2.5 text-[14px] font-semibold text-white"
      >
        Xoá bộ lọc
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

export default async function LandIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams

  // Resolve province id from slug
  const [provinces, trendingListings, trendingQueries] = await Promise.all([
    fetchProvinces(),
    getTrendingListings('national', undefined, 12),
    getTrendingSearches(),
  ])

  const activeProvince = sp.tinh
    ? provinces.find(p => p.slug === sp.tinh)
    : undefined

  // Build land type array from comma-sep param
  const landTypes = sp.loai ? sp.loai.split(',').filter(Boolean) : undefined
  const legals    = sp.phap_ly ? [sp.phap_ly] : undefined

  const sortMap: Record<string, 'newest' | 'price_asc' | 'price_desc'> = {
    price_asc:  'price_asc',
    price_desc: 'price_desc',
    newest:     'newest',
  }
  const sort = sortMap[sp.sap_xep ?? ''] ?? 'newest'

  const page = Math.max(1, parseInt(sp.trang ?? '1', 10) || 1)

  const result = await fetchLandListings({
    provinceId: activeProvince?.id,
    landTypes,
    legals,
    priceMin:  sp.gia_min    ? parseTyToVnd(sp.gia_min)    : undefined,
    priceMax:  sp.gia_max    ? parseTyToVnd(sp.gia_max)    : undefined,
    sort,
    page,
  })

  const { listings, total, totalPages } = result
  const activeCount = countActiveFilters(sp)
  const isFiltered = activeCount > 0

  return (
    <main className="mx-auto max-w-[1280px] px-4 pt-6 pb-24 sm:px-8">

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-[13px] text-[#86868b]">
        <Link href="/" className="hover:text-[#1d1d1f] transition-colors">Trang chủ</Link>
        <span>/</span>
        <span className="font-medium text-[#1d1d1f]">Đất nông nghiệp</span>
        {activeProvince && (
          <>
            <span>/</span>
            <span className="font-medium text-[#1d1d1f]">{activeProvince.name}</span>
          </>
        )}
      </nav>

      {/* Page title */}
      <header className="mb-8">
        <span className="mb-3 inline-flex items-center rounded-full bg-[#34C759]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#34C759]">
          Thị trường đất đai
        </span>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#1d1d1f] sm:text-[36px]">
          {activeProvince
            ? `Đất nông nghiệp ${activeProvince.name}`
            : 'Khám phá Đất Nông Nghiệp'}
        </h1>
        <p className="mt-2 text-[15px] text-[#6e6e73]">
          {total > 0
            ? `${total.toLocaleString('vi-VN')} tin đang đăng`
            : isFiltered
              ? 'Không có kết quả cho bộ lọc này'
              : 'Mua bán & cho thuê đất lúa, cây ăn trái, lâm nghiệp toàn quốc.'}
        </p>
      </header>

      {/* Trending (only on unfiltered page 1) */}
      {!isFiltered && page === 1 && (
        <>
          <TrendingSearches queries={trendingQueries} />
          <TrendingListingsSection listings={trendingListings} />
        </>
      )}

      {/* ── Split layout: sidebar + results ─────────────── */}
      <div className="mt-4 flex gap-8 items-start">

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-[260px] shrink-0">
          <div className="sticky top-[72px] rounded-[16px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
            <Suspense>
              <FilterSidebar provinces={provinces} />
            </Suspense>
          </div>
        </div>

        {/* Results column */}
        <div className="min-w-0 flex-1">

          {/* Mobile: filter button + sort row */}
          <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
            <Suspense>
              <FilterMobileSheet provinces={provinces} activeCount={activeCount} />
            </Suspense>
            <SortSelectClient current={sp.sap_xep ?? ''} />
          </div>

          {/* Desktop: results count + sort */}
          <div className="mb-5 hidden items-center justify-between lg:flex">
            <p className="text-[14px] text-[#6e6e73]">
              {total > 0 ? `${total.toLocaleString('vi-VN')} kết quả` : ''}
            </p>
            <SortSelectClient current={sp.sap_xep ?? ''} />
          </div>

          {/* Grid */}
          {listings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map(l => (
                <LandListingCard
                  key={l.id}
                  slug={l.slug}
                  title={l.title}
                  price_text={l.price_text}
                  location={l.location_text}
                  image_url={l.cover_url}
                  is_featured={l.is_featured}
                  layout="grid"
                  showFavorite
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="mt-10 flex items-center justify-center gap-2"
              aria-label="Phân trang"
            >
              {page > 1 && (
                <PaginationLink page={page - 1} sp={sp} label="← Trước" />
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <PaginationLink
                    key={p}
                    page={p}
                    sp={sp}
                    label={String(p)}
                    active={p === page}
                  />
                )
              })}
              {page < totalPages && (
                <PaginationLink page={page + 1} sp={sp} label="Tiếp →" />
              )}
            </nav>
          )}
        </div>
      </div>
    </main>
  )
}

// ── Pagination link helper ─────────────────────────────────────────────────────

function PaginationLink({
  page, sp, label, active,
}: {
  page: number
  sp: Record<string, string>
  label: string
  active?: boolean
}) {
  const params = new URLSearchParams(sp)
  params.set('trang', String(page))
  return (
    <Link
      href={`/dat-nong-nghiep?${params.toString()}`}
      className={`flex h-9 min-w-[36px] items-center justify-center rounded-[9px] px-3 text-[14px] font-medium transition-colors ${
        active
          ? 'bg-[#1A4D2E] text-white'
          : 'bg-white text-[#1d1d1f] hover:bg-[#F2F2F7] border border-[rgba(60,60,67,0.12)]'
      }`}
    >
      {label}
    </Link>
  )
}
