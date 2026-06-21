import type { Metadata } from 'next'
import Link              from 'next/link'
import { StaticPageLayout } from '@/app/_components/StaticPageLayout'

export const metadata: Metadata = {
  title:       'Xác minh pháp lý — VIO AGRI',
  description: 'Tìm hiểu ý nghĩa của các huy hiệu xác minh trên VIO AGRI: Đã xác minh sổ đỏ, Đã kiểm tra quy hoạch, và cam kết minh bạch trong giao dịch đất nông nghiệp.',
  openGraph: {
    title:       'Xác minh pháp lý tại VIO AGRI',
    description: 'Cam kết minh bạch — mỗi huy hiệu là một lời đảm bảo có thể kiểm chứng.',
  },
}

// ── Badges data ───────────────────────────────────────────────────────────────

const BADGES = [
  {
    icon:   '📋',
    title:  'Đã xác minh sổ đỏ / sổ hồng',
    color:  'border-emerald-200 bg-emerald-50',
    badge:  'bg-emerald-100 text-emerald-800',
    description: 'Tin đăng có huy hiệu này đã cung cấp bản sao Giấy chứng nhận quyền sử dụng đất (GCNQSDĐ) còn hiệu lực, khớp với thông tin chủ sở hữu đang đăng bán. Đội ngũ pháp lý nội bộ VIO AGRI đã đối chiếu số thửa, số tờ bản đồ và diện tích với dữ liệu công khai.',
    note: 'Lưu ý: Xác minh sổ đỏ không thay thế công chứng hợp đồng. Người mua vẫn cần thực hiện tra cứu độc lập tại Văn phòng đăng ký đất đai trước khi ký hợp đồng chuyển nhượng.',
  },
  {
    icon:   '🗺️',
    title:  'Đã kiểm tra quy hoạch',
    color:  'border-blue-200 bg-blue-50',
    badge:  'bg-blue-100 text-blue-800',
    description: 'Huy hiệu này xác nhận rằng tọa độ thửa đất đã được đối chiếu với bản đồ quy hoạch sử dụng đất cấp huyện/tỉnh được cập nhật gần nhất. Kết quả cho thấy thửa đất không nằm trong vùng quy hoạch chuyển đổi mục đích, thu hồi đất hoặc hành lang bảo vệ công trình.',
    note: 'Lưu ý: Quy hoạch có thể thay đổi theo các quyết định hành chính mới nhất. Người mua nên yêu cầu trích lục bản đồ cập nhật tại UBND xã/huyện trước khi ký hợp đồng.',
  },
  {
    icon:   '👤',
    title:  'Chủ đất đã xác minh danh tính',
    color:  'border-violet-200 bg-violet-50',
    badge:  'bg-violet-100 text-violet-800',
    description: 'Chủ đăng tin đã xác minh danh tính qua CCCD/CMND và selfie trực tiếp. Thông tin chủ sở hữu trong GCNQSDĐ khớp với người đang rao bán. Huy hiệu này giúp người mua tránh các trường hợp môi giới không có thẩm quyền giao dịch.',
    note: null,
  },
]

// ── Process steps ─────────────────────────────────────────────────────────────

