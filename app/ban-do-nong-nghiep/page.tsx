import type { Metadata } from 'next'
import Link              from 'next/link'
import { AGRI_REGIONS }  from '@/lib/agri/climate-zones'
import { SOIL_PROFILES, SOIL_FERTILITY_ORDER } from '@/lib/agri/soil-profiles'
import { CROP_PROFILES } from '@/lib/agri/crop-profiles'
import { PROVINCE_AGRI_DATA } from '@/lib/agri/province-agri-data'
import { breadcrumbSchema, itemListSchema } from '@/lib/seo/schema'

export const metadata: Metadata = {
  title:       'Bản đồ Nông nghiệp Việt Nam | VIO AGRI',
  description: 'Tổng quan nông nghiệp 63 tỉnh thành: 7 vùng sinh thái, thành phần đất, cây trồng đặc sản và tiềm năng xuất khẩu.',
  openGraph: {
    title:       'Bản đồ Nông nghiệp Việt Nam',
    description: 'Khám phá đặc điểm nông nghiệp từng vùng, loại đất và cây trồng phù hợp trên VIO AGRI.',
    url:         '/ban-do-nong-nghiep',
    images:      [{ url: '/api/og?type=province&name=Vi%E1%BB%87t+Nam&count=0&region=N%C3%B4ng+nghi%E1%BB%87p', width: 1200, height: 630 }],
  },
  alternates: { canonical: '/ban-do-nong-nghiep' },
}

const CLIMATE_LABEL: Record<string, string> = {
  tropical_wet:  'Nhiệt đới ẩm',
  tropical_dry:  'Nhiệt đới khô',
  subtropical:   'Cận nhiệt đới',
  highland:      'Cao nguyên',
  monsoon:       'Gió mùa',
}

const FERTILITY_LABEL: Record<string, { label: string; color: string }> = {
  high:   { label: 'Phì nhiêu cao', color: 'bg-emerald-100 text-emerald-800' },
  medium: { label: 'Phì nhiêu TB',  color: 'bg-amber-100  text-amber-800'   },
  low:    { label: 'Phì nhiêu thấp', color: 'bg-neutral-100 text-neutral-600' },
}

