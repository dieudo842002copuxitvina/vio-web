'use client'

import { useState } from 'react'

const ITEMS = [
  {
    q: 'Tôi có thể hủy bất kỳ lúc nào không?',
    a: 'Có. Bạn có thể hủy gói Pro bất cứ lúc nào từ trang cài đặt tài khoản. Sau khi hủy, quyền truy cập Pro vẫn còn hiệu lực đến hết chu kỳ thanh toán hiện tại.',
  },
  {
    q: 'Thanh toán bằng phương thức nào?',
    a: 'VIO AGRI hỗ trợ thanh toán qua thẻ Visa/Mastercard, chuyển khoản ngân hàng, và ví điện tử (MoMo, ZaloPay). Tất cả giao dịch được mã hóa và bảo mật.',
  },
  {
    q: 'Tôi có được hoàn tiền nếu không hài lòng?',
    a: 'Chúng tôi hoàn tiền trong vòng 7 ngày kể từ ngày đăng ký nếu bạn chưa sử dụng tính năng liên hệ. Liên hệ đội ngũ hỗ trợ để được xử lý.',
  },
]

export function PricingFaq() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="mx-auto max-w-[640px] divide-y divide-neutral-100">
      {ITEMS.map((item, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-start justify-between gap-4 py-5 text-left
                       transition-colors hover:text-vio-forest"
          >
            <span className="text-[16px] font-semibold leading-snug text-[#1d1d1f]">
              {item.q}
            </span>
            <span
              className={[
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                'border border-neutral-200 transition-all duration-200',
                open === i ? 'bg-vio-forest border-vio-forest text-white' : 'text-neutral-400',
              ].join(' ')}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
                   className={open === i ? 'rotate-45 transition-transform duration-200' : 'transition-transform duration-200'}>
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
          </button>

          {open === i && (
            <p className="m-0 pb-5 text-[14px] leading-relaxed text-neutral-500">
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
