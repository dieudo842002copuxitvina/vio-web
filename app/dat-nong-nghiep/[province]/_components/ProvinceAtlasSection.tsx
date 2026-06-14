import Link from 'next/link'
import { getProvinceSoilCoverage, getAtlasRegionForProvince } from '@/lib/atlas/province-atlas'
import type { SoilType } from '@/entities/listing/model/normalized-types'

interface Props {
  provinceSlug: string
}

const SOIL_BAR_COLOR: Record<SoilType, string> = {
  alluvial:   '#f59e0b',
  basalt_red: '#dc2626',
  sandy:      '#fde047',
  clay:       '#c2410c',
  peat:       '#57534e',
  laterite:   '#f87171',
  mixed:      '#4ade80',
}

const CLIMATE_LABEL: Record<string, string> = {
  tropical_wet:  'Nhiệt đới ẩm',
  tropical_dry:  'Nhiệt đới khô',
  subtropical:   'Cận nhiệt đới',
  highland:      'Cao nguyên',
  monsoon:       'Gió mùa',
}

export function ProvinceAtlasSection({ provinceSlug }: Props) {
  const soilCoverage = getProvinceSoilCoverage(provinceSlug)
  const atlasRegion  = getAtlasRegionForProvince(provinceSlug)

  if (!soilCoverage && !atlasRegion) return null

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-800">Bản đồ nông nghiệp</h3>
          {atlasRegion && (
            <Link
              href="/ban-do-nong-nghiep"
              className="text-[0.75rem] font-medium text-emerald-600 no-underline hover:text-emerald-700"
            >
              Xem bản đồ đầy đủ →
            </Link>
          )}
        </div>
      </div>

      <div className="divide-y divide-neutral-100">
        {/* Region badge */}
        {atlasRegion && (
          <div className="px-5 py-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-800">{atlasRegion.name_vi}</p>
              <p className="text-[11px] text-neutral-400">
                {CLIMATE_LABEL[atlasRegion.climate] ?? atlasRegion.climate}
                {' · '}
                {atlasRegion.rainfall_mm}
              </p>
            </div>
          </div>
        )}

        {/* Soil coverage bars */}
        {soilCoverage && soilCoverage.soils.length > 0 && (
          <div className="px-5 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Cơ cấu đất
            </p>

            {/* Stacked bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
              {soilCoverage.soils.map(({ soil, pct }) => (
                <div
                  key={soil}
                  style={{ width: `${pct}%`, backgroundColor: SOIL_BAR_COLOR[soil] ?? '#6b7280' }}
                  title={`${soil}: ${pct}%`}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
              {soilCoverage.soils.map(({ soil, pct, name_vi }) => (
                <div key={soil} className="flex items-center gap-1">
                  <div
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: SOIL_BAR_COLOR[soil] ?? '#6b7280' }}
                  />
                  <span className="text-[11px] text-neutral-500">{name_vi} {pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
