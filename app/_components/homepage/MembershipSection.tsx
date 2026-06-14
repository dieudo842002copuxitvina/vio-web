import Link from 'next/link'

// ── Plan definitions — static pricing (launch config) ─────────────────────────

const FREE_FEATURES = [
  'Duyệt tất cả tin đăng công khai',
  'Tìm kiếm và lọc cơ bản',
  'Xem ảnh và mô tả lô đất',
  'Khám phá bản đồ giao dịch',
] as const

const PRO_FEATURES = [
  'Xem thông tin liên hệ chủ đất',
  'Lưu tin đăng yêu thích',
  'Lưu tìm kiếm & nhận thông báo',
  'Bộ lọc nâng cao (pháp lý, diện tích)',
  'Lịch sử giá theo khu vực',
  'Phân tích thị trường đất',
] as const

// ── CheckIcon ──────────────────────────────────────────────────────────────────

function CheckIcon({ inverted }: { inverted?: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      aria-hidden="true" className="mt-0.5 shrink-0"
    >
      <circle cx="8" cy="8" r="7.25"
        fill={inverted ? 'rgba(255,255,255,0.15)' : '#E8F0EB'}
        stroke="none"
      />
      <path d="M5 8l2 2 4-4"
        stroke={inverted ? '#FFFFFF' : '#1A4D2E'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

// ── MembershipSection ──────────────────────────────────────────────────────────

interface MembershipSectionProps {
  isPro: boolean
}

export function MembershipSection({ isPro }: MembershipSectionProps) {
  return (
    <section
      className="bg-[#F5F5F7] py-24 sm:py-32"
      aria-labelledby="membership-heading"
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">

        {/* Header — centered */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">
            Membership
          </p>
          <h2
            id="membership-heading"
            className="text-[32px] font-bold tracking-[-0.02em] text-[#1d1d1f] sm:text-[40px]"
          >
            Chọn gói phù hợp
          </h2>
          <p className="mt-3 text-[16px] text-[#6e6e73]">
            Dành cho nhà đầu tư, môi giới và doanh nghiệp bất động sản nông nghiệp
          </p>
        </div>

        {/* Cards: 2 cols (Free + Pro) */}
        <div className="mx-auto grid max-w-[800px] grid-cols-1 gap-5 sm:grid-cols-2">

          {/* ── Free card ──────────────────────────────────────────── */}
          <div
            className="flex flex-col rounded-[20px] border border-gray-200/70 bg-white p-8
                       shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          >
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
              Free
            </p>
            <div className="mt-3">
              <span className="text-[40px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
                Miễn phí
              </span>
            </div>
            <p className="mt-2 text-[14px] text-[#86868b]">Mãi mãi, không cần thẻ</p>

            <div className="my-7 h-px bg-neutral-100" aria-hidden="true" />

            <ul className="flex flex-1 flex-col gap-3.5 list-none m-0 p-0">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-3 text-[14px] text-[#3d3d3d]">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/dang-nhap"
              className="mt-8 flex items-center justify-center rounded-full
                         border border-vio-forest/30 py-3.5 text-[15px] font-semibold
                         text-vio-forest no-underline transition-colors hover:bg-[#E8F0EB]"
            >
              Bắt đầu miễn phí
            </Link>
          </div>

          {/* ── Pro card (highlighted) ────────────────────────────── */}
          <div
            className="relative flex flex-col rounded-[20px] bg-vio-forest p-8
                       shadow-[0_16px_48px_rgba(26,77,46,0.35)]
                       sm:-mt-3 sm:mb-3"
          >
            {/* Popular badge */}
            <span
              className="absolute right-5 top-5 rounded-full bg-white/15 px-3 py-1
                         text-[11px] font-bold text-white"
            >
              Phổ biến nhất
            </span>

            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/60">
              Pro
            </p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-[40px] font-bold tracking-[-0.02em] text-white">
                990.000 ₫
              </span>
            </div>
            <p className="mt-2 text-[14px] text-white/60">/ tháng · Hủy bất kỳ lúc nào</p>

            <div className="my-7 h-px bg-white/15" aria-hidden="true" />

            <ul className="flex flex-1 flex-col gap-3.5 list-none m-0 p-0">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-3 text-[14px] text-white/85">
                  <CheckIcon inverted />
                  {f}
                </li>
              ))}
            </ul>

            {isPro ? (
              <Link
                href="/dashboard/nang-cap"
                className="mt-8 flex items-center justify-center rounded-full bg-white
                           py-3.5 text-[15px] font-bold text-vio-forest no-underline
                           transition-colors hover:bg-[#F0F0F0]"
              >
                Quản lý gói
              </Link>
            ) : (
              <Link
                href="/pro"
                className="mt-8 flex items-center justify-center rounded-full bg-white
                           py-3.5 text-[15px] font-bold text-vio-forest no-underline
                           transition-colors hover:bg-[#F0F0F0]"
              >
                Nâng cấp Pro
              </Link>
            )}
          </div>

        </div>

        {/* Trust footnote */}
        <p className="mt-10 text-center text-[13px] text-[#86868b]">
          Thanh toán an toàn · Hủy bất kỳ lúc nào · Không tự động gia hạn
        </p>

      </div>
    </section>
  )
}