const PROCESS = [
  {
    step: '1',
    title: 'Người bán nộp hồ sơ',
    desc:  'Upload bản sao sổ đỏ, trích lục bản đồ và CCCD qua cổng bảo mật của VIO AGRI.',
  },
  {
    step: '2',
    title: 'Kiểm tra kỹ thuật',
    desc:  'Hệ thống OCR trích xuất thông tin, đối chiếu với cơ sở dữ liệu quy hoạch và lịch sử giao dịch.',
  },
  {
    step: '3',
    title: 'Thẩm định thủ công',
    desc:  'Chuyên viên pháp lý VIO AGRI xem xét lại các trường hợp có dấu hiệu bất thường hoặc tài liệu không rõ ràng.',
  },
  {
    step: '4',
    title: 'Gắn huy hiệu & Xuất bản',
    desc:  'Tin đăng được gắn đúng huy hiệu tương ứng. Mọi thay đổi thông tin sau đó sẽ yêu cầu xác minh lại.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function XacMinhPhapLyPage() {
  return (
    <StaticPageLayout
      eyebrow="Minh bạch & An toàn"
      title="Xác minh pháp lý trên VIO AGRI"
      description="Mỗi huy hiệu là một cam kết có thể kiểm chứng — không phải chỉ là nhãn dán."
    >

      {/* ── Giới thiệu ───────────────────────────────────────────────── */}
      <p>
        Một trong những rủi ro lớn nhất khi mua bán đất nông nghiệp là thông tin pháp lý không
        đáng tin cậy: sổ đỏ giả, đất đang tranh chấp, hoặc nằm trong vùng quy hoạch thu hồi.
        VIO AGRI ra đời để giải quyết vấn đề này bằng hệ thống xác minh nhiều lớp, áp dụng
        cho mọi tin đăng trước khi được phép xuất hiện trên sàn.
      </p>
      <p>
        Kết quả xác minh được thể hiện qua các <strong>huy hiệu (badges)</strong> gắn trực tiếp
        lên tin đăng — minh bạch, dễ hiểu và có thể truy vết.
      </p>

      {/* ── Badges ───────────────────────────────────────────────────── */}
      <h2>Ý nghĩa các huy hiệu xác minh</h2>

      <div className="not-prose space-y-5">
        {BADGES.map(badge => (
          <div
            key={badge.title}
            className={`rounded-3xl border p-6 sm:p-8 ${badge.color}`}
          >
            <div className="flex flex-wrap items-start gap-4">
              <span className="text-3xl">{badge.icon}</span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="m-0 text-[1.0625rem] font-bold text-gray-900">
                    {badge.title}
                  </h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.badge}`}>
                    Đã xác minh
                  </span>
                </div>
                <p className="m-0 mt-3 text-[0.9375rem] leading-relaxed text-gray-700">
                  {badge.description}
                </p>
                {badge.note && (
                  <p className="m-0 mt-3 rounded-xl bg-white/60 px-4 py-3 text-[0.8125rem]
                                leading-relaxed text-gray-600 italic">
                    ⚠️ {badge.note}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quy trình ────────────────────────────────────────────────── */}
      <h2>Quy trình xác minh hoạt động như thế nào?</h2>

      <div className="not-prose my-8">
        <ol className="m-0 space-y-4 p-0">
          {PROCESS.map((p, i) => (
            <li key={p.step} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center
                              rounded-2xl bg-vio-forest text-sm font-black text-white">
                {p.step}
              </div>
              <div className="flex-1 pb-4">
                {i < PROCESS.length - 1 && (
                  <div className="absolute ml-5 mt-10 h-full w-px bg-gray-100"
                       aria-hidden="true"/>
                )}
                <p className="m-0 font-bold text-gray-900">{p.title}</p>
                <p className="m-0 mt-1 text-[0.9375rem] text-gray-600">{p.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Bảo mật dữ liệu ──────────────────────────────────────────── */}
      <h2>Bảo mật thông tin người bán</h2>
      <p>
        Mọi tài liệu pháp lý do người bán cung cấp đều được lưu trữ theo chuẩn mã hóa AES-256,
        chỉ truy cập được bởi đội ngũ xác minh có thẩm quyền. VIO AGRI <strong>không chia sẻ</strong>
        {' '}bản sao tài liệu pháp lý với bên thứ ba, kể cả người mua tiềm năng, trừ khi người bán
        đồng ý rõ ràng trong quá trình giao dịch.
      </p>
      <p>
        Sau khi giao dịch hoàn tất hoặc tin đăng bị gỡ, tài liệu gốc được xóa khỏi hệ thống trong
        vòng 90 ngày theo chính sách bảo mật dữ liệu của VIO AGRI.
      </p>

      {/* ── Cam kết ──────────────────────────────────────────────────── */}
      <blockquote>
        <strong>Cam kết của VIO AGRI:</strong> Nếu một tin đăng có huy hiệu xác minh nhưng thông
        tin pháp lý sau đó được phát hiện là sai lệch do lỗi của quy trình kiểm duyệt nội bộ,
        VIO AGRI sẽ hỗ trợ người mua toàn bộ chi phí pháp lý phát sinh liên quan đến việc
        xử lý sai phạm đó.
      </blockquote>

      {/* CTA */}
      <div className="not-prose mt-12 flex flex-wrap gap-3">
        <Link
          href="/dat-nong-nghiep"
          className="inline-flex items-center rounded-full bg-vio-forest px-6 py-3
                     text-[0.9375rem] font-bold text-white no-underline hover:opacity-90"
        >
          Khám phá đất đã xác minh →
        </Link>
        <Link
          href="/lien-he"
          className="inline-flex items-center rounded-full border border-gray-200 bg-white
                     px-6 py-3 text-[0.9375rem] font-semibold text-gray-700
                     no-underline hover:bg-gray-50"
        >
          Báo cáo sai sót
        </Link>
      </div>

    </StaticPageLayout>
  )
}
