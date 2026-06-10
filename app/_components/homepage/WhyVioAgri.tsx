import type { ReactNode } from 'react'

// ── Benefit items ─────────────────────────────────────────────────────────────
// Every claim is specific and verifiable — no vague language.

const BENEFITS = [
  {
    id:    'verified',
    stat:  '12 bước',
    title: 'Xác minh qua quy trình 12 bước',
    body:  'Mỗi lô đất đăng trên VIO AGRI đều trải qua 12 bước kiểm tra: từ giấy tờ pháp lý, tọa độ thực địa, đến lịch sử tranh chấp.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="#1A4D2E" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4"
              stroke="#1A4D2E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id:    'legal',
    stat:  'Sổ đỏ / Sổ hồng',
    title: 'Pháp lý hiển thị ngay trên tin',
    body:  'Trạng thái sổ đỏ, sổ hồng, đang chuyển mục đích sử dụng — được hiển thị rõ ràng trên từng lô đất, không cần hỏi thêm.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke="#1A4D2E" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M14 2v6h6M9 13h6M9 17h4"
              stroke="#1A4D2E" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id:    'agents',
    stat:  '320+ người bán',
    title: '320+ người bán được xác thực danh tính',
    body:  'Không có tin rao từ tài khoản ẩn danh. Mỗi người đăng tin đều được xác thực CCCD và xếp hạng tín nhiệm bởi VIO.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="4" stroke="#1A4D2E" strokeWidth="1.75" />
        <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
              stroke="#1A4D2E" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M16 3.5l1.5 1.5L21 2"
              stroke="#1A4D2E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id:    'transaction',
    stat:  'Từ tìm → ký hợp đồng',
    title: 'Hỗ trợ toàn bộ hành trình mua đất',
    body:  'Đặt lịch xem đất trực tiếp từ ứng dụng, nhắn tin với chủ đất, tra cứu giá thị trường và nhận tư vấn pháp lý trong một nơi.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16 3h5v5M21 3l-7 7"
              stroke="#1A4D2E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 21H3v-5M3 21l7-7"
              stroke="#1A4D2E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 10V3h7M21 14v7h-7"
              stroke="#1A4D2E" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
] as const

// ── BenefitItem ────────────────────────────────────────────────────────────────

function BenefitItem({
  stat, title, body, icon,
}: { stat: string; title: string; body: string; icon: ReactNode }) {
  return (
    <div className="flex flex-col">
      {/* Icon container */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#E8F0EB]"
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Stat pill */}
      <div className="mt-5">
        <span className="rounded-full bg-[#F0F6F2] px-3 py-1 text-[12px] font-bold text-[#1A4D2E]">
          {stat}
        </span>
      </div>

      {/* Text */}
      <h3 className="mt-3 text-[19px] font-bold leading-tight tracking-[-0.01em] text-[#1d1d1f]">
        {title}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">
        {body}
      </p>
    </div>
  )
}

// ── WhyVioAgri ─────────────────────────────────────────────────────────────────

export function WhyVioAgri() {
  return (
    <section
      className="mx-auto max-w-[1280px] px-4 py-24 sm:px-8 sm:py-32"
      aria-labelledby="why-heading"
    >
      {/* Header — left-aligned (Airbnb / Land.com pattern) */}
      <div className="mb-16 max-w-[560px]">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">
          Tại sao VIO AGRI
        </p>
        <h2
          id="why-heading"
          className="text-[32px] font-bold tracking-[-0.02em] text-[#1d1d1f] sm:text-[40px]"
        >
          Được xây dựng cho
          <br />
          nhà đầu tư nghiêm túc
        </h2>
      </div>

      {/* 2 × 2 grid */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-14 sm:grid-cols-2 lg:gap-x-20 lg:gap-y-16">
        {BENEFITS.map(b => (
          <BenefitItem key={b.id} stat={b.stat} title={b.title} body={b.body} icon={b.icon} />
        ))}
      </div>
    </section>
  )
}
