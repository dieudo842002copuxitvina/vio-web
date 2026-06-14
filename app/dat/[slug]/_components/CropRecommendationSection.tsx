import { recommendCrops }  from '@/lib/ai/crop-recommendation'
import type { SoilType, WaterSource } from '@/entities/listing/model/normalized-types'

const SUITABILITY_STYLES = {
  high:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100  text-amber-700',
  low:    'bg-neutral-100 text-neutral-500',
} as const

const SUITABILITY_LABELS = {
  high:   'Rất phù hợp',
  medium: 'Phù hợp',
  low:    'Hạn chế',
} as const

interface Props {
  soilType:     SoilType
  waterSource:  WaterSource | null
  provinceName: string
}

export function CropRecommendationSection({ soilType, waterSource, provinceName }: Props) {
  const crops = recommendCrops(soilType, waterSource, provinceName)
  if (!crops.length) return null

  return (
    <section aria-labelledby="crop-rec-heading">
      <h2
        id="crop-rec-heading"
        className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
      >
        Cây trồng phù hợp
      </h2>

      <div className="space-y-2">
        {crops.map((crop) => (
          <div
            key={crop.crop_en}
            className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 22V12m0 0C12 7 7 4 2 4c0 5 3 8 10 8zm0 0c0-5 5-8 10-8 0 5-3 8-10 8z"
                  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[#1d1d1f]">{crop.crop_vi}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SUITABILITY_STYLES[crop.suitability]}`}>
                  {SUITABILITY_LABELS[crop.suitability]}
                </span>
              </div>
              <p className="m-0 mt-0.5 text-[12px] leading-relaxed text-neutral-500">{crop.notes_vi}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-neutral-400">
        Gợi ý dựa trên loại đất, nguồn nước và vùng khí hậu. Tham khảo thêm với chuyên gia nông nghiệp.
      </p>
    </section>
  )
}
