import type { Metadata } from 'next'
import Link              from 'next/link'
import { StaticPageLayout } from '@/app/_components/StaticPageLayout'

export const metadata: Metadata = {
  title:       'Quy trình đăng tin — VIO AGRI',
  description: 'Hướng dẫn chi tiết 3 bước đăng tin đất nông nghiệp trên VIO AGRI — từ chuẩn bị hồ sơ đến kiểm duyệt và xuất bản.',
  openGraph: {
    title:       'Quy trình đăng tin đất nông nghiệp',
    description: 'Hiểu rõ 3 bước và tiêu chuẩn duyệt tin của VIO AGRI trước khi đăng.',
  },
}

// ── Steps data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    number:  '01',
    title:   'Chuẩn bị hồ sơ & Thông tin',
    color:   'bg-vio-forest',
    items: [
      'Ảnh thực tế thửa đất (tối thiểu 5 ảnh, độ phân giải ≥ 1 MP)',
      'Bản sao Giấy chứng nhận quyền sử dụng đất (sổ đỏ / sổ hồng)',
      'Trích lục bản đồ địa chính cập nhật gần nhất',
      'Thông tin chính xác: diện tích, loại đất, toạ độ, giá bán',
      'Số điện thoại liên hệ (sẽ được ẩn với người dùng miễn phí)',
    ],
  },
  {
    number:  '02',
    title:   'Điền thông tin & Gửi đăng',
    color:   'bg-vio-forest-mid',
    items: [
      'Đăng nhập tài khoản VIO AGRI (hoặc tạo mới miễn phí)',
      'Vào mục "Đăng tin mới" và điền đầy đủ form thông tin thửa đất',
      'Upload ảnh và tài liệu pháp lý đính kèm',
      'Chọn gói đăng tin: Tiêu chuẩn (miễn phí) hoặc Nổi bật (Pro)',
      'Xem trước và xác nhận nội dung tin — sau đó nhấn "Gửi duyệt"',
    ],
  },
  {
    number:  '03',
    title:   'Kiểm duyệt & Xuất bản',
    color:   'bg-vio-primary',
    items: [
      'Đội ngũ VIO AGRI kiểm tra nội dung trong vòng 24 giờ làm việc',
      'Nếu hồ sơ đầy đủ: tin được duyệt và xuất hiện trên sàn ngay lập tức',
      'Nếu thiếu thông tin: bạn nhận thông báo kèm hướng dẫn bổ sung',
      'Tin đã duyệt có thể chỉnh sửa nội dung — không cần gửi lại từ đầu',
      'Theo dõi lượt xem, leads và trạng thái tin ngay trên Dashboard',
    ],
  },
]

// ── Standards data ────────────────────────────────────────────────────────────

const DO_LIST = [
  'Ảnh chụp thực tế, rõ nét, không chỉnh sửa quá mức',
  'Thông tin diện tích khớp với giấy tờ pháp lý',
  'Giá bán thực tế — tránh ghi giá "thỏa thuận" chung chung',
  'Mô tả trung thực về hiện trạng đất và hạ tầng xung quanh',
  'Cung cấp đủ thông tin liên hệ để người mua dễ dàng tiếp cận',
]

