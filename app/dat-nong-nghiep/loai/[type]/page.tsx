import { notFound }       from 'next/navigation'
import type { Metadata }  from 'next'
import Link               from 'next/link'
import { createCachedClient } from '@/lib/supabase/server'
import { LandListingCard }    from '@/entities/listing'
import { listingToLandCard }  from '@/entities/listing'
import { getPageState, getRobotsMeta } from '@/lib/seo/thin-page'
import { breadcrumbSchema, itemListSchema, faqPageSchema } from '@/lib/seo/schema'
import { seoRowToListing }    from '@/features/seo/api/seo-utils'

export const revalidate = 3600

// ── FAQ data per land type ────────────────────────────────────────────────────

const LAND_TYPE_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  lua: [
    { question: 'Đất lúa có được phép chuyển sang trồng cây ăn trái không?', answer: 'Đất lúa (đất trồng lúa nước) thuộc nhóm đất nông nghiệp được bảo vệ. Việc chuyển đổi sang cây ăn trái lâu năm cần xin phép UBND cấp huyện và chỉ được phép tại các vùng không trong quy hoạch vùng lúa trọng điểm quốc gia. Tham khảo Nghị định 35/2015/NĐ-CP về sử dụng, khai thác bền vững đất trồng lúa.' },
    { question: 'Năng suất lúa trung bình trên đất lúa tại Việt Nam là bao nhiêu?', answer: 'Năng suất lúa tại Việt Nam đạt trung bình 5,5–6,5 tấn/ha/vụ ở đồng bằng sông Hồng và sông Cửu Long với 2–3 vụ/năm. Đất lúa chất lượng cao tại ĐBSCL có thể đạt 7–8 tấn/ha với giống lúa ST25 hoặc Jasmine. Năng suất phụ thuộc chủ yếu vào hệ thống tưới tiêu, chất lượng đất và giống lúa sử dụng.' },
    { question: 'Mua đất lúa cần kiểm tra những gì?', answer: 'Khi mua đất lúa cần kiểm tra: (1) Nguồn nước tưới — hệ thống kênh mương có hoạt động không, (2) Độ pH đất (lý tưởng 5,5–7,0), (3) Lịch sử ngập lụt và khả năng thoát nước, (4) Quy hoạch sử dụng đất địa phương, (5) Không nằm trong vùng ô nhiễm công nghiệp, (6) Xác minh diện tích thực đo đạc so với sổ đỏ.' },
    { question: 'Đất lúa có thể nuôi tôm xen canh được không?', answer: 'Mô hình lúa-tôm xen canh (lúa mùa + tôm sú) rất phổ biến tại các tỉnh ven biển ĐBSCL như Bạc Liêu, Cà Mau, Kiên Giang. Mô hình này đòi hỏi đất lúa có khả năng tiếp cận nguồn nước mặn/lợ theo mùa. Năng suất tôm đạt 300–500 kg/ha/vụ cộng với lúa 3–4 tấn/ha/năm, cho hiệu quả kinh tế vượt canh tác đơn.' },
    { question: 'Thuế chuyển nhượng đất lúa là bao nhiêu?', answer: 'Khi chuyển nhượng đất lúa, người bán chịu thuế thu nhập cá nhân 2% trên giá chuyển nhượng (hoặc 25% trên phần lợi nhuận). Người mua đóng lệ phí trước bạ 0,5% giá trị đất theo bảng giá địa phương. Trong trường hợp đất được tặng cho hoặc thừa kế, có các mức miễn giảm khác nhau theo quy định pháp luật.' },
  ],
  'rau-mau': [
    { question: 'Đất rau màu khác đất lúa như thế nào về pháp lý?', answer: 'Đất rau màu (đất trồng cây hàng năm) cùng nhóm đất nông nghiệp với đất lúa nhưng không bị ràng buộc bảo vệ nghiêm ngặt như đất lúa. Việc chuyển đổi giữa các loại cây hàng năm (từ rau sang lúa, ngô, đậu...) được tự do trong cùng mục đích. Chuyển sang cây lâu năm hoặc xây dựng vẫn cần xin phép.' },
    { question: 'Điều kiện đất phù hợp cho sản xuất rau sạch VietGAP?', answer: 'Đất sản xuất rau sạch VietGAP cần: pH 6,0–7,0, hàm lượng chì dưới 70 mg/kg, cadimi dưới 1,5 mg/kg, không bị ô nhiễm nguồn nước thải công nghiệp. Vị trí cách xa khu công nghiệp ít nhất 3km, cách đường cao tốc 500m, có nguồn nước sạch tưới tiêu. Cần xét nghiệm đất trước khi đăng ký chứng nhận.' },
    { question: 'Vốn đầu tư ban đầu cho 1 ha đất rau màu là bao nhiêu?', answer: 'Đầu tư 1 ha rau màu theo hướng bán thâm canh cần khoảng 150–300 triệu đồng cho hệ thống tưới nhỏ giọt, nhà lưới, vật tư ban đầu. Nhà màng kín cần 500 triệu – 1,5 tỷ đồng/ha. Thời gian hoàn vốn 2–4 năm với điều kiện đầu ra ổn định. Cần tính đến chi phí chứng nhận VietGAP (15–30 triệu/năm).' },
  ],
  'cay-lau-nam': [
    { question: 'Đất cây lâu năm có giá trị đầu tư như thế nào?', answer: 'Đất cây lâu năm (cà phê, hồ tiêu, cao su) tại Tây Nguyên và Đông Nam Bộ có giá trị đầu tư cao vì vừa có giá trị đất vừa có tài sản gắn liền (vườn cây đang khai thác). Cà phê Robusta sau 5 năm cho thu hoạch 20–35 năm liên tục. Giá đất trồng cà phê tại Đắk Lắk, Lâm Đồng từ 500 triệu đến 2 tỷ đồng/ha tùy năng suất vườn.' },
    { question: 'Khi mua vườn cây lâu năm cần kiểm tra gì?', answer: 'Kiểm tra bắt buộc khi mua vườn cây lâu năm: (1) Tuổi cây và chu kỳ kinh doanh còn lại, (2) Năng suất thực tế 3 năm gần nhất, (3) Tình trạng sâu bệnh (đặc biệt bệnh chết nhanh, chết chậm trên hồ tiêu), (4) Quyền sở hữu tài sản gắn liền trên đất (vườn cây có được ghi nhận trong sổ đỏ không), (5) Hệ thống tưới nước và công trình phụ trợ.' },
    { question: 'Đất cây lâu năm tại Tây Nguyên có phù hợp đầu tư không?', answer: 'Tây Nguyên (Đắk Lắk, Lâm Đồng, Gia Lai, Đắk Nông) là vùng cây lâu năm trọng điểm Việt Nam với đất đỏ bazan màu mỡ. Cà phê Robusta Tây Nguyên xuất khẩu sang EU, Mỹ với giá trị cao. Thách thức: biến đổi khí hậu gây hạn hán, giá cà phê biến động. Đất tốt ở các huyện trồng cà phê truyền thống vẫn là kênh đầu tư dài hạn tiềm năng.' },
  ],
  'an-trai': [
    { question: 'Sầu riêng trồng trên đất nào phù hợp nhất?', answer: 'Sầu riêng thích hợp trên đất phù sa ven sông (ĐBSCL), đất đỏ vàng (Tây Nguyên) và đất thịt nhẹ thoát nước tốt. pH đất lý tưởng 5,5–6,5, tầng canh tác sâu ≥1m, mực nước ngầm sâu ≥1m. Vùng trồng sầu riêng xuất khẩu chính: Tiền Giang, Vĩnh Long, Đắk Lắk, Lâm Đồng. Giá đất trồng sầu riêng đạt năng suất cao từ 1–3 tỷ đồng/ha.' },
    { question: 'Đất vườn cây ăn trái có được chứng nhận GlobalGAP để xuất khẩu không?', answer: 'Có thể. Để xuất khẩu sang EU, Nhật, Mỹ, vườn trái cây cần đạt chứng nhận GlobalGAP hoặc VietGAP. Chi phí chứng nhận GlobalGAP 30–60 triệu/ha/năm. Điều kiện bao gồm: đất không ô nhiễm kim loại nặng, nguồn nước sạch, nhật ký canh tác đầy đủ, không dùng hóa chất cấm. Xuất khẩu chính ngạch qua cửa khẩu mang lại giá trị cao hơn 40–60% so với bán nội địa.' },
    { question: 'Mô hình kinh doanh trang trại cây ăn trái hiệu quả nhất hiện nay là gì?', answer: 'Ba mô hình hiệu quả: (1) Vườn chuyên canh sầu riêng với liên kết xuất khẩu (lợi nhuận 500–800 triệu/ha/năm khi vào vụ), (2) Vườn hỗn hợp kết hợp du lịch sinh thái (thêm 200–500 triệu/năm từ dịch vụ), (3) Vườn hữu cơ xây dựng thương hiệu địa phương (biên lợi nhuận cao hơn 30–50%). Lựa chọn mô hình phụ thuộc vào vị trí đất và nguồn lực đầu tư.' },
  ],
  'lam-nghiep': [
    { question: 'Rừng kinh tế trồng keo lai có chu kỳ và lợi nhuận như thế nào?', answer: 'Keo lai có chu kỳ kinh doanh 7–10 năm/vòng, năng suất 80–120 m³/ha/vòng. Với giá gỗ dăm 1,2–1,5 triệu đồng/tấn (tươi), doanh thu 90–150 triệu/ha/vòng. Chi phí trồng + chăm sóc + khai thác khoảng 40–60 triệu/ha. Lợi nhuận ròng 50–90 triệu/ha/vòng (7–10 năm). IRR ~8–12%/năm — thấp hơn cây ăn trái nhưng ổn định và ít rủi ro hơn.' },
    { question: 'Đất lâm nghiệp có cần giấy phép khai thác gỗ không?', answer: 'Rừng trồng sản xuất (keo, bạch đàn) của chủ hộ tư nhân được phép khai thác sau khi đủ chu kỳ, cần thông báo đến Hạt Kiểm lâm địa phương và có phương án khai thác. Rừng phòng hộ và rừng đặc dụng bị cấm khai thác gỗ thương mại. Kiểm tra phân loại rừng (sản xuất/phòng hộ/đặc dụng) trong sổ đỏ trước khi mua.' },
    { question: 'Tín chỉ carbon từ rừng trồng có tiềm năng không?', answer: 'Thị trường tín chỉ carbon rừng đang phát triển tại Việt Nam. Rừng keo/bạch đàn tích lũy 5–10 tấn CO₂/ha/năm. Giá tín chỉ voluntary carbon market 5–30 USD/tấn CO₂. Cần diện tích ≥500 ha và chứng nhận VCS/Gold Standard để bán tín chỉ carbon. Chính phủ Việt Nam đang thí điểm cơ chế REDD+ tại nhiều tỉnh. Đây là giá trị gia tăng tiềm năng cho chủ rừng quy mô lớn.' },
  ],
  'mat-nuoc': [
    { question: 'Nuôi tôm thẻ chân trắng cần loại đất mặt nước như thế nào?', answer: 'Đất ao nuôi tôm thẻ cần: nền đáy là đất sét thịt nặng (giữ nước tốt, hạn chế thẩm lậu), độ mặn nguồn nước 5–25‰, pH nước 7,5–8,5, hàm lượng oxy hòa tan ≥5 mg/L. Diện tích ao lý tưởng 0,3–1 ha/ao. Ao ≥3 năm tuổi có đáy ao ổn định hơn. Tránh ao nằm trong vùng ô nhiễm công nghiệp hoặc nông nghiệp hóa chất.' },
    { question: 'Giá đất nuôi tôm tại ĐBSCL hiện nay?', answer: 'Giá đất mặt nước nuôi tôm tại các tỉnh ĐBSCL dao động: 300–600 triệu/ha đất ao vuông thổ canh tại Cà Mau, Bạc Liêu; 500 triệu–1,5 tỷ/ha đất ao nuôi thâm canh có hạ tầng đầy đủ tại Kiên Giang, Bến Tre. Khu vực ven biển có giá cao hơn 20–40% so với đất nội đồng. Giá tăng mạnh sau dịch tôm 2022–2023.' },
    { question: 'Thủ tục cấp phép nuôi trồng thuỷ sản?', answer: 'Nuôi tôm diện tích dưới 5 ha cần đăng ký với UBND xã. Từ 5 ha trở lên cần Giấy phép nuôi trồng thuỷ sản do Sở NN&PTNT cấp. Hồ sơ gồm: Đơn đề nghị, Sổ đỏ/sổ hồng, Phương án kỹ thuật nuôi, Báo cáo đánh giá tác động môi trường (nếu cần). Thời gian xử lý 15–30 ngày làm việc.' },
  ],
  'hon-hop': [
    { question: 'Mô hình VAC (Vườn-Ao-Chuồng) trên đất hỗn hợp có hiệu quả không?', answer: 'Mô hình VAC tích hợp trồng trọt, chăn nuôi và nuôi thuỷ sản trên cùng mảnh đất mang lại thu nhập đa dạng và ổn định hơn canh tác đơn. Trên 1 ha đất hỗn hợp: khu vườn 0,3 ha (rau/cây ăn trái) + ao 0,4 ha (cá/tôm) + chuồng trại 0,3 ha (gà, lợn, bò). Thu nhập tổng hợp 200–500 triệu/năm tùy mô hình và thị trường tiêu thụ.' },
    { question: 'Đất hỗn hợp kết hợp du lịch sinh thái có khả thi không?', answer: 'Agritourism (du lịch nông nghiệp) đang tăng trưởng mạnh tại Việt Nam. Đất hỗn hợp gần đô thị (trong bán kính 50km từ TP lớn) hoặc vùng có cảnh quan đẹp có tiềm năng cao. Mô hình homestay nông trại + trải nghiệm canh tác đòi hỏi đầu tư hạ tầng 500 triệu–2 tỷ đồng ban đầu. Thu nhập từ dịch vụ du lịch có thể vượt thu nhập nông nghiệp đơn thuần.' },
  ],
}

