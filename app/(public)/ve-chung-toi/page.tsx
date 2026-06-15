import type { Metadata } from 'next'
import Link              from 'next/link'
import { StaticPageLayout } from '@/app/_components/StaticPageLayout'

export const metadata: Metadata = {
  title:       'Về VIO AGRI — Sứ mệnh & Tầm nhìn',
  description: 'VIO AGRI là nền tảng giao dịch đất nông nghiệp đầu tiên tại Việt Nam, kết nối nhà đầu tư với chủ đất uy tín thông qua hệ sinh thái O2O Nông nghiệp.',
  openGraph: {
    title:       'Về VIO AGRI',
    description: 'Số hóa thị trường đất nông nghiệp Việt Nam — từ giao dịch đến canh tác bền vững.',
  },
}

// ── Stat strip ────────────────────────────────────────────────────────────────

const STATS = [
  { value: '12.000+', label: 'Tin đăng đất nông nghiệp'  },
  { value: '63',      label: 'Tỉnh thành phủ sóng'        },
  { value: '4.500+',  label: 'Nhà đầu tư tin dùng'        },
  { value: '98%',     label: 'Giao dịch có xác minh pháp lý' },
]

// ── Pillars ───────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: '🌾',
    title: 'VIO AGRI',
    desc:  'Sàn giao dịch đất nông nghiệp — tìm kiếm, đăng tin, đàm phán và ký kết trực tuyến.',
  },
  {
    icon: '🛒',
    title: 'VIO LOCAL',
    desc:  'Cầu nối tiêu thụ nông sản nội địa — kết nối vùng trồng với chuỗi phân phối và bán lẻ hiện đại.',
  },
  {
    icon: '🚢',
    title: 'VIO EXPORT',
    desc:  'Cổng xuất khẩu nông sản — hỗ trợ pháp lý, logistics và tiếp cận thị trường quốc tế.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VeChungToiPage() {
  return (
    <StaticPageLayout
      eyebrow="Về chúng tôi"
      title="Xây dựng hệ sinh thái nông nghiệp số cho Việt Nam"
      description="Từ giao dịch đất đai đến canh tác bền vững — VIO AGRI kết nối mọi mắt xích trong chuỗi giá trị nông nghiệp."
    >

      {/* Stat strip — dùng not-prose để thoát khỏi prose margin */}
      <div className="not-prose mb-14">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map(s => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-100 bg-white p-5
                         text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            >
              <dt className="text-[2rem] font-black tracking-tight text-vio-forest">
                {s.value}
              </dt>
              <dd className="mt-1 text-[0.8125rem] text-gray-500">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Sứ mệnh ─────────────────────────────────────────────────────── */}
      <h2>Sứ mệnh của VIO AGRI</h2>
      <p>
        Thị trường đất nông nghiệp Việt Nam có quy mô hàng trăm nghìn giao dịch mỗi năm, nhưng
        vẫn đang hoạt động theo cách truyền thống — thiếu minh bạch, rủi ro pháp lý cao và
        thông tin không đối xứng giữa người mua và người bán. <strong>VIO AGRI ra đời để
        thay đổi điều đó.</strong>
      </p>
      <p>
        Chúng tôi xây dựng nền tảng nơi mọi thửa đất đều được số hóa, mọi giao dịch đều có
        lịch sử kiểm chứng, và mọi nhà đầu tư — từ cá nhân đến doanh nghiệp — đều có thể
        tìm kiếm, đánh giá và giao dịch với sự tự tin hoàn toàn.
      </p>

      {/* ── Tầm nhìn O2O ─────────────────────────────────────────────────── */}
      <h2>Tầm nhìn O2O Nông nghiệp</h2>
      <p>
        VIO AGRI không dừng lại ở giao dịch đất đai. Chúng tôi đang xây dựng một hệ sinh thái
        <strong> Online-to-Offline (O2O) </strong> toàn diện, kết nối đất đai với canh tác,
        sản xuất với tiêu thụ, và thị trường nội địa với chuỗi xuất khẩu quốc tế.
      </p>

      {/* Pillars — not-prose grid */}
      <div className="not-prose my-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {PILLARS.map(p => (
            <div
              key={p.title}
              className="rounded-2xl border border-gray-100 bg-white p-6
                         shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            >
              <div className="mb-3 text-3xl">{p.icon}</div>
              <h3 className="m-0 text-[1rem] font-bold text-gray-900">{p.title}</h3>
              <p className="m-0 mt-2 text-[0.875rem] leading-relaxed text-gray-500">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tại sao tin tưởng ────────────────────────────────────────────── */}
      <h2>Tại sao chọn VIO AGRI?</h2>
      <ul>
        <li>
          <strong>Xác minh pháp lý độc lập:</strong> Mỗi tin đăng được đội ngũ pháp lý nội bộ
          và đối tác công chứng kiểm tra trước khi hiển thị huy hiệu &ldquo;Đã xác minh&rdquo;.
        </li>
        <li>
          <strong>Dữ liệu quy hoạch cập nhật:</strong> Tích hợp bản đồ quy hoạch từ Bộ Tài nguyên
          và Môi trường, giúp nhà đầu tư nhận biết ngay tình trạng đất trước khi giao dịch.
        </li>
        <li>
          <strong>Định giá thông minh:</strong> Thuật toán phân tích giá thị trường từ lịch sử
          giao dịch thực tế, cho phép người bán định giá chính xác và người mua thương lượng
          dựa trên dữ liệu.
        </li>
        <li>
          <strong>Hỗ trợ toàn diện:</strong> Từ đăng tin đến ký hợp đồng, đội ngũ VIO AGRI
          đồng hành cùng mỗi giao dịch để đảm bảo an toàn và nhanh chóng.
        </li>
      </ul>

      {/* ── Đội ngũ ──────────────────────────────────────────────────────── */}
      <h2>Đội ngũ sáng lập</h2>
      <p>
        VIO AGRI được thành lập bởi những người có kinh nghiệm sâu trong lĩnh vực bất động sản
        nông nghiệp, công nghệ và tài chính. Chúng tôi chia sẻ niềm tin rằng nông nghiệp Việt Nam
        xứng đáng có một hạ tầng giao dịch hiện đại ngang tầm với các thị trường bất động sản
        phát triển nhất khu vực.
      </p>
      <p>
        Đội ngũ hiện tại gồm hơn 30 thành viên tại Hà Nội, TP. Hồ Chí Minh và Đà Lạt — những
        trung tâm của thị trường đất nông nghiệp phía Nam và Tây Nguyên.
      </p>

      {/* CTA */}
      <div className="not-prose mt-12 flex flex-wrap gap-3">
        <Link
          href="/dat-nong-nghiep"
          className="inline-flex items-center rounded-full bg-vio-forest px-6 py-3
                     text-[0.9375rem] font-bold text-white no-underline hover:opacity-90"
        >
          Khám phá đất ngay →
        </Link>
        <Link
          href="/lien-he"
          className="inline-flex items-center rounded-full border border-gray-200 bg-white
                     px-6 py-3 text-[0.9375rem] font-semibold text-gray-700
                     no-underline hover:bg-gray-50"
        >
          Liên hệ với chúng tôi
        </Link>
      </div>

    </StaticPageLayout>
  )
}
