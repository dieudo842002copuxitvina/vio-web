import type { SoilType } from '@/entities/listing/model/normalized-types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProvinceAgriProfile {
  province_slug:        string
  dominant_crops:       string[]   // crop IDs ordered by production area
  soil_composition:     { soil: SoilType; pct: number }[]
  agricultural_gdp_pct: number     // % of provincial GDP from agriculture
  special_zones:        string[]   // named agricultural zones or products
  export_products:      string[]   // main agricultural exports
  summary_vi:           string     // unique 2–3 sentences
}

// ── 25 key provinces — full data ──────────────────────────────────────────────

export const PROVINCE_AGRI_DATA: Partial<Record<string, ProvinceAgriProfile>> = {

  'dak-lak': {
    province_slug: 'dak-lak',
    dominant_crops: ['ca_phe_robusta', 'ho_tieu', 'sau_rieng', 'cao_su', 'san', 'lua_nuoc'],
    soil_composition: [{ soil: 'basalt_red', pct: 65 }, { soil: 'laterite', pct: 20 }, { soil: 'alluvial', pct: 15 }],
    agricultural_gdp_pct: 35,
    special_zones: ['Vùng cà phê Buôn Ma Thuột (chỉ dẫn địa lý), Hồ Lắk nước ngọt, Ea Kar trồng tiêu'],
    export_products: ['Cà phê Robusta', 'Hồ tiêu', 'Sầu riêng'],
    summary_vi: 'Đắk Lắk là thủ phủ cà phê Robusta lớn nhất Việt Nam với diện tích hơn 200.000 ha. Cà phê Buôn Ma Thuột được bảo hộ chỉ dẫn địa lý quốc tế, giá cao hơn cà phê thường 10–15%. Sầu riêng đang mở rộng nhanh nhờ xuất khẩu sang Trung Quốc tăng mạnh.',
  },

  'lam-dong': {
    province_slug: 'lam-dong',
    dominant_crops: ['ca_phe_arabica', 'ca_phe_robusta', 'rau_mau', 'sau_rieng', 'che'],
    soil_composition: [{ soil: 'basalt_red', pct: 55 }, { soil: 'mixed', pct: 30 }, { soil: 'laterite', pct: 15 }],
    agricultural_gdp_pct: 42,
    special_zones: ['Đà Lạt – nông nghiệp công nghệ cao, rau hoa xuất khẩu', 'Cầu Đất – cà phê Arabica specialty', 'Di Linh – cà phê Robusta, chè'],
    export_products: ['Rau hoa Đà Lạt', 'Cà phê Arabica', 'Sầu riêng'],
    summary_vi: 'Lâm Đồng dẫn đầu cả nước về nông nghiệp công nghệ cao với hơn 60.000 ha nhà kính, nhà lưới. Đà Lạt cung cấp 45% rau và hoa tiêu thụ TP.HCM. Cà phê Arabica Cầu Đất đạt điểm cupping 80+ được chuỗi cà phê specialty toàn cầu săn đón.',
  },

  'long-an': {
    province_slug: 'long-an',
    dominant_crops: ['lua_nuoc', 'dua_khom', 'rau_mau', 'dau_tuong', 'chuoi'],
    soil_composition: [{ soil: 'alluvial', pct: 45 }, { soil: 'peat', pct: 35 }, { soil: 'clay', pct: 20 }],
    agricultural_gdp_pct: 28,
    special_zones: ['Đồng Tháp Mười (vùng lúa chất lượng cao)', 'Vùng khóm Bến Lức', 'Cầu Đúc – dứa Cayenne'],
    export_products: ['Gạo ST25', 'Dứa/Khóm', 'Rau màu'],
    summary_vi: 'Long An là cửa ngõ ĐBSCL, có vùng lúa Đồng Tháp Mười rộng lớn sản xuất gạo chất lượng cao. Vùng dứa Bến Lức – Đức Hòa cung cấp cho các nhà máy đồ hộp xuất khẩu. Đất phèn đang được cải tạo mạnh bằng hệ thống kênh rạch.',
  },

  'tien-giang': {
    province_slug: 'tien-giang',
    dominant_crops: ['sau_rieng', 'xoai', 'buoi', 'chuoi', 'lua_nuoc'],
    soil_composition: [{ soil: 'alluvial', pct: 70 }, { soil: 'clay', pct: 20 }, { soil: 'peat', pct: 10 }],
    agricultural_gdp_pct: 40,
    special_zones: ['Cái Bè – vựa trái cây lớn nhất ĐBSCL', 'Châu Thành – sầu riêng Ri 6', 'Gò Công – hành tím, lúa nước ngặn'],
    export_products: ['Sầu riêng', 'Xoài cát Hòa Lộc', 'Bưởi da xanh'],
    summary_vi: 'Tiền Giang là thủ phủ trái cây của ĐBSCL với sầu riêng Ri 6 xuất khẩu tỷ USD. Xoài cát Hòa Lộc được đăng ký chỉ dẫn địa lý, xuất sang Nhật Bản, Hàn Quốc. Phong trào VietGAP và GlobalGAP trên cây ăn trái lan rộng toàn tỉnh.',
  },

  'dong-thap': {
    province_slug: 'dong-thap',
    dominant_crops: ['lua_nuoc', 'ca_tra', 'xoai', 'rau_mau', 'dau_tuong'],
    soil_composition: [{ soil: 'alluvial', pct: 50 }, { soil: 'peat', pct: 40 }, { soil: 'clay', pct: 10 }],
    agricultural_gdp_pct: 38,
    special_zones: ['Đồng Tháp Mười – vùng lúa nổi, sen', 'Cao Lãnh – xoài Cát Chu', 'Hồng Ngự – cá tra, tôm càng xanh'],
    export_products: ['Cá tra fillet', 'Xoài', 'Gạo'],
    summary_vi: 'Đồng Tháp là vùng trọng điểm nuôi cá tra với sản lượng 400.000 tấn/năm. Xoài Cát Chu Cao Lãnh được xuất khẩu chính ngạch sang EU. Đồng Tháp Mười vẫn giữ được hệ sinh thái lúa nổi và sen tự nhiên quý hiếm.',
  },

  'kien-giang': {
    province_slug: 'kien-giang',
    dominant_crops: ['lua_nuoc', 'tom', 'dua_khom', 'ho_tieu', 'dua'],
    soil_composition: [{ soil: 'alluvial', pct: 40 }, { soil: 'peat', pct: 35 }, { soil: 'clay', pct: 25 }],
    agricultural_gdp_pct: 45,
    special_zones: ['U Minh Thượng – tôm rừng sinh thái', 'Phú Quốc – hồ tiêu đặc sản', 'Tứ giác Long Xuyên – lúa gạo'],
    export_products: ['Tôm', 'Tiêu Phú Quốc', 'Gạo'],
    summary_vi: 'Kiên Giang là tỉnh nông nghiệp lớn nhất ĐBSCL về diện tích. Hồ tiêu Phú Quốc có chỉ dẫn địa lý EU, giá gấp 3 lần tiêu thường. Mô hình tôm–lúa và tôm–rừng sinh thái ở U Minh đang là hướng phát triển bền vững.',
  },

  'ha-nam': {
    province_slug: 'ha-nam',
    dominant_crops: ['lua_nuoc', 'rau_mau', 'ngo', 'ca', 'dau_tuong'],
    soil_composition: [{ soil: 'alluvial', pct: 60 }, { soil: 'clay', pct: 25 }, { soil: 'mixed', pct: 15 }],
    agricultural_gdp_pct: 18,
    special_zones: ['Thanh Liêm – lúa đặc sản, cá nước ngọt', 'Bình Lục – vùng lúa hai vụ chất lượng cao'],
    export_products: ['Rau màu vụ đông', 'Gạo nếp đặc sản'],
    summary_vi: 'Hà Nam là tỉnh nông nghiệp thuần túy ven sông Đáy với đất phù sa màu mỡ. Vụ rau đông (cải bắp, su hào, cà rốt) xuất khẩu sang thị trường nội địa lớn. Quá trình công nghiệp hóa đang làm giảm diện tích đất nông nghiệp.',
  },

  'nam-dinh': {
    province_slug: 'nam-dinh',
    dominant_crops: ['lua_nuoc', 'rau_mau', 'dau_tuong', 'khoai_lang', 'ngo'],
    soil_composition: [{ soil: 'alluvial', pct: 55 }, { soil: 'clay', pct: 30 }, { soil: 'sandy', pct: 15 }],
    agricultural_gdp_pct: 22,
    special_zones: ['Hải Hậu – gạo đặc sản (Bắc Hương 1)', 'Giao Thủy – nuôi trồng thủy sản, Vườn quốc gia Xuân Thủy'],
    export_products: ['Tôm cua ven biển', 'Rau màu vụ đông'],
    summary_vi: 'Nam Định có vùng đất ven biển Hải Hậu, Giao Thủy phát triển nuôi tôm, ngao nước lợ. Giống lúa Bắc Hương 1 thơm ngon đặc trưng là thế mạnh của tỉnh. Rừng ngập mặn Xuân Thủy là hệ sinh thái quan trọng bảo vệ bờ biển.',
  },

  'nghe-an': {
    province_slug: 'nghe-an',
    dominant_crops: ['lua_nuoc', 'mia', 'che', 'cao_su', 'cam_chanh', 'san'],
    soil_composition: [{ soil: 'laterite', pct: 45 }, { soil: 'alluvial', pct: 35 }, { soil: 'mixed', pct: 20 }],
    agricultural_gdp_pct: 30,
    special_zones: ['Quỳnh Lưu – vùng cam Vinh đặc sản', 'Tân Kỳ – mía đường Con Cuông', 'Anh Sơn – chè xuất khẩu'],
    export_products: ['Cam Vinh', 'Chè', 'Mía đường'],
    summary_vi: 'Nghệ An là tỉnh lớn nhất cả nước với đa dạng sinh thái từ đồng bằng đến miền núi. Cam Vinh là đặc sản nổi tiếng toàn quốc với hàm lượng vitamin C cao. Vùng mía đường Anh Sơn – Con Cuông cung cấp cho nhà máy đường lớn nhất miền Bắc.',
  },

  'binh-phuoc': {
    province_slug: 'binh-phuoc',
    dominant_crops: ['dieu', 'cao_su', 'ho_tieu', 'san', 'ngo', 'ca_phe_robusta'],
    soil_composition: [{ soil: 'basalt_red', pct: 50 }, { soil: 'laterite', pct: 35 }, { soil: 'mixed', pct: 15 }],
    agricultural_gdp_pct: 35,
    special_zones: ['Lộc Ninh – vùng điều lớn nhất VN', 'Bù Đăng – cao su thiên nhiên', 'Hớn Quản – hồ tiêu'],
    export_products: ['Điều nhân', 'Cao su', 'Hồ tiêu'],
    summary_vi: 'Bình Phước dẫn đầu cả nước về diện tích và sản lượng điều với hơn 170.000 ha. Điều nhân chế biến xuất khẩu sang EU, Mỹ đứng đầu thế giới. Cao su Bình Phước có vùng nguyên liệu ổn định cho các nhà máy chế biến.',
  },

  'dak-nong': {
    province_slug: 'dak-nong',
    dominant_crops: ['ca_phe_robusta', 'ho_tieu', 'cao_su', 'mac_ca', 'sau_rieng', 'san'],
    soil_composition: [{ soil: 'basalt_red', pct: 60 }, { soil: 'laterite', pct: 25 }, { soil: 'mixed', pct: 15 }],
    agricultural_gdp_pct: 40,
    special_zones: ['Đắk Song – vùng hồ tiêu chất lượng cao', 'Krông Nô – mắc ca đang mở rộng', 'Tuy Đức – cà phê Robusta'],
    export_products: ['Cà phê', 'Hồ tiêu', 'Mắc ca'],
    summary_vi: 'Đắk Nông là tỉnh Tây Nguyên mới chia tách, đang phát triển nhanh cây công nghiệp giá trị cao. Hồ tiêu Đắk Song nổi tiếng về chất lượng và đang được đăng ký chỉ dẫn địa lý. Mắc ca là cây trồng mới đầy tiềm năng trên đất đỏ bazan.',
  },

  'gia-lai': {
    province_slug: 'gia-lai',
    dominant_crops: ['ca_phe_robusta', 'ho_tieu', 'cao_su', 'mia', 'san'],
    soil_composition: [{ soil: 'basalt_red', pct: 45 }, { soil: 'laterite', pct: 40 }, { soil: 'mixed', pct: 15 }],
    agricultural_gdp_pct: 38,
    special_zones: ['Chư Sê – thủ phủ hồ tiêu Tây Nguyên', 'Chư Prông – cà phê đặc sản', 'Ia Grai – cao su Hoàng Anh Gia Lai'],
    export_products: ['Hồ tiêu', 'Cà phê', 'Cao su'],
    summary_vi: 'Gia Lai là tỉnh có diện tích cà phê và cao su lớn thứ hai Tây Nguyên. Hồ tiêu Chư Sê nổi tiếng toàn cầu, được ưa chuộng tại thị trường EU, Ấn Độ. Các tập đoàn lớn (HAGL, Hoàng Anh Gia Lai) có vùng nguyên liệu rộng lớn tại đây.',
  },

  'dong-nai': {
    province_slug: 'dong-nai',
    dominant_crops: ['ca_phe_robusta', 'cao_su', 'dieu', 'xoai', 'sau_rieng', 'chuoi'],
    soil_composition: [{ soil: 'basalt_red', pct: 40 }, { soil: 'alluvial', pct: 35 }, { soil: 'laterite', pct: 25 }],
    agricultural_gdp_pct: 12,
    special_zones: ['Xuân Lộc – vùng cây ăn trái chuyên canh', 'Thống Nhất – cà phê Robusta', 'Long Thành – cao su, tiêu'],
    export_products: ['Cà phê', 'Cao su', 'Cây ăn trái'],
    summary_vi: 'Đồng Nai đang chuyển dịch nhanh từ nông nghiệp sang công nghiệp-dịch vụ nhưng vẫn giữ vùng cây công nghiệp ổn định. Xuân Lộc là vùng cây ăn trái đặc sản (sầu riêng, xoài) có thương hiệu mạnh. Áp lực đô thị hóa làm giá đất nông nghiệp tăng mạnh.',
  },

  'tay-ninh': {
    province_slug: 'tay-ninh',
    dominant_crops: ['mia', 'san', 'cao_su', 'lua_nuoc', 'ngo'],
    soil_composition: [{ soil: 'laterite', pct: 45 }, { soil: 'alluvial', pct: 35 }, { soil: 'mixed', pct: 20 }],
    agricultural_gdp_pct: 32,
    special_zones: ['Gò Dầu – vùng mía đường lớn nhất Đông Nam Bộ', 'Châu Thành – cao su thiên nhiên', 'Tân Biên – sắn công nghiệp'],
    export_products: ['Đường mía', 'Cao su', 'Tinh bột sắn'],
    summary_vi: 'Tây Ninh là vùng sản xuất mía đường và sắn lớn của Đông Nam Bộ, cung cấp cho nhiều nhà máy chế biến. Cao su có lịch sử trồng lâu đời từ thời Pháp thuộc, chất lượng ổn định. Khu kinh tế biên giới Mộc Bài tạo cơ hội thương mại hóa nông sản với Campuchia.',
  },

  'ca-mau': {
    province_slug: 'ca-mau',
    dominant_crops: ['tom', 'lua_nuoc', 'keo_tram', 'ca_bien'],
    soil_composition: [{ soil: 'peat', pct: 50 }, { soil: 'clay', pct: 35 }, { soil: 'alluvial', pct: 15 }],
    agricultural_gdp_pct: 55,
    special_zones: ['U Minh Hạ – tôm rừng sinh thái hữu cơ', 'Năm Căn – nuôi tôm siêu thâm canh', 'Mũi Cà Mau – khu dự trữ sinh quyển'],
    export_products: ['Tôm hữu cơ', 'Tôm thẻ chân trắng', 'Gỗ tràm'],
    summary_vi: 'Cà Mau có diện tích nuôi tôm lớn nhất Việt Nam với mô hình tôm–rừng sinh thái được cấp chứng nhận hữu cơ quốc tế. Tôm hữu cơ Cà Mau có giá bán cao hơn 30–40% so với tôm thường, xuất sang EU và Nhật. Hệ sinh thái rừng ngập mặn U Minh là tài sản thiên nhiên vô giá.',
  },

  'ben-tre': {
    province_slug: 'ben-tre',
    dominant_crops: ['dua', 'buoi', 'sau_rieng', 'ca_tra', 'tom'],
    soil_composition: [{ soil: 'alluvial', pct: 65 }, { soil: 'clay', pct: 25 }, { soil: 'sandy', pct: 10 }],
    agricultural_gdp_pct: 38,
    special_zones: ['Châu Thành – dừa ta, dừa xiêm', 'Chợ Lách – bưởi da xanh', 'Bình Đại – tôm, ngao'],
    export_products: ['Dừa hữu cơ', 'Bưởi da xanh', 'Sầu riêng'],
    summary_vi: 'Bến Tre là "xứ dừa" với 170.000 ha dừa, cung cấp 40% sản lượng dừa cả nước. Dừa hữu cơ Bến Tre xuất sang EU với giá trị gia tăng cao. Bưởi da xanh Chợ Lách được Nhật Bản, Mỹ, EU chấp nhận nhập khẩu chính ngạch.',
  },

  'vinh-long': {
    province_slug: 'vinh-long',
    dominant_crops: ['buoi', 'sau_rieng', 'lua_nuoc', 'khoai_lang', 'cam_chanh'],
    soil_composition: [{ soil: 'alluvial', pct: 75 }, { soil: 'clay', pct: 20 }, { soil: 'mixed', pct: 5 }],
    agricultural_gdp_pct: 36,
    special_zones: ['Bình Tân – khoai lang xuất khẩu Nhật Bản', 'Long Hồ – bưởi Năm Roi', 'Tam Bình – cam sành đặc sản'],
    export_products: ['Khoai lang tím Nhật', 'Bưởi Năm Roi', 'Cam sành'],
    summary_vi: 'Vĩnh Long nổi bật với bưởi Năm Roi có thương hiệu mạnh và khoai lang Nhật Bản (tím) xuất khẩu giá trị cao. Bình Tân là vùng chuyên canh khoai lang lớn nhất ĐBSCL, 90% xuất sang Trung Quốc và Nhật. Đất phù sa ven sông Tiền, sông Hậu đặc biệt phì nhiêu.',
  },

  'an-giang': {
    province_slug: 'an-giang',
    dominant_crops: ['lua_nuoc', 'ca_tra', 'nep', 'rau_mau', 'dau_tuong'],
    soil_composition: [{ soil: 'alluvial', pct: 70 }, { soil: 'peat', pct: 20 }, { soil: 'clay', pct: 10 }],
    agricultural_gdp_pct: 32,
    special_zones: ['Chợ Mới – nếp An Giang đặc sản', 'Châu Đốc – cá tra, cá basa lồng bè', 'Tứ giác Long Xuyên – lúa gạo cao sản'],
    export_products: ['Gạo cao sản', 'Cá tra', 'Nếp đặc sản'],
    summary_vi: 'An Giang là tỉnh đầu nguồn ĐBSCL, cá tra bè trên sông Tiền là đặc trưng nổi tiếng. Gạo An Giang dẫn đầu cả nước về sản lượng lúa hàng năm. Nếp An Giang được dùng làm bánh tráng, bánh phồng đặc sản xuất khẩu.',
  },

  'can-tho': {
    province_slug: 'can-tho',
    dominant_crops: ['lua_nuoc', 'ca_tra', 'rau_mau', 'xoai', 'buoi'],
    soil_composition: [{ soil: 'alluvial', pct: 80 }, { soil: 'clay', pct: 15 }, { soil: 'mixed', pct: 5 }],
    agricultural_gdp_pct: 18,
    special_zones: ['Ô Môn – nông nghiệp đô thị, rau sạch', 'Thốt Nốt – lúa gạo chất lượng cao', 'Phong Điền – cây ăn trái đặc sản'],
    export_products: ['Gạo chất lượng cao', 'Cá tra', 'Rau sạch'],
    summary_vi: 'Cần Thơ là trung tâm kinh tế ĐBSCL, đi đầu về nông nghiệp đô thị và ứng dụng công nghệ. Viện lúa ĐBSCL đặt tại đây, nơi nghiên cứu ra các giống lúa ngon nhất như ST25. Cá tra Cần Thơ chiếm 20% sản lượng cả nước, chế biến xuất khẩu EU, Mỹ.',
  },

  'yen-bai': {
    province_slug: 'yen-bai',
    dominant_crops: ['che', 'keo_tram', 'bach_dan', 'lua_can', 'san'],
    soil_composition: [{ soil: 'laterite', pct: 55 }, { soil: 'alluvial', pct: 25 }, { soil: 'mixed', pct: 20 }],
    agricultural_gdp_pct: 26,
    special_zones: ['Văn Chấn – vùng chè Shan Tuyết cổ thụ', 'Yên Bình – cây keo lấy dăm', 'Lục Yên – bưởi đặc sản, quế'],
    export_products: ['Chè Shan Tuyết', 'Gỗ dăm keo', 'Quế Văn Yên'],
    summary_vi: 'Yên Bái có vùng chè Shan Tuyết cổ thụ hàng trăm năm tuổi tại Mù Cang Chải, Văn Chấn – nguyên liệu trà specialty đắt giá. Quế Văn Yên được cấp chỉ dẫn địa lý, xuất khẩu sang EU, Nhật, Ấn Độ. Ruộng bậc thang Mù Cang Chải vừa sản xuất vừa thu hút du lịch cao cấp.',
  },

  'lao-cai': {
    province_slug: 'lao-cai',
    dominant_crops: ['lua_can', 'ngo', 'keo_tram', 'che', 'rau_mau'],
    soil_composition: [{ soil: 'laterite', pct: 60 }, { soil: 'alluvial', pct: 25 }, { soil: 'mixed', pct: 15 }],
    agricultural_gdp_pct: 20,
    special_zones: ['Sa Pa – rau, hoa xứ lạnh xuất khẩu', 'Bắc Hà – mận tam hoa, lê', 'Mường Khương – chè, thảo quả'],
    export_products: ['Rau ôn đới', 'Thảo quả', 'Mận, lê đặc sản'],
    summary_vi: 'Lào Cai có khí hậu đặc biệt với Sa Pa lạnh quanh năm (3–15°C mùa đông) cho phép trồng rau, hoa ôn đới hiếm. Thảo quả Mường Khương, Bắc Hà là sản phẩm dược liệu quý xuất sang Trung Quốc. Ruộng bậc thang Mù Cang Chải là biểu tượng nông nghiệp miền núi Việt Nam.',
  },

  'son-la': {
    province_slug: 'son-la',
    dominant_crops: ['ca_phe_arabica', 'xoai', 'nhan', 'ngo', 'mia', 'san'],
    soil_composition: [{ soil: 'laterite', pct: 50 }, { soil: 'mixed', pct: 30 }, { soil: 'alluvial', pct: 20 }],
    agricultural_gdp_pct: 32,
    special_zones: ['Mộc Châu – chè, sữa bò, rau ôn đới', 'Sông Mã – xoài tứ quý', 'Thuận Châu – cà phê Arabica'],
    export_products: ['Cà phê Arabica', 'Xoài Sơn La', 'Nhãn đặc sản'],
    summary_vi: 'Sơn La là tỉnh có sản lượng xoài và nhãn lớn nhất miền Bắc, xuất khẩu sang Trung Quốc, Úc, EU. Cà phê Arabica Sơn La được các roastery specialty đánh giá cao do độ cao 800–1.200m. Mộc Châu là thương hiệu du lịch nông nghiệp mạnh với chè, bò sữa và rau ôn đới.',
  },

  'lang-son': {
    province_slug: 'lang-son',
    dominant_crops: ['hoi', 'na', 'quat', 'rau_mau', 'keo_tram'],
    soil_composition: [{ soil: 'laterite', pct: 55 }, { soil: 'mixed', pct: 30 }, { soil: 'alluvial', pct: 15 }],
    agricultural_gdp_pct: 24,
    special_zones: ['Bắc Sơn – na đặc sản, trám trắng', 'Văn Quan – hồi hương xuất khẩu', 'Cao Lộc – quýt đường, rau màu'],
    export_products: ['Hồi Lạng Sơn', 'Na Chi Lăng', 'Hàng nông sản biên mậu'],
    summary_vi: 'Lạng Sơn là vùng hồi hương lớn nhất thế giới, xuất khẩu sang Ấn Độ, EU làm dược liệu và gia vị. Na Chi Lăng ngọt và ít hạt là đặc sản nổi tiếng. Cửa khẩu Hữu Nghị, Tân Thanh tạo lợi thế thương mại hóa nông sản với Trung Quốc.',
  },

  'thanh-hoa': {
    province_slug: 'thanh-hoa',
    dominant_crops: ['lua_nuoc', 'mia', 'san', 'cao_su', 'keo_tram', 'ngo'],
    soil_composition: [{ soil: 'alluvial', pct: 40 }, { soil: 'laterite', pct: 35 }, { soil: 'mixed', pct: 25 }],
    agricultural_gdp_pct: 28,
    special_zones: ['Lam Sơn – mía đường lớn nhất Bắc Trung Bộ', 'Như Xuân – cao su', 'Thạch Thành – nếp đặc sản'],
    export_products: ['Đường mía', 'Cao su', 'Rau màu'],
    summary_vi: 'Thanh Hóa là tỉnh đa dạng địa hình nhất Bắc Trung Bộ với đồng bằng ven biển, đồi trung du và miền núi. Nhà máy đường Lam Sơn là lớn nhất miền Bắc. Cao su Như Xuân, Thường Xuân đang được mở rộng. Vùng ven biển Nga Sơn phát triển nuôi trồng thủy sản.',
  },
}

// ── Lookup ────────────────────────────────────────────────────────────────────

export function getProvinceAgriProfile(slug: string): ProvinceAgriProfile | null {
  return PROVINCE_AGRI_DATA[slug] ?? null
}