const DONT_LIST = [
  'Đăng tin trùng lặp (cùng thửa đất nhiều lần)',
  'Sử dụng ảnh mạng hoặc không liên quan đến thửa đất',
  'Khai báo loại đất sai (ví dụ: đất rừng nhưng ghi là đất nông nghiệp)',
  'Giá bán thấp hơn nhiều so với thực tế nhằm câu view',
  'Thông tin liên hệ của bên thứ ba không có quyền giao dịch',
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuyTrinhDangTinPage() {
  return (
    <StaticPageLayout
      eyebrow="Hỗ trợ người bán"
      title="Quy trình đăng tin đất nông nghiệp"
      description="Chỉ 3 bước đơn giản để tin đăng của bạn tiếp cận hàng nghìn nhà đầu tư trên VIO AGRI."
    >

      {/* ── Steps ────────────────────────────────────────────────────── */}
      <div className="not-prose mb-14 space-y-5">
        {STEPS.map((step, i) => (
          <div
            key={step.number}
            className="flex gap-5 rounded-3xl border border-gray-100 bg-white
                       p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:p-8"
          >
            {/* Number badge */}
            <div className={`${step.color} flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl`}>
              <span className="text-[0.9375rem] font-black text-white">{step.number}</span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-[1.0625rem] font-bold text-gray-900">
                Bước {i + 1}: {step.title}
              </h3>
              <ul className="m-0 mt-4 space-y-2.5 p-0">
                {step.items.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.9375rem] text-gray-600">
                    <svg
                      width="16" height="16" viewBox="0 0 16 16"
                      fill="none" className="mt-0.5 shrink-0 text-vio-primary"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 8.5l3.5 3.5L13 4"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tiêu chuẩn duyệt tin ─────────────────────────────────────── */}
      <h2>Tiêu chuẩn kiểm duyệt của VIO AGRI</h2>
      <p>
        Chúng tôi kiểm duyệt tin đăng để đảm bảo mọi thửa đất trên sàn đều có thông tin
        chính xác, minh bạch và có thể kiểm chứng. Dưới đây là các tiêu chí bắt buộc:
      </p>

      {/* Do / Don't */}
      <div className="not-prose my-8 grid gap-5 sm:grid-cols-2">
        {/* Nên làm */}
        <div className="rounded-2xl border border-green-100 bg-green-50/60 p-6">
          <p className="mb-4 flex items-center gap-2 font-bold text-green-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Cần có trong tin đăng
          </p>
          <ul className="m-0 space-y-2.5 p-0">
            {DO_LIST.map(item => (
              <li key={item} className="flex items-start gap-2 text-[0.875rem] text-green-900">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden="true"/>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Không được */}
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-6">
          <p className="mb-4 flex items-center gap-2 font-bold text-red-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Nguyên nhân bị từ chối
          </p>
          <ul className="m-0 space-y-2.5 p-0">
            {DONT_LIST.map(item => (
              <li key={item} className="flex items-start gap-2 text-[0.875rem] text-red-900">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-hidden="true"/>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Thời gian duyệt ──────────────────────────────────────────── */}
      <h2>Thời gian xử lý</h2>
      <p>
        Đội ngũ kiểm duyệt VIO AGRI làm việc từ <strong>8:00 — 18:00 thứ Hai đến thứ Sáu</strong>
        {' '}và <strong>8:00 — 12:00 thứ Bảy</strong>. Tin được gửi ngoài giờ sẽ được xét duyệt
        vào đầu ngày làm việc kế tiếp. Trong mùa cao điểm (Tết, cuối quý), thời gian duyệt có
        thể kéo dài đến 48 giờ.
      </p>
      <p>
        Nếu tin đăng của bạn cần bổ sung tài liệu, bạn sẽ nhận thông báo qua email và SMS —
        không cần tạo lại tin từ đầu, chỉ cần cập nhật và gửi lại.
      </p>

      {/* CTA */}
      <div className="not-prose mt-12 flex flex-wrap gap-3">
        <Link
          href="/dashboard/listings/new"
          className="inline-flex items-center rounded-full bg-vio-forest px-6 py-3
                     text-[0.9375rem] font-bold text-white no-underline hover:opacity-90"
        >
          Bắt đầu đăng tin →
        </Link>
        <Link
          href="/xac-minh-phap-ly"
          className="inline-flex items-center rounded-full border border-gray-200 bg-white
                     px-6 py-3 text-[0.9375rem] font-semibold text-gray-700
                     no-underline hover:bg-gray-50"
        >
          Tìm hiểu xác minh pháp lý
        </Link>
      </div>

    </StaticPageLayout>
  )
}
