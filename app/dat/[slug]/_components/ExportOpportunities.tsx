import Link                   from 'next/link'
import { getCropsBySoil }     from '@/lib/agri'
import { buildUtmUrl }        from '@/lib/utm'
import type { SoilType }      from '@/entities/listing/model/normalized-types'

// VIO EXPORT brand color: #FF9500
const EXPORT_BASE = 'https://vio.vn/export'

const MARKET_VALUE_BADGE: Record<string, string> = {
  premium:   'bg-amber-100 text-amber-700',
  standard:  'bg-blue-100 text-blue-700',
  commodity: 'bg-neutral-100 text-neutral-600',
}

const MARKET_VALUE_LABEL: Record<string, string> = {
  premium:   'Xuất khẩu cao cấp',
  standard:  'Xuất khẩu tiêu chuẩn',
  commodity: 'Hàng thông thường',
}

interface Props {
  soilType:     SoilType
  provinceSlug: string
}

export function ExportOpportunities({ soilType }: Props) {
  const crops = getCropsBySoil(soilType)
    .filter(c => c.export_markets.length > 0 && c.market_value === 'premium')
    .slice(0, 2)

  if (crops.length === 0) return null

  const ctaUrl = buildUtmUrl(EXPORT_BASE, 'direct', 'listing_share', 'export_cta')

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
      style={{ borderColor: '#FF950030' }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="rounded-lg px-2 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: '#FF9500' }}
        >
          VIO EXPORT
        </span>
        <h3 className="text-sm font-semibold text-neutral-800">
          Cơ hội xuất khẩu nông sản trên mảnh đất này
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {crops.map(crop => (
          <div key={crop.id} className="rounded-xl border border-amber-100 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-neutral-900">{crop.name_vi}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${MARKET_VALUE_BADGE[crop.market_value]}`}>
                {MARKET_VALUE_LABEL[crop.market_value]}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{crop.notes_vi}</p>
            {crop.export_markets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {crop.export_markets.slice(0, 4).map(m => (
                  <span key={m} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Link
          href={ctaUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#FF9500' }}
        >
          Xem cơ hội xuất khẩu trên VIO EXPORT →
        </Link>
      </div>
    </section>
  )
}
