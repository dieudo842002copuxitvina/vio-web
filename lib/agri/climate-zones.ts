import type { SoilType } from '@/entities/listing/model/normalized-types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClimateType = 'tropical_wet' | 'tropical_dry' | 'subtropical' | 'highland' | 'monsoon'

export interface AgriRegion {
  id:             string
  name_vi:        string
  name_short:     string
  provinces:      string[]   // province slugs
  climate:        ClimateType
  soil_types:     SoilType[]
  main_crops:     string[]   // crop IDs
  description_vi: string
  rainfall_mm:    string
  temperature:    string
}

// ── 7 agricultural regions ────────────────────────────────────────────────────

export const AGRI_REGIONS: AgriRegion[] = [
  {
    id: 'dbsh', name_vi: 'Đồng bằng sông Hồng', name_short: 'ĐBSH',
    provinces: ['ha-noi', 'hai-phong', 'nam-dinh', 'ha-nam', 'ninh-binh', 'thai-binh', 'hung-yen', 'hai-duong', 'bac-ninh', 'vinh-phuc'],
    climate: 'subtropical',
    soil_types: ['alluvial', 'clay', 'mixed'],
    main_crops: ['lua_nuoc', 'rau_mau', 'ngo', 'dau_tuong', 'khoai_lang', 'che'],
    description_vi: 'Vùng đồng bằng phù sa màu mỡ nhất miền Bắc, hệ thống thủy lợi hoàn chỉnh. Thâm canh lúa 2–3 vụ/năm kết hợp rau màu vụ đông. Khí hậu 4 mùa rõ rệt, vụ đông lạnh là lợi thế trồng rau cao cấp xuất khẩu.',
    rainfall_mm: '1.400–1.800 mm/năm', temperature: '15–35°C (dao động lớn theo mùa)',
  },
  {
    id: 'dbscl', name_vi: 'Đồng bằng sông Cửu Long', name_short: 'ĐBSCL',
    provinces: ['long-an', 'tien-giang', 'ben-tre', 'tra-vinh', 'vinh-long', 'dong-thap', 'an-giang', 'kien-giang', 'can-tho', 'hau-giang', 'soc-trang', 'bac-lieu', 'ca-mau'],
    climate: 'tropical_wet',
    soil_types: ['alluvial', 'peat', 'clay'],
    main_crops: ['lua_nuoc', 'ca_tra', 'tom', 'sau_rieng', 'buoi', 'xoai', 'dua_khom', 'chuoi', 'dua'],
    description_vi: 'Vựa lúa và trái cây lớn nhất Việt Nam, đóng góp 50% sản lượng gạo và 70% sản lượng trái cây cả nước. Hệ thống sông ngòi dày đặc tạo điều kiện thủy sản nước ngọt và mặn. Đất phèn vùng Đồng Tháp Mười đang được cải tạo mạnh.',
    rainfall_mm: '1.400–2.400 mm/năm', temperature: '26–34°C (ít dao động)',
  },
  {
    id: 'tay_nguyen', name_vi: 'Tây Nguyên', name_short: 'Tây Nguyên',
    provinces: ['kon-tum', 'gia-lai', 'dak-lak', 'dak-nong', 'lam-dong'],
    climate: 'highland',
    soil_types: ['basalt_red', 'laterite', 'mixed'],
    main_crops: ['ca_phe_robusta', 'ca_phe_arabica', 'ho_tieu', 'cao_su', 'dieu', 'sau_rieng', 'san', 'lua_can'],
    description_vi: 'Thủ phủ cà phê và hồ tiêu Việt Nam. Đất đỏ bazan độc đáo kết hợp khí hậu cao nguyên tạo ra chất lượng cà phê hàng đầu thế giới. Lâm Đồng nổi bật với nông nghiệp công nghệ cao, rau hoa xuất khẩu.',
    rainfall_mm: '1.400–2.200 mm/năm', temperature: '18–28°C (đêm mát)',
  },
  {
    id: 'dong_nam_bo', name_vi: 'Đông Nam Bộ', name_short: 'ĐNB',
    provinces: ['binh-phuoc', 'tay-ninh', 'binh-duong', 'dong-nai', 'ba-ria-vung-tau', 'ho-chi-minh'],
    climate: 'tropical_dry',
    soil_types: ['basalt_red', 'laterite', 'sandy', 'alluvial'],
    main_crops: ['cao_su', 'dieu', 'ho_tieu', 'ca_phe_robusta', 'san', 'ngo', 'mia'],
    description_vi: 'Vùng kinh tế công nghiệp hóa mạnh nhất, cây công nghiệp dài ngày chiếm ưu thế. Cao su tập trung tại Bình Phước, Bình Dương. Điều tại Bình Phước đứng đầu cả nước. Áp lực chuyển đổi đất nông nghiệp sang khu công nghiệp cao.',
    rainfall_mm: '1.000–2.000 mm/năm', temperature: '25–35°C',
  },
  {
    id: 'bac_trung_bo', name_vi: 'Bắc Trung Bộ', name_short: 'BTB',
    provinces: ['thanh-hoa', 'nghe-an', 'ha-tinh', 'quang-binh', 'quang-tri', 'thua-thien-hue'],
    climate: 'monsoon',
    soil_types: ['laterite', 'alluvial', 'mixed'],
    main_crops: ['lua_nuoc', 'mia', 'che', 'cao_su', 'keo_tram', 'cam_chanh', 'buoi'],
    description_vi: 'Vùng chịu nhiều thiên tai bão lũ, tuy nhiên đất phù sa ven sông màu mỡ. Nghệ An dẫn đầu mía đường, chè, cam. Hà Tĩnh nổi tiếng bưởi Phúc Trạch. Rừng tự nhiên và rừng trồng phủ lớn.',
    rainfall_mm: '1.500–2.500 mm/năm (phân hóa theo địa hình)', temperature: '18–38°C',
  },
  {
    id: 'duyen_hai_mien_trung', name_vi: 'Duyên hải miền Trung', name_short: 'DHMT',
    provinces: ['quang-nam', 'quang-ngai', 'binh-dinh', 'phu-yen', 'khanh-hoa', 'ninh-thuan', 'binh-thuan'],
    climate: 'tropical_dry',
    soil_types: ['sandy', 'mixed', 'laterite'],
    main_crops: ['thanh_long', 'dieu', 'lua_nuoc', 'mia', 'xoai', 'khoai_lang', 'bach_dan'],
    description_vi: 'Đồng bằng hẹp, ít mưa, đất cát phổ biến. Bình Thuận là vùng thanh long lớn nhất thế giới. Ninh Thuận, Bình Thuận phát triển nho, táo nhờ khí hậu khô nắng. Nuôi tôm, tôm hùm ven biển có giá trị cao.',
    rainfall_mm: '700–2.000 mm/năm (phân hóa rõ)', temperature: '24–34°C',
  },
  {
    id: 'trung_du_mien_nui_phia_bac', name_vi: 'Trung du và miền núi phía Bắc', name_short: 'TDMNPB',
    provinces: ['lao-cai', 'yen-bai', 'son-la', 'dien-bien', 'lai-chau', 'hoa-binh', 'ha-giang', 'tuyen-quang', 'cao-bang', 'lang-son', 'bac-giang', 'thai-nguyen', 'bac-kan', 'phu-tho'],
    climate: 'subtropical',
    soil_types: ['laterite', 'mixed', 'alluvial'],
    main_crops: ['lua_can', 'che', 'ca_phe_arabica', 'san', 'ngo', 'keo_tram', 'bach_dan', 'moc_nhi'],
    description_vi: 'Địa hình đồi núi dốc, canh tác thang bậc. Thái Nguyên nổi tiếng chè xanh. Sơn La phát triển cà phê Arabica, xoài, nhãn chất lượng cao. Hệ thống ruộng bậc thang Lào Cai, Hà Giang vừa sản xuất vừa là di sản du lịch.',
    rainfall_mm: '1.400–2.800 mm/năm', temperature: '10–35°C (biên độ lớn)',
  },
]

// ── Province → Region lookup ──────────────────────────────────────────────────

const PROVINCE_TO_REGION: Map<string, AgriRegion> = new Map()
for (const region of AGRI_REGIONS) {
  for (const slug of region.provinces) {
    PROVINCE_TO_REGION.set(slug, region)
  }
}

export function getRegionForProvince(slug: string): AgriRegion | null {
  return PROVINCE_TO_REGION.get(slug) ?? null
}

export function getRegionById(id: string): AgriRegion | null {
  return AGRI_REGIONS.find(r => r.id === id) ?? null
}
