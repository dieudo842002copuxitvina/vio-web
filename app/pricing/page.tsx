import type { Metadata } from 'next'
import Link              from 'next/link'
import { PLAN_DISPLAY }  from '@/features/billing/types'

export const metadata: Metadata = {
  title:       'Bảng giá — VIO AGRI',
  description: 'Chọn gói phù hợp để tối ưu hoạt động môi giới đất nông nghiệp. Miễn phí mãi mãi hoặc nâng cấp Pro với đầy đủ tính năng.',
  alternates:  { canonical: '/pricing' },
}

// ── Feature comparison table ──────────────────────────────────────────────────

const COMPARISON_ROWS: Array<{ label: string; free: string; pro: string }> = [
  { label: 'Tin đăng',                       free: '10',        pro: '100'      },
  { label: 'Phân tích lịch sử',               free: '7 ngày',    pro: '30 ngày'  },
  { label: 'CRM Leads',                       free: '✓',         pro: '✓'        },
  { label: 'Tín hiệu ấm & lạnh',             free: '✓',         pro: '✓'        },
  { label: 'Tín hiệu nóng & rất nóng',       free: '—',         pro: '✓'        },
  { label: 'Smart Matching',                  free: '—',         pro: '✓'        },
  { label: 'Featured Listing (ưu tiên)',       free: '—',         pro: '✓'        },
  { label: 'Merchant Insights đầy đủ',        free: '—',         pro: '✓'        },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' ₫'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlanCard({
  id, name, priceVnd, period, description, cta, features, highlighted,
}: typeof PLAN_DISPLAY[keyof typeof PLAN_DISPLAY]) {
  return (
    <div className={[
      'relative flex flex-col rounded-3xl p-8',
      highlighted
        ? 'bg-black text-white shadow-2xl dark:bg-white dark:text-black'
        : 'border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-white/[0.08] dark:bg-[#1C1C1E] dark:text-white',
    ].join(' ')}>

      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-[#0071E3] px-4 py-1 text-[0.75rem] font-bold text-white tracking-wide">
            Phổ biến nhất
          </span>
        </div>
      )}

      {/* Plan name */}
      <p className={`m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] ${highlighted ? 'text-white/60 dark:text-black/50' : 'text-gray-400'}`}>
        {name}
      </p>

      {/* Price */}
      <div className="mt-3 flex items-end gap-1.5">
        {priceVnd === 0 ? (
          <span className="text-[2.5rem] font-bold leading-none tracking-tight">
            Miễn phí
          </span>
        ) : (
          <>
            <span className="text-[2.5rem] font-bold leading-none tracking-tight">
              {formatVnd(priceVnd)}
            </span>
            <span className={`mb-1 text-sm ${highlighted ? 'text-white/60 dark:text-black/50' : 'text-gray-400'}`}>
              {period}
            </span>
          </>
        )}
      </div>

      {/* Description */}
      <p className={`mt-2 text-sm ${highlighted ? 'text-white/70 dark:text-black/60' : 'text-gray-500'}`}>
        {description}
      </p>

      {/* CTA */}
      <Link
        href={highlighted ? '/quan-ly-leads?upgrade=1' : '/dang-ky'}
        className={[
          'mt-6 flex items-center justify-center rounded-full py-3 text-[0.9375rem] font-semibold no-underline transition-opacity hover:opacity-80',
          highlighted
            ? 'bg-[#0071E3] text-white'
            : 'border border-gray-200 bg-white text-gray-900 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-white',
        ].join(' ')}
      >
        {cta}
      </Link>

      {/* Features */}
      <ul className="mt-7 space-y-3 m-0 list-none p-0">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 shrink-0 text-base ${highlighted ? 'text-[#34C759]' : 'text-[#34C759]'}`}
              aria-hidden="true"
            >
              ✓
            </span>
            <span className={`text-[0.875rem] ${highlighted ? 'text-white/90 dark:text-black/80' : 'text-gray-600 dark:text-gray-300'}`}>
              {f}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const plans = Object.values(PLAN_DISPLAY)

  return (
    <main className="min-h-screen bg-white dark:bg-black">

      {/* ── Hero ── */}
      <section className="px-4 pb-16 pt-24 text-center">
        <p className="m-0 mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[#0071E3]">
          Bảng giá
        </p>
        <h1 className="m-0 text-[2.5rem] font-bold tracking-tight text-gray-900 dark:text-white sm:text-[3rem]">
          Phù hợp với mọi quy mô
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[1.0625rem] leading-relaxed text-gray-500 dark:text-gray-400">
          Bắt đầu miễn phí. Nâng cấp khi bạn sẵn sàng mở rộng.
        </p>
      </section>

      {/* ── Plan cards ── */}
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {plans.map(plan => (
            <PlanCard key={plan.id} {...plan} />
          ))}
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="mx-auto max-w-2xl px-4 pb-24">
        <h2 className="m-0 mb-6 text-center text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          So sánh tính năng
        </h2>

        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.08]">
          {/* Header */}
          <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50 px-5 py-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <span className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-gray-400">Tính năng</span>
            <span className="text-center text-[0.75rem] font-bold uppercase tracking-[0.08em] text-gray-400">Free</span>
            <span className="text-center text-[0.75rem] font-bold uppercase tracking-[0.08em] text-[#0071E3]">Pro</span>
          </div>

          {/* Rows */}
          {COMPARISON_ROWS.map((row, i) => (
            <div
              key={row.label}
              className={[
                'grid grid-cols-3 items-center px-5 py-4',
                i < COMPARISON_ROWS.length - 1
                  ? 'border-b border-gray-100 dark:border-white/[0.04]'
                  : '',
              ].join(' ')}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">{row.label}</span>
              <span className={`text-center text-sm font-medium ${row.free === '—' ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                {row.free}
              </span>
              <span className={`text-center text-sm font-semibold ${row.pro === '—' ? 'text-gray-300 dark:text-gray-600' : 'text-[#0071E3] dark:text-[#409CFF]'}`}>
                {row.pro}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ / trust signals ── */}
      <section className="border-t border-gray-100 bg-gray-50/60 px-4 py-16 text-center dark:border-white/[0.06] dark:bg-[#0A0A0A]">
        <p className="m-0 text-sm text-gray-500 dark:text-gray-400">
          Chưa tích hợp cổng thanh toán — liên hệ admin để kích hoạt Pro.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-[#0071E3] no-underline hover:underline dark:text-[#409CFF]"
        >
          ← Về Dashboard
        </Link>
      </section>

    </main>
  )
}
