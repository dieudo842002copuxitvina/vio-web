// Shared FAQ generation for programmatic SEO pages.
// All functions return FaqItem[] for use with faqPageSchema() from lib/seo/schema.ts
// and for rendering a collapsible FAQ section.

export interface FaqItem {
  question: string
  answer:   string
}

// ── Province FAQ ───────────────────────────────────────────────────────────────

export function buildProvinceFAQ(
  provinceName:     string,
  provinceNameFull: string,
): FaqItem[] {
  return [
    {
      question: `Giá đất nông nghiệp tại ${provinceName} hiện nay là bao nhiêu?`,
      answer:   `Giá đất nông nghiệp tại ${provinceNameFull} dao động tùy loại đất và vị trí. Đất lúa vùng đồng bằng thường từ 300–800 triệu/1.000m². Đất vườn cây ăn trái có thể từ 500 triệu đến vài tỷ đồng/1.000m² tùy giống cây và năng suất. Xem danh sách tin đăng cập nhật trên VIO AGRI để có giá thực tế theo từng khu vực.`,
    },
    {
      question: `Mua đất nông nghiệp tại ${provinceName} cần giấy tờ gì?`,
      answer:   `Khi mua đất nông nghiệp tại ${provinceName}, bạn cần: (1) Sổ đỏ hoặc Sổ hồng hợp lệ của người bán, (2) Giấy CMND/CCCD hai bên, (3) Hợp đồng chuyển nhượng quyền sử dụng đất có công chứng, (4) Tờ khai thuế thu nhập cá nhân và lệ phí trước bạ. Nên thuê luật sư địa phương kiểm tra quy hoạch trước khi ký hợp đồng.`,
    },
    {
      question: `Đất nông nghiệp tại ${provinceName} có chuyển mục đích sử dụng được không?`,
      answer:   `Việc chuyển mục đích sử dụng đất nông nghiệp tại ${provinceName} phụ thuộc vào quy hoạch sử dụng đất của địa phương và phê duyệt của UBND cấp tỉnh/huyện. Đất nằm trong khu vực quy hoạch đô thị hoặc đất lúa được bảo vệ thường không được phép chuyển đổi. Cần tra cứu quy hoạch tại Phòng Tài nguyên & Môi trường địa phương.`,
    },
    {
      question: `Có nên đầu tư đất nông nghiệp tại ${provinceName} không?`,
      answer:   `${provinceName} có tiềm năng nông nghiệp đặc thù theo từng vùng. Nhà đầu tư nên xem xét: khả năng canh tác thực tế (loại cây phù hợp, nguồn nước, khí hậu), tính thanh khoản của bất động sản trong vùng, và xu hướng quy hoạch trong 5–10 năm tới. Đất gần khu công nghiệp nông nghiệp hoặc vùng chuyên canh xuất khẩu có xu hướng tăng giá tốt hơn.`,
    },
    {
      question: `Làm sao để xác minh tính pháp lý đất nông nghiệp tại ${provinceName}?`,
      answer:   `Để xác minh pháp lý đất nông nghiệp tại ${provinceName}: (1) Yêu cầu bản gốc sổ đỏ/sổ hồng và kiểm tra tại Văn phòng Đăng ký Đất đai cấp huyện, (2) Kiểm tra xem đất có đang thế chấp ngân hàng không, (3) Tra cứu quy hoạch sử dụng đất tại UBND xã/huyện, (4) Xem bản đồ địa chính để xác nhận ranh giới thực địa. VIO AGRI chỉ hiển thị tin đăng có xác thực pháp lý.`,
    },
    {
      question: `Tìm đất nông nghiệp uy tín tại ${provinceName} ở đâu?`,
      answer:   `VIO AGRI là nền tảng giao dịch đất nông nghiệp chuyên biệt, tổng hợp tin đăng từ chủ đất và đại lý được xác minh tại ${provinceNameFull}. Mỗi tin đăng được kiểm duyệt pháp lý và cung cấp thông tin thực địa chi tiết. Bạn cũng có thể đặt yêu cầu kiểm tra pháp lý chuyên sâu từ đội ngũ luật sư của VIO.`,
    },
  ]
}

// ── District FAQ ───────────────────────────────────────────────────────────────

