// Pure deterministic crop recommendation.
// Maps soil × water × climate_zone → top 5 suitable crops.
// No external API calls — pure lookup table. AI can replace later.

import type { SoilType, WaterSource } from '@/entities/listing/model/normalized-types'

export interface CropRecommendation {
  crop_vi:      string
  crop_en:      string
  suitability:  'high' | 'medium' | 'low'
  notes_vi:     string
}

// Vietnam climate zones by province prefix
function getClimateZone(province: string): 'north' | 'central' | 'south' {
  const northPrefixes = [
    'hà nội', 'hải phòng', 'quảng ninh', 'hải dương', 'hưng yên', 'thái bình',
    'nam định', 'ninh bình', 'hà nam', 'bắc ninh', 'vĩnh phúc', 'bắc giang',
    'thái nguyên', 'lạng sơn', 'cao bằng', 'bắc kạn', 'tuyên quang', 'lào cai',
    'yên bái', 'hà giang', 'phú thọ', 'sơn la', 'điện biên', 'lai châu',
    'hoà bình', 'thanh hoá', 'nghệ an', 'hà tĩnh',
  ]
  const centralPrefixes = [
    'quảng bình', 'quảng trị', 'thừa thiên huế', 'đà nẵng', 'quảng nam',
    'quảng ngãi', 'bình định', 'phú yên', 'khánh hoà', 'ninh thuận',
    'bình thuận', 'kon tum', 'gia lai', 'đắk lắk', 'đắk nông', 'lâm đồng',
  ]
  const p = province.toLowerCase()
  if (northPrefixes.some(n => p.includes(n))) return 'north'
  if (centralPrefixes.some(c => p.includes(c))) return 'central'
  return 'south'
}

// Lookup table: soil_type → water_source → climate_zone → recommendations
const CROP_TABLE: Partial<Record<
  SoilType,
  Partial<Record<
    WaterSource | 'any',
    CropRecommendation[]
  >>
