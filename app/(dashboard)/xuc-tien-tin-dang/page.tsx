import type { Metadata }  from 'next'
import Link               from 'next/link'
import { createClient }   from '@/lib/supabase/server'
import { getActiveSubscription } from '@/features/billing/api/subscription.server'
import { getMerchantInsights }   from '@/features/merchant/api/merchant-insights.server'
import { BoostCheckoutButton }   from './_components/BoostCheckoutButton'

export const metadata: Metadata = { title: 'Xúc tiến tin đăng — VIO AGRI' }
export const revalidate = 0

// ── Promote tiers ─────────────────────────────────────────────────────────────

const PROMOTE_TIERS = [
  {
    id:       'boost_7',
    label:    'Boost 7 ngày',
    price:    '99.000 ₫',
    priceVnd: 99_000,
    period:   '7 ngày',
    badge:    null,
    features: [
      'Hiển thị ưu tiên trong kết quả tìm kiếm',
      'Badge "Nổi bật" trên thẻ tin',
      'Xuất hiện đầu trang danh mục tỉnh',
      'Thống kê lượt xem tăng trung bình 3×',
    ],
    cta:    'Boost tin',
    accent: false,
  },
  {
    id:       'boost_30',
    label:    'Boost 30 ngày',
    price:    '299.000 ₫',
    priceVnd: 299_000,
    period:   '30 ngày',
    badge:    'Phổ biến nhất',
    features: [
      'Tất cả tính năng Boost 7 ngày',
      'Xuất hiện trong mục "Đề xuất hôm nay"',
      'Push notification đến người dùng phù hợp',
      'Thống kê chi tiết: nguồn traffic, hành vi',
      'Huy hiệu "Top" màu vàng đặc biệt',
    ],
    cta:    'Boost 30 ngày',
    accent: true,
  },
  {
    id:       'spotlight',
    label:    'Spotlight',
    price:    '599.000 ₫',
    priceVnd: 599_000,
    period:   '30 ngày',
    badge:    'Premium',
    features: [
      'Tất cả tính năng Boost 30 ngày',
      'Vị trí số 1 trang chủ VIO AGRI',
      'Featured trong email tuần gửi đến 10.000+ người mua',
      'Social sharing tự động lên Facebook Page VIO AGRI',
      'Huy hiệu "Spotlight" độc quyền',
      'Báo cáo ROI cá nhân hoá cuối chiến dịch',
    ],
    cta:    'Chọn Spotlight',
    accent: false,
  },
]

// ── Promote Tier Card ─────────────────────────────────────────────────────────