const MARKET_BADGE: Record<string, { label: string; color: string }> = {
  premium:   { label: 'Giá trị cao',      color: 'bg-amber-100 text-amber-800'    },
  standard:  { label: 'Giá trị TB',       color: 'bg-blue-100  text-blue-800'     },
  commodity: { label: 'Hàng hóa',         color: 'bg-neutral-100 text-neutral-600' },
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const schemaBreadcrumb = breadcrumbSchema([
  { name: 'Trang chủ',           href: '/' },
  { name: 'Đất nông nghiệp',     href: '/dat-nong-nghiep' },
  { name: 'Bản đồ nông nghiệp' },
])

const schemaItems = itemListSchema({
  name:  'Vùng nông nghiệp Việt Nam',
  items: AGRI_REGIONS.map(r => ({ slug: `ban-do-nong-nghiep#${r.id}`, title: r.name_vi })),
})

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgriculturalAtlasPage() {
  const topCrops = Object.values(CROP_PROFILES).filter(c => c.market_value === 'premium').slice(0, 12)
  const provinces = Object.values(PROVINCE_AGRI_DATA).filter(Boolean) as NonNullable<typeof PROVINCE_AGRI_DATA[string]>[]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaItems) }} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-gray-200/60 bg-[#FBFBFD]">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-green-200/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-100/40 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-10 md:px-8 md:pb-16 md:pt-14">
          <nav className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-gray-400" aria-label="Điều hướng vị trí">
            <Link href="/" className="no-underline hover:text-gray-600">Trang chủ</Link>
            <span>/</span>
            <Link href="/dat-nong-nghiep" className="no-underline hover:text-gray-600">Đất nông nghiệp</Link>
            <span>/</span>
            <span className="font-medium text-gray-900">Bản đồ nông nghiệp</span>
          </nav>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="text-[0.75rem] font-semibold text-emerald-700">
              {provinces.length} tỉnh thành · {AGRI_REGIONS.length} vùng sinh thái
            </span>
          </div>

          <h1 className="mt-4 text-[2.25rem] font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            Bản đồ Nông nghiệp
            <br />
            <span className="text-green-700">Việt Nam</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-gray-500">
            Khám phá đặc điểm nông nghiệp từng vùng, thành phần đất và cây trồng phù hợp.
            Dữ liệu thực địa giúp nhà đầu tư chọn đúng vùng và đúng cây.
          </p>
        </div>
      </div>

      <main className="bg-[#FBFBFD] px-4 pb-24 pt-10 md:px-8">
        <div className="mx-auto max-w-5xl space-y-20">

          {/* ── 7 Agricultural Regions ──────────────────────────────────── */}
          <section>
            <div className="mb-6">
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">7 vùng sinh thái</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Vùng nông nghiệp Việt Nam</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {AGRI_REGIONS.map(region => (
                <div
                  key={region.id}
                  id={region.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-emerald-600">
                        {region.name_short}
                      </span>
                      <h3 className="mt-0.5 text-base font-bold text-gray-900">{region.name_vi}</h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[0.75rem] font-medium text-gray-600">
                      {CLIMATE_LABEL[region.climate] ?? region.climate}
                    </span>
                  </div>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-gray-500 line-clamp-3">
                    {region.description_vi}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {region.main_crops.slice(0, 4).map(cropId => {
                      const crop = CROP_PROFILES[cropId]
                      if (!crop) return null
                      return (
                        <span key={cropId} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.75rem] font-medium text-emerald-700">
                          {crop.name_vi}
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[0.75rem] text-gray-400">
                    <span>🌧 {region.rainfall_mm}</span>
                    <span>🌡 {region.temperature}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 7 Soil Types ─────────────────────────────────────────────── */}
          <section>
            <div className="mb-6">
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">7 loại đất chính</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Hướng dẫn thành phần đất</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SOIL_FERTILITY_ORDER.map(soilType => {
                const sp = SOIL_PROFILES[soilType]
                const badge = FERTILITY_LABEL[sp.fertility]
                return (
                  <div key={soilType} className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[0.9375rem] font-bold text-gray-900">{sp.name_vi}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-gray-500">
                      {sp.characteristics_vi.split('. ')[0]}.
                    </p>
                    <dl className="mt-3 space-y-1 text-[0.75rem]">
                      <div className="flex justify-between">
                        <dt className="text-gray-400">pH</dt>
                        <dd className="font-medium text-gray-700">{sp.ph_range}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-400">Thoát nước</dt>
                        <dd className="font-medium text-gray-700">
                          {sp.drainage === 'good' ? 'Tốt' : sp.drainage === 'moderate' ? 'TB' : 'Kém'}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-2.5 text-[0.75rem] text-emerald-700 font-medium">
                      {sp.best_crops_vi.split(',').slice(0, 2).join(', ')}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Premium Crop Profiles ─────────────────────────────────────── */}
          <section>
            <div className="mb-6">
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">Hồ sơ cây trồng</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Cây trồng xuất khẩu giá trị cao</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topCrops.map(crop => {
                const badge = MARKET_BADGE[crop.market_value]
                return (
                  <div key={crop.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[0.875rem] font-bold text-gray-900">{crop.name_vi}</p>
                        <p className="text-[0.75rem] text-gray-400">{crop.name_en}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    {crop.export_markets.length > 0 && (
                      <p className="mt-2 text-[0.75rem] text-blue-600">
                        XK: {crop.export_markets.slice(0, 3).join(' · ')}
                      </p>
                    )}
                    <p className="mt-1.5 text-[0.75rem] text-gray-500 line-clamp-2">
                      {crop.growing_season_vi.split(';')[0]}
                    </p>
                    {crop.vietgap_common && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[0.7rem] font-medium text-green-700">
                        ✓ VietGAP phổ biến
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Province Grid with specialties ───────────────────────────── */}
          <section>
            <div className="mb-6">
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">
                {provinces.length} tỉnh thành chính
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Nông sản đặc sản theo tỉnh</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {provinces.map(p => (
                <Link
                  key={p.province_slug}
                  href={`/dat-nong-nghiep/${p.province_slug}`}
                  className="rounded-2xl border border-gray-200 bg-white p-4 no-underline
                             transition-all hover:border-emerald-300 hover:bg-emerald-50/50 active:scale-[0.98]"
                >
                  <p className="text-[0.875rem] font-bold text-gray-900">{p.province_slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.export_products.slice(0, 3).map(product => (
                      <span key={product} className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.7rem] font-medium text-amber-700">
                        {product}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[0.75rem] text-emerald-600 font-medium">
                    {p.agricultural_gdp_pct}% GDP từ nông nghiệp →
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* ── CTA ──────────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-[28px] bg-[#F5F5F7] px-8 py-12 text-center">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-green-200/50 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900">
                Tìm đất nông nghiệp phù hợp vùng của bạn?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] text-gray-500">
                Hơn 1.000 tin đăng đất nông nghiệp toàn quốc — kết nối trực tiếp chủ đất.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/dat-nong-nghiep"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full
                             bg-green-800 px-7 text-sm font-semibold text-white no-underline
                             transition-all hover:bg-green-900 active:scale-[0.98] sm:w-auto"
                >
                  Xem đất nông nghiệp →
                </Link>
                <Link
                  href="/tim-kiem"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full
                             border border-gray-300 bg-white/70 px-7 text-sm font-semibold
                             text-gray-700 no-underline transition-all hover:bg-white
                             active:scale-[0.98] sm:w-auto"
                >
                  Tìm kiếm nâng cao
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