>> = {
  alluvial: {
    any: [
      { crop_vi: 'Lúa nước',          crop_en: 'Paddy rice',       suitability: 'high',   notes_vi: 'Đất phù sa màu mỡ, lý tưởng cho lúa nước 2–3 vụ/năm' },
      { crop_vi: 'Rau màu',            crop_en: 'Vegetables',       suitability: 'high',   notes_vi: 'Phù hợp canh tác rau màu ngắn ngày, quay vòng nhanh' },
      { crop_vi: 'Ngô',                crop_en: 'Corn/Maize',       suitability: 'high',   notes_vi: 'Đất phù sa giữ độ ẩm tốt, năng suất cao' },
      { crop_vi: 'Khoai lang',         crop_en: 'Sweet potato',     suitability: 'medium', notes_vi: 'Thích hợp vụ đông, cần thoát nước tốt' },
      { crop_vi: 'Đậu tương',          crop_en: 'Soybean',          suitability: 'medium', notes_vi: 'Luân canh cải tạo đất, phù hợp vụ hè thu' },
    ],
  },
  basalt_red: {
    any: [
      { crop_vi: 'Cà phê Robusta',     crop_en: 'Robusta coffee',   suitability: 'high',   notes_vi: 'Đất đỏ bazan là nền tảng vùng cà phê Tây Nguyên' },
      { crop_vi: 'Hồ tiêu',            crop_en: 'Black pepper',     suitability: 'high',   notes_vi: 'Đất thoát nước tốt, phù hợp trồng tiêu trụ sống' },
      { crop_vi: 'Sầu riêng',          crop_en: 'Durian',           suitability: 'high',   notes_vi: 'Cần tưới bổ sung mùa khô, năng suất rất cao' },
      { crop_vi: 'Mắc ca',             crop_en: 'Macadamia',        suitability: 'medium', notes_vi: 'Cây dài ngày, giá trị kinh tế cao' },
      { crop_vi: 'Cacao',              crop_en: 'Cocoa',            suitability: 'medium', notes_vi: 'Trồng xen cà phê, tận dụng bóng mát' },
    ],
  },
  sandy: {
    any: [
      { crop_vi: 'Lạc (đậu phộng)',    crop_en: 'Peanut/Groundnut', suitability: 'high',   notes_vi: 'Đất cát thoát nước tốt, lý tưởng cho lạc' },
      { crop_vi: 'Khoai mì (sắn)',     crop_en: 'Cassava',          suitability: 'high',   notes_vi: 'Chịu hạn, phù hợp đất nghèo dinh dưỡng' },
      { crop_vi: 'Dưa hấu',            crop_en: 'Watermelon',       suitability: 'medium', notes_vi: 'Cần bón phân, tưới tiêu đều đặn' },
      { crop_vi: 'Thanh long',         crop_en: 'Dragon fruit',     suitability: 'medium', notes_vi: 'Thích nghi đất cát ven biển miền Nam' },
      { crop_vi: 'Điều (đào lộn hột)', crop_en: 'Cashew',           suitability: 'medium', notes_vi: 'Chịu hạn, phù hợp vùng Đông Nam Bộ' },
    ],
  },
  clay: {
    any: [
      { crop_vi: 'Lúa nước',           crop_en: 'Paddy rice',       suitability: 'high',   notes_vi: 'Đất sét giữ nước tốt, trồng lúa 2–3 vụ/năm' },
      { crop_vi: 'Mía đường',          crop_en: 'Sugarcane',        suitability: 'high',   notes_vi: 'Đất sét giữ ẩm tốt, phù hợp mía vụ dài' },
      { crop_vi: 'Sen',                 crop_en: 'Lotus',            suitability: 'high',   notes_vi: 'Đất sét ngập nước, giá trị kinh tế và cảnh quan' },
      { crop_vi: 'Rau muống',          crop_en: 'Water spinach',    suitability: 'medium', notes_vi: 'Trồng ruộng nước hoặc cạn' },
    ],
  },
  peat: {
    any: [
      { crop_vi: 'Lúa nước vùng trũng', crop_en: 'Lowland rice',   suitability: 'medium', notes_vi: 'Cần cải tạo pH trước khi trồng' },
      { crop_vi: 'Khóm (dứa)',          crop_en: 'Pineapple',       suitability: 'high',   notes_vi: 'Đất phèn cải tạo, phù hợp khóm ĐBSCL' },
      { crop_vi: 'Tràm',                crop_en: 'Melaleuca',       suitability: 'high',   notes_vi: 'Cây lâm nghiệp chịu ngập, phủ xanh đất phèn' },
    ],
  },
  laterite: {
    any: [
      { crop_vi: 'Điều',               crop_en: 'Cashew',           suitability: 'high',   notes_vi: 'Chịu đất xấu tốt, phù hợp vùng Đông Nam Bộ' },
      { crop_vi: 'Khoai mì (sắn)',     crop_en: 'Cassava',          suitability: 'high',   notes_vi: 'Chịu đất nghèo, năng suất ổn định' },
      { crop_vi: 'Bạch đàn',           crop_en: 'Eucalyptus',       suitability: 'high',   notes_vi: 'Cây lâm nghiệp, cải tạo đất dài hạn' },
      { crop_vi: 'Cao su',             crop_en: 'Rubber tree',      suitability: 'medium', notes_vi: 'Phù hợp vùng Đông Nam Bộ, Tây Nguyên' },
    ],
  },
  mixed: {
    any: [
      { crop_vi: 'Cây ăn trái hỗn hợp', crop_en: 'Mixed orchard',  suitability: 'high',   notes_vi: 'Đa dạng cây ăn trái phù hợp điều kiện địa phương' },
      { crop_vi: 'Rau màu luân canh',   crop_en: 'Rotational crops', suitability: 'high',  notes_vi: 'Luân canh nhiều loại rau màu để cải tạo đất' },
      { crop_vi: 'Ngô',                 crop_en: 'Corn/Maize',       suitability: 'medium', notes_vi: 'Phù hợp canh tác vụ hè thu' },
    ],
  },
}

// ── recommendCrops ────────────────────────────────────────────────────────────

export function recommendCrops(
  soil:     SoilType | null | undefined,
  water:    WaterSource | null | undefined,
  province: string,
): CropRecommendation[] {
  if (!soil) return []

  const zone    = getClimateZone(province)
  const byWater = CROP_TABLE[soil]
  if (!byWater) return []

  // Try water-specific first, fall back to 'any'
  const recs = (water && byWater[water]) ? byWater[water]! : (byWater['any'] ?? [])

  // Apply climate zone modifier: lower suitability for mismatched zones
  return recs.map(r => {
    if (zone === 'north' && (r.crop_en === 'Durian' || r.crop_en === 'Robusta coffee')) {
      return { ...r, suitability: 'low' as const }
    }
    return r
  }).slice(0, 5)
}
