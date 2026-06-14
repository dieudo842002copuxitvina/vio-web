// Server component — no 'use client'
// Agricultural suitability panel: crops, soil, yield, seasonality
// based on land_type + province region.

// ── Static suitability data ───────────────────────────────────────────────────

interface CropStat {
  name:      string
  yield:     string  // e.g. "5-7 tấn/ha"
  season:    string  // e.g. "2 vụ/năm"
  suitability: 'high' | 'medium' | 'low'
}

interface LandTypeSuitability {
  headline:   string
  overview:   string
  crops:      CropStat[]
  soilNeeds:  string[]
  waterNeeds: 'Cao' | 'Trung bình' | 'Thấp'
  laborIndex: 'Cao' | 'Trung bình' | 'Thấp'
  investHorizon: string
}

const SUITABILITY: Record<string, LandTypeSuitability> = {
  lua: {
    headline:   'Đất lúa nước — Canh tác 2-3 vụ/năm',
    overview:   'Phù hợp nhất ở vùng đồng bằng có hệ thống thủy lợi. Canh tác lúa ổn định, có thể luân canh với rau màu vụ đông.',
    crops: [
      { name: 'Lúa nước', yield: '5-7 tấn/ha', season: '2-3 vụ/năm',     suitability: 'high'   },
      { name: 'Rau cải',  yield: '15-20 tấn/ha', season: 'Vụ đông',       suitability: 'medium' },
      { name: 'Dưa hấu',  yield: '25-35 tấn/ha', season: '1-2 vụ/năm',   suitability: 'medium' },
    ],
    soilNeeds:     ['Đất thịt pha sét', 'pH 5.5-7.0', 'Giữ nước tốt'],
    waterNeeds:    'Cao',
    laborIndex:    'Trung bình',
    investHorizon: '1-3 tháng/vụ',
  },
  rau_mau: {
    headline:   'Đất rau màu — Luân canh 3-5 vụ/năm',
    overview:   'Thích hợp sản xuất rau sạch, rau VietGAP. Vòng quay ngắn, thu hồi vốn nhanh, cần nguồn nước sạch và giao thông thuận lợi.',
    crops: [
      { name: 'Rau ăn lá', yield: '15-25 tấn/ha', season: '5-6 vụ/năm',  suitability: 'high'   },
      { name: 'Cà chua',   yield: '40-60 tấn/ha', season: '2-3 vụ/năm',  suitability: 'high'   },
      { name: 'Dưa leo',   yield: '25-40 tấn/ha', season: '3-4 vụ/năm',  suitability: 'medium' },
    ],
    soilNeeds:     ['Đất cát pha thịt', 'pH 6.0-7.0', 'Thoát nước tốt'],
    waterNeeds:    'Trung bình',
    laborIndex:    'Cao',
    investHorizon: '1-3 tháng/vụ',
  },
  cay_lau_nam: {
    headline:   'Cây lâu năm — Đầu tư 3-5 năm, thu 20+ năm',
    overview:   'Cây lâu năm như cà phê, hồ tiêu, cao su phù hợp đất đỏ bazan Tây Nguyên. Đầu tư ban đầu cao nhưng ổn định dài hạn.',
    crops: [
      { name: 'Cà phê Robusta', yield: '2-3.5 tấn/ha', season: '1 vụ/năm',  suitability: 'high'   },
      { name: 'Hồ tiêu',        yield: '3-5 kg/trụ',   season: '1 vụ/năm',  suitability: 'high'   },
      { name: 'Cao su',         yield: '1.5-2.5 tấn/ha', season: 'Quanh năm', suitability: 'medium' },
    ],
    soilNeeds:     ['Đất đỏ bazan', 'pH 5.5-6.5', 'Tầng canh tác ≥80cm'],
    waterNeeds:    'Trung bình',
    laborIndex:    'Trung bình',
    investHorizon: '3-5 năm kiến thiết',
  },
  an_trai: {
    headline:   'Cây ăn trái — Tiềm năng xuất khẩu cao',
    overview:   'Sầu riêng, xoài, bưởi là các loại trái cây có giá trị xuất khẩu cao. Đất phù sa ĐBSCL lý tưởng. Cần quản lý dịch bệnh và chứng nhận chất lượng để xuất khẩu.',
    crops: [
      { name: 'Sầu riêng', yield: '20-40 tấn/ha', season: '1 vụ/năm',     suitability: 'high'   },
      { name: 'Xoài',      yield: '20-30 tấn/ha', season: '1-2 vụ/năm',   suitability: 'high'   },
      { name: 'Bưởi',      yield: '15-25 tấn/ha', season: '1 vụ/năm',     suitability: 'medium' },
    ],
    soilNeeds:     ['Đất phù sa', 'pH 5.5-7.0', 'Thoát nước vừa'],
    waterNeeds:    'Trung bình',
    laborIndex:    'Trung bình',
    investHorizon: '3-6 năm kiến thiết',
  },
  lam_nghiep: {
    headline:   'Rừng kinh tế — Chu kỳ 7-20 năm',
    overview:   'Keo lai, bạch đàn sinh trưởng nhanh, chu kỳ 7-10 năm. Rừng gỗ lớn (lim, sến) chu kỳ 15-20 năm. Thích hợp đầu tư bảo tồn và tín chỉ carbon.',
    crops: [
      { name: 'Keo lai',    yield: '80-120 m³/ha', season: '7-10 năm/chu kỳ', suitability: 'high'   },
      { name: 'Bạch đàn',   yield: '60-100 m³/ha', season: '7-8 năm/chu kỳ',  suitability: 'high'   },
      { name: 'Thông',      yield: '50-80 m³/ha',  season: '15-20 năm/chu kỳ', suitability: 'medium' },
    ],
    soilNeeds:     ['Đất đồi dốc ≤25°', 'pH 4.5-6.5', 'Thoát nước tốt'],
    waterNeeds:    'Thấp',
    laborIndex:    'Thấp',
    investHorizon: '7-20 năm',
  },
  mat_nuoc: {
    headline:   'Nuôi thuỷ sản — Thu hoạch 2-4 lứa/năm',
    overview:   'Tôm thẻ, tôm sú và cá tra là chủ lực xuất khẩu ĐBSCL. Ao nuôi ven biển tận dụng nước mặn/lợ. Cần kiểm soát dịch bệnh và tiêu chuẩn ASC/BAP để xuất khẩu.',
    crops: [
      { name: 'Tôm thẻ',  yield: '8-15 tấn/ha', season: '2-3 vụ/năm',   suitability: 'high'   },
      { name: 'Cá tra',   yield: '200-300 tấn/ha', season: '2 vụ/năm',   suitability: 'high'   },
      { name: 'Tôm sú',   yield: '3-5 tấn/ha',  season: '1-2 vụ/năm',   suitability: 'medium' },
    ],
    soilNeeds:     ['Đất sét thịt nặng', 'pH nước 7.5-8.5', 'Chống thấm tốt'],
    waterNeeds:    'Cao',
    laborIndex:    'Cao',
    investHorizon: '3-6 tháng/vụ',
  },
  hon_hop: {
    headline:   'Đất hỗn hợp — Đa dạng canh tác',
    overview:   'Linh hoạt kết hợp nhiều hình thức: vườn-ao-chuồng (VAC), nông lâm kết hợp, du lịch sinh thái kết hợp nông nghiệp. Hiệu quả kinh tế phụ thuộc vào mô hình tổ chức.',
    crops: [
      { name: 'Mô hình VAC',  yield: 'Tổng hợp',   season: 'Quanh năm',  suitability: 'high'   },
      { name: 'Nông lâm kết hợp', yield: 'Đa tầng', season: 'Quanh năm', suitability: 'medium' },
      { name: 'Du lịch sinh thái', yield: 'Dịch vụ', season: 'Quanh năm', suitability: 'medium' },
    ],
    soilNeeds:     ['Đa dạng', 'pH 5.5-7.0', 'Tùy mô hình'],
    waterNeeds:    'Trung bình',
    laborIndex:    'Cao',
    investHorizon: 'Linh hoạt',
  },
}