function PromoteTierCard({
  tier,
  listingId,
  isPro,
}: {
  tier:      typeof PROMOTE_TIERS[number]
  listingId: string | null
  isPro:     boolean
}) {
  return (
    <div className={[
      'relative overflow-hidden rounded-3xl border',
      tier.accent
        ? 'border-green-600 bg-gray-900 text-white shadow-[0_8px_40px_rgba(26,77,46,0.2)]'
        : 'border-gray-200 bg-white',
    ].join(' ')}>
      {tier.badge && (
        <div className={[
          'absolute right-4 top-4 rounded-full px-3 py-1 text-[0.6875rem] font-bold',
          tier.accent
            ? 'bg-white/15 text-white'
            : tier.badge === 'Premium'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-green-100 text-green-700',
        ].join(' ')}>
          {tier.badge}
        </div>
      )}

      <div className="px-6 pt-6 pb-5">
        <p className={[
          'text-[0.75rem] font-bold uppercase tracking-[0.12em]',
          tier.accent ? 'text-white/50' : 'text-gray-400',
        ].join(' ')}>
          {tier.label}
        </p>
        <div className="mt-3 flex items-end gap-1.5">
          <span className={[
            'text-[2.25rem] font-black leading-none',
            tier.accent ? 'text-white' : 'text-gray-900',
          ].join(' ')}>
            {tier.price}
          </span>
          <span className={[
            'mb-1.5 text-[0.875rem]',
            tier.accent ? 'text-white/50' : 'text-gray-400',
          ].join(' ')}>
            / {tier.period}
          </span>
        </div>
      </div>

      <div className={['mx-6 h-px', tier.accent ? 'bg-white/10' : 'bg-gray-100'].join(' ')} />

      <ul className="m-0 list-none px-6 py-5 space-y-2.5 p-0">
        {tier.features.map(f => (
          <li key={f} className="flex items-start gap-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 className={['mt-0.5 shrink-0', tier.accent ? 'text-emerald-400' : 'text-green-600'].join(' ')}
                 aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={['text-[0.875rem]', tier.accent ? 'text-white/85' : 'text-gray-700'].join(' ')}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      <div className={[
        'px-6 pb-6',
        tier.accent ? '' : 'border-t border-gray-100 pt-5',
      ].join(' ')}>
        {!isPro && tier.id !== 'boost_7' ? (
          <div className="space-y-2">
            <Link
              href="/nang-cap?reason=promote"
              className={[
                'flex h-11 w-full items-center justify-center rounded-full text-[0.9375rem] font-bold no-underline transition-opacity hover:opacity-80',
                tier.accent
                  ? 'bg-white text-gray-900'
                  : 'border border-gray-300 bg-white text-gray-700',
              ].join(' ')}
            >
              Cần Pro để dùng tính năng này
            </Link>
            <p className={['text-center text-[0.75rem]', tier.accent ? 'text-white/40' : 'text-gray-400'].join(' ')}>
              Nâng cấp Pro trước, sau đó boost tin
            </p>
          </div>
        ) : (
          <BoostCheckoutButton
            productType={tier.id === 'boost_7' ? 'boost_7d' : tier.id === 'boost_30' ? 'boost_30d' : 'spotlight'}
            listingId={listingId ?? undefined}
            label={tier.cta}
            className={[
              'flex h-11 w-full cursor-pointer items-center justify-center rounded-full text-[0.9375rem] font-bold transition-opacity hover:opacity-80 disabled:opacity-50',
              tier.accent
                ? 'bg-white text-gray-900'
                : 'bg-green-800 text-white',
            ].join(' ')}
          />
        )}
      </div>
    </div>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { n: '1', title: 'Chọn gói',      desc: 'Chọn gói Boost phù hợp với ngân sách và mục tiêu của bạn.' },
    { n: '2', title: 'Chọn tin đăng', desc: 'Chọn tin đăng muốn xúc tiến. Có thể chạy nhiều tin cùng lúc.' },
    { n: '3', title: 'Thanh toán',    desc: 'Thanh toán qua chuyển khoản hoặc ví điện tử. Xác nhận trong 2 giờ.' },
    { n: '4', title: 'Theo dõi kết quả', desc: 'Xem báo cáo lượt xem, click và liên hệ theo thời gian thực trong Phân tích.' },
  ]
  return (
    <div className="mt-14">
      <p className="mb-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">
        Quy trình
      </p>
      <h2 className="mb-6 text-xl font-bold tracking-tight text-gray-900">
        Cách hoạt động
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(s => (
          <div key={s.n}
               className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full
                            bg-green-50 text-[1rem] font-black text-green-700">
              {s.n}
            </div>
            <p className="m-0 text-[0.9375rem] font-bold text-gray-900">{s.title}</p>
            <p className="m-0 mt-1.5 text-[0.8125rem] leading-relaxed text-gray-500">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function XucTienTinDangPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [subscription, insights] = await Promise.all([
    getActiveSubscription(user.id),
    getMerchantInsights(user.id),
  ])

  const isPro            = subscription?.plan_id === 'pro' && subscription?.status === 'active'
  const firstListingId   = insights[0]?.listingId ?? null
  const activeCount      = insights.length

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-gray-400">
          Promote Center
        </p>
        <h1 className="m-0 mt-1 text-[1.75rem] font-bold tracking-tight text-gray-900">
          Xúc tiến tin đăng
        </h1>
        <p className="m-0 mt-2 max-w-xl text-[0.9375rem] text-gray-500">
          Tăng khả năng hiển thị và thu hút người mua tiềm năng nhanh hơn.
          {activeCount > 0 && ` Bạn đang có ${activeCount} tin đăng đang hoạt động.`}
        </p>
      </div>

      {/* ── Pro gate notice ────────────────────────────────────── */}
      {!isPro && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-[#0071E3]/20
                        bg-[#0071E3]/5 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                          bg-[#0071E3]/10 text-xl">
            💡
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[0.9375rem] font-semibold text-[#0071E3]">
              Gói Boost 7 ngày dành cho tất cả người dùng.
              Gói Boost 30 ngày và Spotlight yêu cầu Pro.
            </p>
          </div>
          <Link
            href="/nang-cap?reason=promote-center"
            className="shrink-0 rounded-full bg-[#0071E3] px-4 py-2 text-[0.8125rem]
                       font-semibold text-white no-underline hover:opacity-80"
          >
            Xem Pro →
          </Link>
        </div>
      )}

      {/* ── Tier grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PROMOTE_TIERS.map(tier => (
          <PromoteTierCard
            key={tier.id}
            tier={tier}
            listingId={firstListingId}
            isPro={isPro}
          />
        ))}
      </div>

      {/* ── How it works ───────────────────────────────────────── */}
      <HowItWorks />

      {/* ── Bottom CTA ─────────────────────────────────────────── */}
      <div className="relative mt-14 overflow-hidden rounded-[28px] bg-[#F5F5F7] px-8 py-10 text-center">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full
                        bg-green-200/40 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <p className="m-0 text-[1.25rem] font-bold text-gray-900">
            Cần tư vấn chọn gói phù hợp?
          </p>
          <p className="m-0 mt-2 text-[0.9375rem] text-gray-500">
            Đội ngũ VIO AGRI hỗ trợ tư vấn miễn phí theo nhu cầu cụ thể của bạn.
          </p>
          <Link
            href="/lien-he?subject=promote-consultation"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full
                       bg-green-800 px-8 text-[0.9375rem] font-semibold text-white no-underline
                       transition-all hover:bg-green-900 active:scale-[0.98]"
          >
            Liên hệ tư vấn
          </Link>
        </div>
      </div>

    </div>
  )
}
