import type { SoilType } from '@/entities/listing/model/normalized-types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CropCategory = 'cereals' | 'vegetables' | 'fruits' | 'industrial' | 'forestry' | 'aquaculture'

export interface CropProfile {
  id:                string
  name_vi:           string
  name_en:           string
  category:          CropCategory
  soil_affinity:     SoilType[]
  climate_zones:     ('north' | 'central' | 'south')[]
  water_need:        'high' | 'medium' | 'low'
  market_value:      'premium' | 'standard' | 'commodity'
  export_markets:    string[]
  growing_season_vi: string
  vietgap_common:    boolean
  notes_vi:          string
}

// ── 25 Vietnamese crop profiles ───────────────────────────────────────────────

export const CROP_PROFILES: Record<string, CropProfile> = {
  lua_nuoc: {
    id: 'lua_nuoc', name_vi: 'Lúa nước', name_en: 'Paddy rice',
    category: 'cereals', soil_affinity: ['alluvial', 'clay', 'peat'],
    climate_zones: ['north', 'central', 'south'], water_need: 'high',
    market_value: 'commodity', export_markets: ['Philippines', 'China', 'Africa'],
    growing_season_vi: 'Vụ đông xuân: T12–T3; vụ hè thu: T4–T8; vụ thu đông (Nam): T8–T11',
    vietgap_common: true,
    notes_vi: 'Cây lương thực chủ lực của Việt Nam. ĐBSCL sản xuất hơn 50% sản lượng gạo cả nước. Giống IR50404, OM5451 phổ biến nhất.',
  },
  lua_can: {
    id: 'lua_can', name_vi: 'Lúa cạn / Lúa rẫy', name_en: 'Upland rice',
    category: 'cereals', soil_affinity: ['laterite', 'mixed', 'basalt_red'],
    climate_zones: ['north', 'central'], water_need: 'low',
    market_value: 'standard', export_markets: [],
    growing_season_vi: 'Vụ mùa: T5–T11 (miền núi phía Bắc và Tây Nguyên)',
    vietgap_common: false,
    notes_vi: 'Canh tác trên đất dốc không cần tưới. Năng suất thấp nhưng không cần hệ thống thủy lợi phức tạp.',
  },
  ngo: {
    id: 'ngo', name_vi: 'Ngô (Bắp)', name_en: 'Corn / Maize',
    category: 'cereals', soil_affinity: ['alluvial', 'basalt_red', 'mixed'],
    climate_zones: ['north', 'central', 'south'], water_need: 'medium',
    market_value: 'commodity', export_markets: ['China'],
    growing_season_vi: 'Vụ xuân: T2–T5; vụ hè: T5–T8; vụ đông (phía Bắc): T9–T11',
    vietgap_common: false,
    notes_vi: 'Ngô lai cao sản phổ biến làm thức ăn chăn nuôi. Đất phù sa và đất đỏ bazan cho năng suất 6–8 tấn/ha.',
  },
  rau_mau: {
    id: 'rau_mau', name_vi: 'Rau màu các loại', name_en: 'Mixed vegetables',
    category: 'vegetables', soil_affinity: ['alluvial', 'mixed', 'sandy'],
    climate_zones: ['north', 'central', 'south'], water_need: 'high',
    market_value: 'standard', export_markets: ['Japan', 'Singapore', 'EU'],
    growing_season_vi: 'Quanh năm; vụ đông (T9–T3) cho năng suất cao nhất ở miền Bắc',
    vietgap_common: true,
    notes_vi: 'Rau ăn lá, cà chua, ớt, dưa leo, đậu cô ve. Vòng quay nhanh 30–60 ngày. VietGAP và GlobalGAP ngày càng phổ biến.',
  },
  khoai_lang: {
    id: 'khoai_lang', name_vi: 'Khoai lang', name_en: 'Sweet potato',
    category: 'vegetables', soil_affinity: ['sandy', 'alluvial', 'mixed'],
    climate_zones: ['north', 'central', 'south'], water_need: 'medium',
    market_value: 'standard', export_markets: ['Japan', 'China'],
    growing_season_vi: 'Vụ đông (T9–T12) và vụ xuân hè (T2–T6)',
    vietgap_common: false,
    notes_vi: 'Khoai lang Nhật (khoai tím) xuất khẩu giá cao. Đất cát thoát nước tốt, thích hợp Bình Tân (Vĩnh Long), Đức Linh.',
  },
  san: {
    id: 'san', name_vi: 'Sắn (Khoai mì)', name_en: 'Cassava',
    category: 'cereals', soil_affinity: ['sandy', 'laterite', 'mixed'],
    climate_zones: ['north', 'central', 'south'], water_need: 'low',
    market_value: 'commodity', export_markets: ['China', 'EU'],
    growing_season_vi: 'Trồng T2–T4, thu hoạch sau 8–12 tháng',
    vietgap_common: false,
    notes_vi: 'Chịu hạn, đất nghèo vẫn trồng được. Tinh bột sắn xuất khẩu sang Trung Quốc. Phổ biến tại Tây Ninh, Gia Lai, Kon Tum.',
  },
  dau_tuong: {
    id: 'dau_tuong', name_vi: 'Đậu tương (Đậu nành)', name_en: 'Soybean',
    category: 'cereals', soil_affinity: ['alluvial', 'mixed', 'basalt_red'],
    climate_zones: ['north', 'south'], water_need: 'medium',
    market_value: 'standard', export_markets: [],
    growing_season_vi: 'Vụ xuân: T2–T5; vụ đông: T9–T12 (miền Bắc)',
    vietgap_common: false,
    notes_vi: 'Cải tạo đất, cố định đạm. Luân canh tốt sau lúa. Năng suất thấp hơn nhập khẩu nhưng có thị trường thực phẩm nội địa.',
  },
  ca_phe_robusta: {
    id: 'ca_phe_robusta', name_vi: 'Cà phê Robusta', name_en: 'Robusta coffee',
    category: 'industrial', soil_affinity: ['basalt_red'],
    climate_zones: ['central', 'south'], water_need: 'medium',
    market_value: 'premium', export_markets: ['EU', 'USA', 'Japan', 'South Korea'],
    growing_season_vi: 'Thu hoạch T10–T1; cần tưới bổ sung mùa khô T11–T4',
    vietgap_common: true,
    notes_vi: 'Việt Nam là nước xuất khẩu Robusta lớn nhất thế giới. Đắk Lắk, Lâm Đồng, Đắk Nông là trung tâm. Giá 45.000–70.000 ₫/kg.',
  },
  ca_phe_arabica: {
    id: 'ca_phe_arabica', name_vi: 'Cà phê Arabica', name_en: 'Arabica coffee',
    category: 'industrial', soil_affinity: ['basalt_red', 'mixed'],
    climate_zones: ['central', 'north'], water_need: 'medium',
    market_value: 'premium', export_markets: ['EU', 'USA', 'Japan'],
    growing_season_vi: 'Thu hoạch T11–T2; độ cao 800–1500m tốt nhất',
    vietgap_common: true,
    notes_vi: 'Cà phê Arabica Sơn La, Cầu Đất (Lâm Đồng) được định giá cao. Cần độ cao, nhiệt độ 15–24°C, ít mưa hơn Robusta.',
  },
  ho_tieu: {
    id: 'ho_tieu', name_vi: 'Hồ tiêu (Tiêu đen)', name_en: 'Black pepper',
    category: 'industrial', soil_affinity: ['basalt_red', 'alluvial'],
    climate_zones: ['central', 'south'], water_need: 'medium',
    market_value: 'premium', export_markets: ['EU', 'USA', 'India', 'China'],
    growing_season_vi: 'Thu hoạch T3–T5; trồng T5–T7 sau mưa đầu mùa',
    vietgap_common: true,
    notes_vi: 'Việt Nam xuất khẩu hồ tiêu lớn nhất thế giới. Chư Sê (Gia Lai), Bình Phước, Đắk Nông. Bệnh chết nhanh là rủi ro chính.',
  },
  cao_su: {
    id: 'cao_su', name_vi: 'Cao su', name_en: 'Rubber tree',
    category: 'industrial', soil_affinity: ['basalt_red', 'laterite', 'alluvial'],
    climate_zones: ['central', 'south'], water_need: 'medium',
    market_value: 'standard', export_markets: ['China', 'India', 'EU'],
    growing_season_vi: 'Cạo mủ T11–T6; nghỉ rụng lá T7–T10. Thu hoạch sau 7–8 năm',
    vietgap_common: false,
    notes_vi: 'Tây Nguyên, Đông Nam Bộ, duyên hải miền Trung. Vòng đời 25–30 năm. Gỗ cao su thanh lý có thêm giá trị.',
  },
  dieu: {
    id: 'dieu', name_vi: 'Điều (Đào lộn hột)', name_en: 'Cashew',
    category: 'industrial', soil_affinity: ['laterite', 'sandy', 'mixed'],
    climate_zones: ['central', 'south'], water_need: 'low',
    market_value: 'premium', export_markets: ['EU', 'USA', 'China'],
    growing_season_vi: 'Thu hoạch T2–T5; chịu hạn tốt mùa khô',
    vietgap_common: false,
    notes_vi: 'Bình Phước là thủ phủ điều Việt Nam. Chịu đất xấu, ít đầu tư. Xuất khẩu nhân điều đứng đầu thế giới.',
  },
  che: {
    id: 'che', name_vi: 'Chè (Trà)', name_en: 'Tea',
    category: 'industrial', soil_affinity: ['alluvial', 'basalt_red', 'mixed'],
    climate_zones: ['north', 'central'], water_need: 'medium',
    market_value: 'standard', export_markets: ['Pakistan', 'Taiwan', 'China', 'Russia'],
    growing_season_vi: 'Hái búp quanh năm; cao điểm T4–T10 (vụ xuân hè)',
    vietgap_common: true,
    notes_vi: 'Thái Nguyên (chè xanh), Sơn La, Lâm Đồng (chè OLong, chè sữa). Độ cao 500–1500m cho chất lượng tốt nhất.',
  },
  sau_rieng: {
    id: 'sau_rieng', name_vi: 'Sầu riêng', name_en: 'Durian',
    category: 'fruits', soil_affinity: ['basalt_red', 'alluvial', 'mixed'],
    climate_zones: ['south', 'central'], water_need: 'high',
    market_value: 'premium', export_markets: ['China', 'Thailand', 'Singapore'],
    growing_season_vi: 'Thu hoạch T4–T8 (vụ chính), T10–T12 (vụ nghịch)',
    vietgap_common: true,
    notes_vi: 'Kim ngạch xuất khẩu tỷ USD, dẫn đầu là Ri 6, Musang King. Tiền Giang, Bến Tre, Đắk Lắk. Cần tưới xử lý ra hoa.',
  },
  buoi: {
    id: 'buoi', name_vi: 'Bưởi', name_en: 'Pomelo',
    category: 'fruits', soil_affinity: ['alluvial', 'mixed'],
    climate_zones: ['north', 'south'], water_need: 'medium',
    market_value: 'premium', export_markets: ['EU', 'USA', 'Japan'],
    growing_season_vi: 'Thu hoạch T8–T12 (vụ chính)',
    vietgap_common: true,
    notes_vi: 'Bưởi da xanh (Bến Tre), bưởi Năm Roi (Vĩnh Long), bưởi Phúc Trạch (Hà Tĩnh). Xuất khẩu tốt sang EU.',
  },
  xoai: {
    id: 'xoai', name_vi: 'Xoài', name_en: 'Mango',
    category: 'fruits', soil_affinity: ['alluvial', 'sandy', 'mixed'],
    climate_zones: ['south', 'central'], water_need: 'medium',
    market_value: 'standard', export_markets: ['China', 'Japan', 'Australia'],
    growing_season_vi: 'Thu hoạch T2–T6 (vụ chính); xử lý trái vụ T8–T11',
    vietgap_common: true,
    notes_vi: 'Xoài cát Hòa Lộc, xoài Đài Loan, xoài GL6 xuất khẩu. Đồng Tháp, Tiền Giang, Khánh Hòa. Dễ xử lý ra hoa.',
  },
  thanh_long: {
    id: 'thanh_long', name_vi: 'Thanh long', name_en: 'Dragon fruit',
    category: 'fruits', soil_affinity: ['sandy', 'alluvial'],
    climate_zones: ['south', 'central'], water_need: 'low',
    market_value: 'standard', export_markets: ['China', 'EU', 'USA'],
    growing_season_vi: 'Thu hoạch quanh năm với đèn chiếu (vụ nghịch T10–T3)',
    vietgap_common: true,
    notes_vi: 'Bình Thuận là vùng trồng lớn nhất. Thanh long ruột đỏ được giá hơn ruột trắng. Cần đèn chiếu để có vụ nghịch.',
  },
  dua_khom: {
    id: 'dua_khom', name_vi: 'Dứa / Khóm', name_en: 'Pineapple',
    category: 'fruits', soil_affinity: ['peat', 'sandy', 'mixed'],
    climate_zones: ['south'], water_need: 'medium',
    market_value: 'standard', export_markets: ['EU', 'USA', 'Japan'],
    growing_season_vi: 'Thu hoạch T5–T8 (vụ chính), xử lý ra hoa quanh năm',
    vietgap_common: false,
    notes_vi: 'Khóm Tắc Cậu (Kiên Giang), Cầu Đúc, Long An. Thích nghi đất phèn. Dứa đóng hộp xuất khẩu mạnh.',
  },
  chuoi: {
    id: 'chuoi', name_vi: 'Chuối', name_en: 'Banana',
    category: 'fruits', soil_affinity: ['alluvial', 'basalt_red', 'mixed'],
    climate_zones: ['south', 'central', 'north'], water_need: 'high',
    market_value: 'standard', export_markets: ['China', 'Japan', 'South Korea'],
    growing_season_vi: 'Thu hoạch quanh năm, vòng đời 12–16 tháng/buồng',
    vietgap_common: false,
    notes_vi: 'Chuối già Nam Mỹ (Cavendish) xuất khẩu. Long An, Đồng Nai, Đắk Lắk. Cần nguồn nước ổn định.',
  },
  dua: {
    id: 'dua', name_vi: 'Dừa', name_en: 'Coconut',
    category: 'industrial', soil_affinity: ['sandy', 'alluvial'],
    climate_zones: ['south'], water_need: 'high',
    market_value: 'standard', export_markets: ['China', 'EU', 'USA'],
    growing_season_vi: 'Thu hoạch quanh năm, 12–13 trái/tháng/cây',
    vietgap_common: false,
    notes_vi: 'Bến Tre "xứ dừa" cung ứng 40% sản lượng cả nước. Dừa uống nước, dừa khô, dừa hữu cơ. Toàn cây đều có giá trị.',
  },
  mia: {
    id: 'mia', name_vi: 'Mía đường', name_en: 'Sugarcane',
    category: 'industrial', soil_affinity: ['clay', 'alluvial', 'mixed'],
    climate_zones: ['central', 'south'], water_need: 'high',
    market_value: 'commodity', export_markets: [],
    growing_season_vi: 'Trồng T4–T6, thu hoạch sau 10–14 tháng (T2–T5)',
    vietgap_common: false,
    notes_vi: 'Khánh Hòa, Gia Lai, Long An có nhà máy đường lớn. Áp lực từ đường nhập khẩu. Mía sạch năng lượng tái tạo đang tăng trưởng.',
  },
  bach_dan: {
    id: 'bach_dan', name_vi: 'Bạch đàn (Keo lai)', name_en: 'Eucalyptus / Acacia',
    category: 'forestry', soil_affinity: ['laterite', 'sandy', 'mixed'],
    climate_zones: ['north', 'central', 'south'], water_need: 'low',
    market_value: 'commodity', export_markets: ['China', 'Japan'],
    growing_season_vi: 'Trồng T3–T5, thu hoạch sau 5–7 năm',
    vietgap_common: false,
    notes_vi: 'Rừng sản xuất kinh tế, dăm gỗ xuất khẩu. Đất dốc, xấu vẫn trồng được. Phổ biến tại Quảng Trị, Bình Định, Yên Bái.',
  },
  keo_tram: {
    id: 'keo_tram', name_vi: 'Keo / Tràm', name_en: 'Acacia / Melaleuca',
    category: 'forestry', soil_affinity: ['peat', 'sandy', 'laterite'],
    climate_zones: ['south', 'central'], water_need: 'medium',
    market_value: 'commodity', export_markets: [],
    growing_season_vi: 'Trồng T3–T5; tràm thu hoạch sau 4–5 năm',
    vietgap_common: false,
    notes_vi: 'Tràm chịu ngập úng, cải tạo đất phèn ĐBSCL. Keo lai lấy gỗ dăm. Dầu tràm có giá trị dược phẩm.',
  },
  tom: {
    id: 'tom', name_vi: 'Tôm (nuôi trồng)', name_en: 'Shrimp aquaculture',
    category: 'aquaculture', soil_affinity: ['clay', 'peat', 'alluvial'],
    climate_zones: ['south', 'central'], water_need: 'high',
    market_value: 'premium', export_markets: ['USA', 'EU', 'Japan', 'South Korea'],
    growing_season_vi: 'Vụ chính T2–T7; vụ 2 T8–T12. Tôm thẻ 70–100 ngày, tôm sú 120–180 ngày',
    vietgap_common: true,
    notes_vi: 'Cà Mau, Bạc Liêu, Sóc Trăng là trung tâm tôm. Tôm thẻ chân trắng SuperIntensive cho năng suất 30–50 tấn/ha/năm.',
  },
  ca_tra: {
    id: 'ca_tra', name_vi: 'Cá tra', name_en: 'Pangasius / Basa fish',
    category: 'aquaculture', soil_affinity: ['alluvial', 'clay'],
    climate_zones: ['south'], water_need: 'high',
    market_value: 'standard', export_markets: ['EU', 'USA', 'China', 'Brazil'],
    growing_season_vi: 'Nuôi quanh năm, thu hoạch sau 6–8 tháng đạt 1–1.2kg',
    vietgap_common: true,
    notes_vi: 'Đồng Tháp, An Giang, Cần Thơ sản xuất 95% cá tra cả nước. Cá tra fillet đông lạnh xuất khẩu tỷ USD/năm.',
  },
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function getCropProfile(id: string): CropProfile | undefined {
  return CROP_PROFILES[id]
}

// Crops indexed by soil affinity for fast lookup
export const CROPS_BY_SOIL: Partial<Record<SoilType, string[]>> = (() => {
  const map: Partial<Record<SoilType, string[]>> = {}
  for (const [id, profile] of Object.entries(CROP_PROFILES)) {
    for (const soil of profile.soil_affinity) {
      if (!map[soil]) map[soil] = []
      map[soil]!.push(id)
    }
  }
  return map
})()

export function getCropsBySoil(soil: SoilType): CropProfile[] {
  return (CROPS_BY_SOIL[soil] ?? []).map(id => CROP_PROFILES[id]).filter(Boolean) as CropProfile[]
}