export function buildDistrictFAQ(
  districtName: string,
  provinceName: string,
): FaqItem[] {
  return [
    {
      question: `Giá đất nông nghiệp tại ${districtName}, ${provinceName} là bao nhiêu?`,
      answer:   `Giá đất nông nghiệp tại ${districtName} (${provinceName}) thay đổi theo vị trí, loại đất và pháp lý. Đất có sổ đỏ, gần đường, có nguồn nước thường có giá cao hơn 30–50% so với đất chưa có giấy tờ. Xem các tin đăng cập nhật trên VIO AGRI để nắm giá thực tế tại ${districtName}.`,
    },
    {
      question: `Đất nông nghiệp tại ${districtName} thích hợp trồng cây gì?`,
      answer:   `Loại cây phù hợp tại ${districtName} phụ thuộc vào đặc điểm thổ nhưỡng và nguồn nước của từng thửa đất. VIO AGRI cung cấp thông tin loại đất (đất phù sa, đất đỏ bazan, đất cát…) và nguồn nước trên từng tin đăng, giúp bạn đánh giá tiềm năng canh tác trước khi xem thực địa.`,
    },
    {
      question: `Mua đất nông nghiệp tại ${districtName} cần lưu ý gì về quy hoạch?`,
      answer:   `Trước khi mua đất tại ${districtName}, cần kiểm tra: (1) Quy hoạch sử dụng đất cấp huyện tại UBND ${districtName}, (2) Đất có nằm trong hành lang bảo vệ sông, kênh mương không, (3) Đất có thuộc vùng đất lúa cần bảo vệ (không được chuyển mục đích) không. Phòng Tài nguyên & Môi trường ${districtName} có thể cung cấp thông tin này.`,
    },
    {
      question: `Thủ tục chuyển nhượng đất nông nghiệp tại ${districtName} mất bao lâu?`,
      answer:   `Thủ tục chuyển nhượng quyền sử dụng đất nông nghiệp tại ${districtName}, ${provinceName} thường mất 15–30 ngày làm việc: gồm công chứng hợp đồng (1–3 ngày), khai thuế thu nhập cá nhân và lệ phí trước bạ (5–10 ngày), cập nhật biến động tại Văn phòng Đăng ký Đất đai cấp huyện (7–15 ngày).`,
    },
    {
      question: `VIO AGRI có tin đăng đất nông nghiệp tại ${districtName} không?`,
      answer:   `Có, VIO AGRI tổng hợp tin đăng đất nông nghiệp đã qua kiểm duyệt tại ${districtName}, ${provinceName}. Mỗi tin đăng có thông tin chi tiết về diện tích, giá, pháp lý, cơ sở hạ tầng và ảnh thực địa. Bạn có thể lọc theo loại đất, mức giá và tình trạng pháp lý để tìm thửa đất phù hợp.`,
    },
  ]
}

// ── Land Type FAQ ──────────────────────────────────────────────────────────────

export function buildLandTypeFAQ(
  typeLabel:    string,   // e.g. 'Đất lúa', 'Cây ăn trái'
  locationName: string,   // province or district name
): FaqItem[] {
  return [
    {
      question: `Giá ${typeLabel} tại ${locationName} hiện nay là bao nhiêu?`,
      answer:   `Giá ${typeLabel} tại ${locationName} phụ thuộc vào vị trí, diện tích, pháp lý và cơ sở hạ tầng của từng thửa. Đất có sổ đỏ, đường vào, nguồn nước ổn định thường có giá cao hơn. Xem danh sách tin đăng ${typeLabel} tại ${locationName} trên VIO AGRI để nắm giá thị trường hiện tại.`,
    },
    {
      question: `${typeLabel} tại ${locationName} có những loại cây nào phù hợp?`,
      answer:   `Mỗi loại đất nông nghiệp tại ${locationName} có đặc điểm thổ nhưỡng và nguồn nước khác nhau, ảnh hưởng đến loại cây phù hợp. VIO AGRI hiển thị thông tin loại đất (đất phù sa, đất đỏ bazan, đất cát…), độ pH, và nguồn nước trên từng tin đăng để giúp bạn đánh giá tiềm năng canh tác.`,
    },
    {
      question: `Pháp lý ${typeLabel} tại ${locationName} có những loại giấy tờ gì?`,
      answer:   `${typeLabel} tại ${locationName} thường có các loại giấy tờ: Sổ đỏ (GCNQSDĐ), Sổ hồng, hợp đồng chuyển nhượng hoặc đang chờ hoàn thiện. Ưu tiên mua đất có sổ đỏ đầy đủ, đã qua đo đạc địa chính để tránh tranh chấp. VIO AGRI lọc theo tình trạng pháp lý để bạn dễ tìm kiếm.`,
    },
    {
      question: `Đầu tư ${typeLabel} tại ${locationName} có tiềm năng không?`,
      answer:   `Tiềm năng đầu tư ${typeLabel} tại ${locationName} phụ thuộc vào định hướng quy hoạch nông nghiệp địa phương, hạ tầng thủy lợi, và thị trường đầu ra cho nông sản. Vùng nằm trong quy hoạch nông nghiệp công nghệ cao hoặc vùng chuyên canh xuất khẩu thường có giá trị đầu tư dài hạn tốt hơn.`,
    },
    {
      question: `Mua ${typeLabel} tại ${locationName} cần kiểm tra những gì?`,
      answer:   `Khi mua ${typeLabel} tại ${locationName}, cần kiểm tra: (1) Pháp lý: sổ đỏ/sổ hồng, không thế chấp, không tranh chấp, (2) Quy hoạch: không nằm trong vùng giải toả hoặc bảo vệ đất lúa, (3) Hạ tầng: đường vào, nguồn nước, điện, (4) Thực địa: đo đạc, ranh giới thực tế khớp với giấy tờ. VIO AGRI cung cấp dịch vụ kiểm tra pháp lý chuyên nghiệp.`,
    },
  ]
}
