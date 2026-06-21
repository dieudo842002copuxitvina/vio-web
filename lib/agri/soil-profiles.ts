import type { SoilType } from '@/entities/listing/model/normalized-types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SoilProfile {
  type:               SoilType
  name_vi:            string
  name_en:            string
  characteristics_vi: string
  ph_range:           string
  fertility:          'high' | 'medium' | 'low'
  drainage:           'good' | 'moderate' | 'poor'
  typical_regions_vi: string
  best_crops_vi:      string
}

// ── 7 soil type profiles ──────────────────────────────────────────────────────

export const SOIL_PROFILES: Record<SoilType, SoilProfile> = {
  alluvial: {
    type: 'alluvial', name_vi: 'Đất phù sa', name_en: 'Alluvial soil',
    characteristics_vi: 'Đất được bồi đắp bởi phù sa sông, giàu hữu cơ và khoáng chất. Tầng đất dày, kết cấu thịt nhẹ đến thịt trung bình, thoáng khí và giữ ẩm tốt. Màu nâu đến nâu đậm, độ phì cao nhất trong các loại đất Việt Nam.',
    ph_range: '5.5–7.0', fertility: 'high', drainage: 'moderate',
    typical_regions_vi: 'ĐBSCL, ĐBSH, dọc các sông lớn (sông Hồng, Cửu Long, Đồng Nai)',
    best_crops_vi: 'Lúa nước, rau màu, ngô, đậu tương, cây ăn trái (bưởi, xoài, sầu riêng)',
  },
  basalt_red: {
    type: 'basalt_red', name_vi: 'Đất đỏ bazan', name_en: 'Red basalt soil',
    characteristics_vi: 'Hình thành trên đá bazan núi lửa, màu đỏ đặc trưng do oxit sắt. Tầng đất sâu 1–3m, cấu trúc viên hạt tốt, thoáng khí và thoát nước tốt. Giàu khoáng chất vi lượng nhưng thiếu lân dễ tiêu.',
    ph_range: '4.5–6.0', fertility: 'high', drainage: 'good',
    typical_regions_vi: 'Tây Nguyên (Đắk Lắk, Lâm Đồng, Đắk Nông, Gia Lai), Đông Nam Bộ (Bình Phước, Đồng Nai)',
    best_crops_vi: 'Cà phê Robusta/Arabica, hồ tiêu, cao su, điều, sầu riêng, cacao',
  },
  sandy: {
    type: 'sandy', name_vi: 'Đất cát / Đất xám bạc màu', name_en: 'Sandy / Grey soil',
    characteristics_vi: 'Thành phần cát chiếm ưu thế, thoát nước nhanh, giữ ẩm kém. Nghèo dinh dưỡng, cần bón phân thường xuyên. Tuy nhiên tơi xốp, dễ làm đất và thích hợp cây chịu hạn hoặc cần thoát nước tốt.',
    ph_range: '5.0–6.5', fertility: 'low', drainage: 'good',
    typical_regions_vi: 'Ven biển duyên hải miền Trung (Bình Thuận, Ninh Thuận), vùng cao nguyên cát',
    best_crops_vi: 'Thanh long, điều, khoai lang, sắn, thanh long, dưa hấu, dưa lưới',
  },
  clay: {
    type: 'clay', name_vi: 'Đất sét / Đất thịt nặng', name_en: 'Clay soil',
    characteristics_vi: 'Hàm lượng sét cao > 40%, giữ nước và dinh dưỡng tốt. Khi khô dễ nứt, khi ướt dẻo quánh, khó làm đất. Cần cải tạo để tăng độ tơi xốp. Phù hợp cây cần độ ẩm cao và các vùng ngập nước.',
    ph_range: '5.0–7.0', fertility: 'medium', drainage: 'poor',
    typical_regions_vi: 'Đồng bằng sông Hồng (Thái Bình, Nam Định), ven biển ĐBSCL',
    best_crops_vi: 'Lúa nước, mía, tôm (ao nuôi), cá tra, sen',
  },
  peat: {
    type: 'peat', name_vi: 'Đất phèn / Đất than bùn', name_en: 'Peat / Acid sulfate soil',
    characteristics_vi: 'Đất phèn chứa pyrite (FeS₂) gây pH cực thấp khi bị oxy hóa. Đất than bùn giàu hữu cơ chưa phân hủy. Cần cải tạo, rửa phèn bằng hệ thống thủy lợi. Sau khi cải tạo tốt phù hợp lúa và cây ăn trái.',
    ph_range: '3.5–5.0', fertility: 'medium', drainage: 'poor',
    typical_regions_vi: 'Đồng Tháp Mười, Tứ giác Long Xuyên, U Minh (Cà Mau, Kiên Giang)',
    best_crops_vi: 'Lúa nước (sau cải tạo), dứa/khóm, tràm, sen, tôm quảng canh',
  },
  laterite: {
    type: 'laterite', name_vi: 'Đất feralit / Đất đỏ vàng', name_en: 'Laterite / Ferralitic soil',
    characteristics_vi: 'Phong hóa mạnh ở vùng nhiệt đới ẩm, màu vàng đỏ do tích tụ Fe và Al. Cứng khi khô, nghèo chất kiềm và Ca. Đất đồi núi dốc, nguy cơ xói mòn cao. Cần bón vôi, hữu cơ để cải thiện.',
    ph_range: '4.0–5.5', fertility: 'low', drainage: 'good',
    typical_regions_vi: 'Trung du miền núi phía Bắc, Bắc Trung Bộ, đồi thấp Tây Nguyên',
    best_crops_vi: 'Sắn, keo tràm, bạch đàn, chè, điều, cao su, cây lâm nghiệp',
  },
  mixed: {
    type: 'mixed', name_vi: 'Đất hỗn hợp / Đất nâu đỏ', name_en: 'Mixed / Loamy soil',
    characteristics_vi: 'Thành phần cân đối giữa sét, thịt và cát. Lý tưởng về cơ lý hóa học — giữ nước và dinh dưỡng vừa đủ, thoát nước tốt. Đây là loại đất sản xuất nông nghiệp đa dụng nhất, phù hợp hầu hết cây trồng.',
    ph_range: '5.5–7.0', fertility: 'medium', drainage: 'moderate',
    typical_regions_vi: 'Phổ biến tại vùng chuyển tiếp giữa đồng bằng và đồi núi trên cả 3 miền',
    best_crops_vi: 'Lúa, ngô, đậu, cây ăn trái, rau màu, cà phê, mía',
  },
}

export function getSoilProfile(type: SoilType): SoilProfile {
  return SOIL_PROFILES[type]
}

export const SOIL_FERTILITY_ORDER: SoilType[] = ['alluvial', 'basalt_red', 'mixed', 'clay', 'peat', 'laterite', 'sandy']
