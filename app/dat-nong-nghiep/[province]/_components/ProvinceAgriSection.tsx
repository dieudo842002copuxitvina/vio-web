import { getProvinceAgriProfile } from '@/lib/agri/province-agri-data'
import { getRegionForProvince } from '@/lib/agri/climate-zones'
import { getCropProfile } from '@/lib/agri/crop-profiles'
import { getSoilProfile } from '@/lib/agri/soil-profiles'
import type { SoilType } from '@/entities/listing/model/normalized-types'

interface Props {
  provinceSlug: string
}

const MARKET_VALUE_BADGE: Record<string, string> = {
  premium:   'bg-amber-100 text-amber-800',
  standard:  'bg-blue-100 text-blue-800',
  commodity: 'bg-neutral-100 text-neutral-600',
}
const MARKET_VALUE_LABEL: Record<string, string> = {
  premium:   'Giá trị cao',
  standard:  'Giá trị trung bình',
  commodity: 'Hàng hóa',
}

const SOIL_COLOR: Record<SoilType, string> = {
  alluvial:   'bg-amber-500',
  basalt_red: 'bg-red-600',
  sandy:      'bg-yellow-300',
  clay:       'bg-orange-700',
  peat:       'bg-stone-700',
  laterite:   'bg-red-400',
  mixed:      'bg-lime-600',
}

export function ProvinceAgriSection({ provinceSlug }: Props) {
  const profile = getProvinceAgriProfile(provinceSlug)
  const region  = getRegionForProvince(provinceSlug)

  // Need at least a region to show something useful
  if (!profile && !region) return null

  const topCrops    = (profile?.dominant_crops ?? region?.main_crops ?? []).slice(0, 4)
  const soilData    = profile?.soil_composition ?? (region?.soil_types.map((s, i) => ({ soil: s, pct: Math.round(100 / region.soil_types.length) - (i === 0 ? 0 : 2) })) ?? [])
  const specialZones = profile?.special_zones ?? []
  const exportItems  = profile?.export_products ?? []

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-5 py-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-emerald-200" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          </svg>
          <h2 className="text-base font-semibold text-white">Hồ sơ nông nghiệp</h2>
          {region && (
            <span className="ml-auto rounded-full bg-emerald-600/60 px-2.5 py-0.5 text-xs font-medium text-emerald-100">
              {region.name_short}
            </span>
          )}
        </div>
        {profile?.summary_vi && (
          <p className="mt-2 text-sm text-emerald-100 leading-relaxed line-clamp-3">
            {profile.summary_vi}
          </p>
        )}
      </div>

      <div className="divide-y divide-neutral-100">
        {/* Top crops */}
        {topCrops.length > 0 && (
          <div className="px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Cây trồng chủ lực
            </p>
            <div className="grid grid-cols-2 gap-2">
              {topCrops.map(cropId => {
                const crop = getCropProfile(cropId)
                if (!crop) return null
                return (
                  <div key={cropId} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-sm font-medium text-neutral-800">{crop.name_vi}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${MARKET_VALUE_BADGE[crop.market_value]}`}>
                        {MARKET_VALUE_LABEL[crop.market_value]}
                      </span>
                    </div>
                    {crop.export_markets.length > 0 && (
                      <p className="mt-1 text-[11px] text-neutral-500">
                        XK: {crop.export_markets.slice(0, 2).join(', ')}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-neutral-400">{crop.growing_season_vi.split(';')[0]}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Soil composition */}
        {soilData.length > 0 && (
          <div className="px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Thành phần đất
            </p>
            <div className="space-y-2">
              {soilData.slice(0, 3).map(({ soil, pct }) => {
                const sp = getSoilProfile(soil as SoilType)
                return (
                  <div key={soil}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-neutral-700">{sp.name_vi}</span>
                      <span className="text-xs text-neutral-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100">
                      <div
                        className={`h-1.5 rounded-full ${SOIL_COLOR[soil as SoilType] ?? 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Export products */}
        {exportItems.length > 0 && (
          <div className="px-5 py-4">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Nông sản xuất khẩu
            </p>
            <div className="flex flex-wrap gap-1.5">
              {exportItems.map(item => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special zones */}
        {specialZones.length > 0 && (
          <div className="px-5 py-4">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Vùng sản xuất đặc thù
            </p>
            <ul className="space-y-1.5">
              {specialZones.map(zone => (
                <li key={zone} className="flex items-start gap-2 text-xs text-neutral-600">
                  <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  {zone}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Agricultural GDP note */}
        {profile?.agricultural_gdp_pct != null && (
          <div className="px-5 py-3 bg-neutral-50">
            <p className="text-xs text-neutral-500">
              Nông nghiệp đóng góp{' '}
              <span className="font-semibold text-neutral-700">{profile.agricultural_gdp_pct}%</span>
              {' '}GDP tỉnh
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