const DEFAULT_LAND_TYPE_FAQ: Array<{ question: string; answer: string }> = [
  { question: 'Mua đất nông nghiệp cần những thủ tục gì?', answer: 'Thủ tục mua đất nông nghiệp gồm: (1) Kiểm tra pháp lý sổ đỏ tại Văn phòng Đăng ký Đất đai, (2) Ký hợp đồng chuyển nhượng công chứng tại văn phòng công chứng, (3) Nộp hồ sơ sang tên tại Văn phòng Đăng ký Đất đai, (4) Đóng thuế thu nhập cá nhân 2% và lệ phí trước bạ 0,5%, (5) Nhận sổ đỏ mới. Thời gian hoàn thành 15–45 ngày tùy địa phương.' },
  { question: 'Người nước ngoài có mua được đất nông nghiệp tại Việt Nam không?', answer: 'Theo Luật Đất đai Việt Nam, người nước ngoài không được đứng tên sở hữu đất tại Việt Nam (kể cả đất nông nghiệp). Tuy nhiên, doanh nghiệp 100% vốn ngoại được thuê đất nông nghiệp từ nhà nước hoặc từ cá nhân/tổ chức Việt Nam để sản xuất nông nghiệp theo quy định riêng. Cần tư vấn luật đầu tư để rõ hơn về các phương thức hợp tác.' },
]