const FALLBACK_SUITABILITY: LandTypeSuitability = {
  headline:   'Đất nông nghiệp',
  overview:   'Đất có tiềm năng canh tác đa dạng. Khuyến nghị khảo sát thực địa để xác định cây trồng phù hợp với điều kiện đất và khí hậu địa phương.',
  crops: [
    { name: 'Lúa / rau màu', yield: 'Tùy điều kiện', season: '1-3 vụ/năm', suitability: 'medium' },
  ],
  soilNeeds:     ['Tùy loại cây trồng'],
  waterNeeds:    'Trung bình',
  laborIndex:    'Trung bình',
  investHorizon: 'Tùy kế hoạch',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SuitabilityDot({ level }: { level: 'high' | 'medium' | 'low' }) {
  const color = level === 'high' ? '#1A4D2E' : level === 'medium' ? '#FF9500' : '#AAAAAA'
  const label = level === 'high' ? 'Rất phù hợp' : level === 'medium' ? 'Phù hợp' : 'Trung bình'
  return (
    <span
      className="inline-flex h-2 w-2 rounded-full"
      style={{ background: color }}
      title={label}
      aria-label={label}
    />
  )
}

function IndexPill({ label, value }: { label: string; value: string }) {
  const color = value === 'Cao' ? '#E8F0EB' : value === 'Thấp' ? '#FFF8F0' : '#F5F5F7'
  const text  = value === 'Cao' ? '#1A4D2E' : value === 'Thấp' ? '#FF9500' : '#555555'
  return (
    <div className="flex flex-col gap-1 rounded-2xl px-3.5 py-2.5" style={{ background: color }}>
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
        {label}
      </span>
      <span className="text-[13px] font-bold" style={{ color: text }}>{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AgriculturalSuitabilityProps {
  landType:      string | null   // raw key: lua | rau_mau | cay_lau_nam | …
  soilTypeAttr:  string | null   // from attrs['soil_type']
  provinceName:  string | null
}

export function AgriculturalSuitability({
  landType, soilTypeAttr, provinceName,
}: AgriculturalSuitabilityProps) {
  const data = (landType && SUITABILITY[landType]) || FALLBACK_SUITABILITY

  return (
    <section aria-labelledby="agri-suitability-heading" className="space-y-5">

      {/* Section header */}
      <div>
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
          Tiềm năng canh tác
        </p>
        <h2
          id="agri-suitability-heading"
          className="m-0 mt-1 text-[17px] font-bold text-neutral-900"
        >
          {data.headline}
        </h2>
        <p className="m-0 mt-1.5 text-[14px] leading-relaxed text-neutral-500">
          {data.overview}
          {provinceName && ` Khu vực ${provinceName}.`}
        </p>
      </div>

      {/* Crop suitability table */}
      <div className="overflow-hidden rounded-[20px] border border-neutral-100 bg-[#FAFAFA]">
        {/* Header */}
        <div className="grid grid-cols-[1fr_100px_90px_80px] gap-2 border-b border-neutral-100
                        bg-white px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Cây trồng / Vật nuôi
          </span>
          <span className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Năng suất
          </span>
          <span className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Vụ / Chu kỳ
          </span>
          <span className="text-right text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            Mức độ
          </span>
        </div>
        {data.crops.map((c, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_100px_90px_80px] items-center gap-2
                       border-b border-neutral-50 px-4 py-3 last:border-0"
          >
            <span className="text-[13px] font-semibold text-neutral-800">{c.name}</span>
            <span className="text-right text-[12px] font-medium text-neutral-500">{c.yield}</span>
            <span className="text-right text-[12px] text-neutral-500">{c.season}</span>
            <span className="flex justify-end">
              <SuitabilityDot level={c.suitability}/>
            </span>
          </div>
        ))}
      </div>

      {/* Soil + index row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {/* Soil requirements */}
        <div className="rounded-[20px] border border-neutral-100 bg-white p-4">
          <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
            Yêu cầu đất
          </p>
          <ul className="m-0 list-none space-y-1.5 p-0">
            {data.soilNeeds.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-600">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                     className="mt-0.5 shrink-0 text-[#2D7A4F]" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {n}
              </li>
            ))}
            {soilTypeAttr && (
              <li className="mt-1 flex items-start gap-2 text-[13px] font-medium text-[#1A4D2E]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                     className="mt-0.5 shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round"/>
                </svg>
                Thực tế: {soilTypeAttr}
              </li>
            )}
          </ul>
        </div>

        {/* Management indices */}
        <div className="rounded-[20px] border border-neutral-100 bg-white p-4">
          <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
            Chỉ số vận hành
          </p>
          <div className="grid grid-cols-3 gap-2">
            <IndexPill label="Nhu cầu nước"   value={data.waterNeeds}    />
            <IndexPill label="Nhân lực"        value={data.laborIndex}    />
            <div className="flex flex-col gap-1 rounded-2xl bg-[#F5F5F7] px-3.5 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
                Đầu tư
              </span>
              <span className="text-[12px] font-bold text-neutral-700">
                {data.investHorizon}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#1A4D2E]"/>Rất phù hợp
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#FF9500]"/>Phù hợp
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#AAAAAA]"/>Trung bình
        </span>
      </div>

    </section>
  )
}