// ── FAQ Component ─────────────────────────────────────────────────────────────

function FAQModule({ items }: { items: Array<{ question: string; answer: string }> }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-14">
      <div className="mb-5">
        <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">
          Giải đáp thắc mắc
        </p>
        <h2 id="faq-heading" className="mt-1 text-xl font-bold tracking-tight text-gray-900">
          Câu hỏi thường gặp
        </h2>
      </div>
      <div className="divide-y divide-gray-100 rounded-[20px] border border-gray-200 bg-white">
        {items.map((item, i) => (
          <details key={i} className="group px-5 py-4 open:pb-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <span className="text-[0.9375rem] font-semibold text-gray-900 leading-snug">
                {item.question}
              </span>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                               bg-gray-100 text-gray-500 group-open:bg-green-100 group-open:text-green-700
                               transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                     className="group-open:rotate-45 transition-transform duration-200">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round"/>
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-gray-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

// ── Land-type catalogue ───────────────────────────────────────────────────────

const LAND_TYPES: Record<string, {
  key:         string   // DB value (underscores)
  label:       string
  description: string
  tips:        string[]
}> = {
  'lua': {
    key:         'lua',
    label:       'Đất lúa',
    description: 'Đất trồng lúa (đất lúa nước) — loại đất nông nghiệp phổ biến nhất tại Việt Nam. Thích hợp canh tác lúa nước, rau màu và cây hàng năm khác.',
    tips: ['Kiểm tra nguồn nước tưới', 'Xác nhận không nằm trong quy hoạch đô thị', 'Hỏi về lịch sử canh tác'],
  },
  'rau-mau': {
    key:         'rau_mau',
    label:       'Đất rau màu',
    description: 'Đất chuyên canh rau, củ, quả và cây hàng năm. Phù hợp sản xuất nông nghiệp thâm canh, trang trại rau sạch và cung ứng cho thị trường.',
    tips: ['Kiểm tra chất lượng đất', 'Xem xét hệ thống tưới tiêu', 'Xác nhận khoảng cách đến đô thị'],
  },
  'cay-lau-nam': {
    key:         'cay_lau_nam',
    label:       'Cây lâu năm',
    description: 'Đất trồng cây lâu năm như cà phê, hồ tiêu, cao su, điều, cacao. Có giá trị lâu dài và phù hợp đầu tư dài hạn.',
    tips: ['Kiểm tra tuổi cây đang có', 'Xem xét giá cả sản phẩm đầu ra', 'Đánh giá khả năng mở rộng'],
  },
  'an-trai': {
    key:         'an_trai',
    label:       'Cây ăn trái',
    description: 'Đất vườn cây ăn trái: sầu riêng, xoài, bưởi, nhãn, vải, chôm chôm. Tiềm năng xuất khẩu cao, phù hợp nông nghiệp công nghệ cao.',
    tips: ['Xem xét giống cây và năng suất', 'Kiểm tra tiêu chuẩn xuất khẩu', 'Đánh giá kết nối chuỗi cung ứng'],
  },
  'lam-nghiep': {
    key:         'lam_nghiep',
    label:       'Lâm nghiệp',
    description: 'Đất rừng sản xuất và đất lâm nghiệp. Phù hợp trồng rừng kinh tế, khai thác gỗ và các sản phẩm lâm nghiệp.',
    tips: ['Kiểm tra giấy phép khai thác', 'Xem xét quy hoạch rừng', 'Đánh giá thị trường gỗ khu vực'],
  },
  'mat-nuoc': {
    key:         'mat_nuoc',
    label:       'Nuôi thuỷ sản',
    description: 'Đất mặt nước nuôi trồng thuỷ sản: tôm, cá, cua, nghêu, hàu. Phù hợp vùng ven biển, đồng bằng sông Cửu Long.',
    tips: ['Kiểm tra chất lượng nguồn nước', 'Xem xét giấy phép nuôi trồng', 'Đánh giá kết cấu hạ tầng'],
  },
  'hon-hop': {
    key:         'hon_hop',
    label:       'Đất hỗn hợp',
    description: 'Đất có nhiều loại hình canh tác kết hợp: vừa trồng cây lâu năm, vừa làm vườn rau, ao cá. Linh hoạt và đa dạng thu nhập.',
    tips: ['Xem xét tiềm năng quy hoạch', 'Đánh giá hiệu quả kinh tế từng hạng mục', 'Tìm hiểu quy định chuyển đổi mục đích'],
  },
}

// ── Page ─────────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ type: string }> },
): Promise<Metadata> {
  const { type: slug } = await params
  const def = LAND_TYPES[slug]
  if (!def) return { title: 'Không tìm thấy' }

  const title = `Mua bán ${def.label} toàn quốc — VIO AGRI`
  const description = def.description

  return {
    title,
    description,
    alternates: { canonical: `/dat-nong-nghiep/loai/${slug}` },
    openGraph: { title, description },
  }
}

export default async function LandTypePage(
  { params }: { params: Promise<{ type: string }> },
) {
  const { type: slug } = await params
  const def = LAND_TYPES[slug]
  if (!def) notFound()

  const supabase = createCachedClient()

  // Fetch listings by land_type column (added to listings in recent refactor)
  const { data: rows, count } = await supabase
    .from('listings')
    .select(
      'id, slug, title, cover_url, price_text, location_text, land_type, is_featured, is_verified, published_at',
      { count: 'exact' },
    )
    .eq('listing_type', 'land')
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .eq('land_type', def.key)
    .order('is_featured', { ascending: false })
    .order('published_at',  { ascending: false })
    .limit(48)

  const total     = count ?? 0
  const items     = rows ?? []
  const pageState = getPageState('province', total)   // reuse 'province' threshold (≥10)
  if (pageState === 'not-found') notFound()
  const robots    = getRobotsMeta(pageState)

  // Fetch province distribution for cross-linking
  const { data: provinceDist } = await supabase
    .from('listings')
    .select('province_id, provinces!inner(name, slug)', { count: 'estimated' })
    .eq('listing_type', 'land')
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .eq('land_type', def.key)
    .limit(100)

  // Aggregate provinces from distribution
  const provinceMap = new Map<string, { name: string; slug: string; count: number }>()
  for (const row of (provinceDist ?? [])) {
    const pArr = Array.isArray(row.provinces) ? row.provinces : [row.provinces]
    for (const p of pArr) {
      if (!p) continue
      const key = (p as { slug: string }).slug
      const existing = provinceMap.get(key)
      if (existing) {
        existing.count++
      } else {
        provinceMap.set(key, { name: (p as { name: string }).name, slug: key, count: 1 })
      }
    }
  }
  const topProvinces = Array.from(provinceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const faqItems     = LAND_TYPE_FAQS[slug] ?? DEFAULT_LAND_TYPE_FAQ
  const schemaFaq    = faqPageSchema(faqItems)

  // Structured data
  const schemaBreadcrumb = breadcrumbSchema([
    { name: 'Trang chủ',        href: '/' },
    { name: 'Đất nông nghiệp',  href: '/dat-nong-nghiep' },
    { name: def.label },
  ])
  const schemaItems = items.length > 0
    ? itemListSchema({
        name:  `Mua bán ${def.label} toàn quốc`,
        items: items.map(r => ({ slug: r.slug as string, title: r.title as string })),
      })
    : null

  const displayCount = total.toLocaleString('vi-VN')

  return (
    <>
      <meta name="robots" content={robots} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }} />
      {schemaItems && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaItems) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFaq) }} />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-gray-200/60 bg-[#FBFBFD]">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96
                        rounded-full bg-green-200/40 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-8 md:px-8 md:pb-14 md:pt-10">

          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-gray-400"
               aria-label="Điều hướng">
            <Link href="/" className="no-underline hover:text-gray-600">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <Link href="/dat-nong-nghiep" className="no-underline hover:text-gray-600">
              Đất nông nghiệp
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-gray-900">{def.label}</span>
          </nav>

          {total > 0 && (
            <div className="mt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3.5
                               py-1.5 text-[0.75rem] font-semibold text-green-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"
                      aria-hidden="true" />
                {displayCount} tin đang hoạt động
              </span>
            </div>
          )}

          <h1 className="mt-4 text-[2rem] font-bold leading-tight tracking-tight text-gray-900
                         sm:text-[2.75rem]">
            Mua bán{' '}
            <span className="text-green-700">{def.label}</span>
            {' '}toàn quốc
          </h1>
          <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-gray-500">
            {def.description}
          </p>

          {/* Province quick-links */}
          {topProvinces.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {topProvinces.map(p => (
                <Link
                  key={p.slug}
                  href={`/dat-nong-nghiep/${p.slug}?loai=${slug}`}
                  className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5
                             text-[0.8125rem] font-medium text-gray-600 no-underline
                             transition-colors hover:border-green-300 hover:bg-green-50
                             hover:text-green-700"
                >
                  {p.name}
                </Link>
              ))}
              <Link
                href={`/dat-nong-nghiep?loai=${slug}`}
                className="rounded-full border border-dashed border-gray-300 bg-transparent
                           px-3.5 py-1.5 text-[0.8125rem] font-medium text-gray-500
                           no-underline hover:border-gray-400"
              >
                Tất cả tỉnh thành →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Listings grid ─────────────────────────────────────────────── */}
      <main className="bg-[#FBFBFD] px-4 pb-20 pt-8 md:px-8">
        <div className="mx-auto max-w-5xl">

          {items.length > 0 ? (
            <section aria-label={`Danh sách ${def.label}`}>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[0.9375rem] font-bold text-gray-900">
                  {displayCount} tin đăng
                </p>
                <Link
                  href={`/dat-nong-nghiep?loai=${slug}`}
                  className="text-[0.8125rem] font-semibold text-green-700 no-underline
                             hover:underline"
                >
                  Tìm kiếm nâng cao →
                </Link>
              </div>

              <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(row => (
                  <li key={row.id as string}>
                    <LandListingCard
                      {...listingToLandCard(seoRowToListing(row as unknown as Parameters<typeof seoRowToListing>[0]))}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="flex flex-col items-center gap-5 rounded-[28px] border-2
                            border-dashed border-gray-200 bg-white py-20 text-center">
              <span className="select-none text-6xl opacity-20" aria-hidden="true">🌾</span>
              <p className="m-0 text-[1rem] font-semibold text-gray-900">
                Chưa có tin đăng loại {def.label}
              </p>
              <Link
                href="/dang-tin-dat"
                className="inline-flex h-11 items-center justify-center rounded-full
                           bg-green-700 px-7 text-sm font-semibold text-white no-underline
                           transition-all hover:bg-green-800 active:scale-[0.98]"
              >
                Đăng tin ngay
              </Link>
            </div>
          )}

          {/* ── Buyer tips ──────────────────────────────────────────── */}
          {def.tips.length > 0 && (
            <div className="mt-14 rounded-[24px] border border-green-100 bg-green-50 p-7">
              <p className="m-0 mb-4 text-[0.75rem] font-bold uppercase tracking-[0.12em]
                            text-green-600">
                Lưu ý khi mua {def.label}
              </p>
              <ul className="m-0 list-none space-y-3 p-0">
                {def.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center
                                    rounded-full bg-green-200">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                           aria-hidden="true">
                        <path d="M5 13l4 4L19 7" stroke="#1A4D2E" strokeWidth="3"
                              strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-[0.875rem] text-green-900">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Cross-type navigation ─────────────────────────────── */}
          <div className="mt-10">
            <p className="mb-3 text-[0.8125rem] font-semibold text-gray-500">
              Loại đất khác
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LAND_TYPES)
                .filter(([key]) => key !== slug)
                .map(([key, val]) => (
                  <Link
                    key={key}
                    href={`/dat-nong-nghiep/loai/${key}`}
                    className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5
                               text-[0.8125rem] font-medium text-gray-600 no-underline
                               transition-colors hover:border-green-300 hover:bg-green-50
                               hover:text-green-700"
                  >
                    {val.label}
                  </Link>
                ))}
            </div>
          </div>

          {/* ── FAQ Module ─────────────────────────────────────────── */}
          <FAQModule items={faqItems} />

          {/* ── Bottom CTA ─────────────────────────────────────────── */}
          <div className="relative mt-12 overflow-hidden rounded-[28px] bg-[#F5F5F7]
                          px-8 py-12 text-center">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64
                            rounded-full bg-green-200/50 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900">
                Bạn có {def.label} cần bán?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] text-gray-500">
                Đăng tin miễn phí, tiếp cận hàng nghìn người mua đang tìm {def.label}.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/dang-tin-dat"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full
                             bg-green-800 px-7 text-sm font-semibold text-white no-underline
                             transition-all hover:bg-green-900 active:scale-[0.98] sm:w-auto"
                >
                  Đăng tin ngay — miễn phí
                </Link>
                <Link
                  href="/dat-nong-nghiep"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full
                             border border-gray-300 bg-white/70 px-7 text-sm font-semibold
                             text-gray-700 no-underline transition-all hover:bg-white sm:w-auto"
                >
                  Xem tất cả loại đất →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
