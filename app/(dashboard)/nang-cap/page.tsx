import type { Metadata }   from 'next'
import Link                from 'next/link'
import { createClient }    from '@/lib/supabase/server'
import {
  getSubscriptionFeatures,
  getListingCount,
  getActiveSubscription,
}                          from '@/features/billing/api/subscription.server'
import { PLAN_DISPLAY }    from '@/features/billing/types'
import { BoostCheckoutButton } from '@/app/(dashboard)/xuc-tien-tin-dang/_components/BoostCheckoutButton'

export const metadata: Metadata = { title: 'Nâng cấp Pro' }
export const revalidate = 0

// ── Reason labels ─────────────────────────────────────────────────────────────

const REASON_MESSAGES: Record<string, string> = {
  listing_limit: 'Bạn đã đạt giới hạn số tin đăng của gói Free.',
  hot_leads:     'Lead nóng & rất nóng chỉ dành cho gói Pro.',
  analytics:     'Phân tích 30 ngày chỉ dành cho gói Pro.',
  smart_match:   'Smart Matching chỉ dành cho gói Pro.',
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    reason?:  string
    current?: string
    max?:     string
  }>
}

export default async function NangCapPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-center text-gray-500">
        Vui lòng đăng nhập.
      </div>
    )
  }

  const params = await searchParams
  const reason = params.reason ?? ''
  const reasonMessage = REASON_MESSAGES[reason]

  const [features, count, subscription] = await Promise.all([
    getSubscriptionFeatures(user.id),
    getListingCount(user.id),
    getActiveSubscription(user.id),
  ])

  const isPro = subscription?.plan_id === 'pro'
  const pro   = PLAN_DISPLAY.pro

  if (isPro) {
    return (
      <div className="p-6 md:p-10">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-white/[0.06] dark:bg-[#1C1C1E]">
          <span className="text-5xl" aria-hidden="true">✅</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Bạn đang dùng Pro
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Toàn bộ tính năng đã được mở khóa.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-semibold text-white no-underline hover:opacity-80 dark:bg-white dark:text-black"
          >
            ← Về Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-lg">

        {/* ── Header ── */}
        <div className="mb-8 text-center">
          <p className="m-0 mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[#0071E3]">
            Nâng cấp tài khoản
          </p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Chuyển sang Pro
          </h1>

          {/* Context-aware reason message */}
          {reasonMessage && (
            <div className="mt-4 rounded-2xl bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              {reasonMessage}
            </div>
          )}

          {reason === 'listing_limit' && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Hiện tại: {count} / {features.maxListings} tin đăng
            </p>
          )}
        </div>

        {/* ── Pro plan card ── */}
        <div className="rounded-3xl bg-black p-8 text-white dark:bg-white dark:text-black">
          <p className="m-0 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/60 dark:text-black/50">
            Pro
          </p>

          <div className="mt-3 flex items-end gap-1.5">
            <span className="text-[2.5rem] font-bold leading-none tracking-tight">
              {pro.priceVnd.toLocaleString('vi-VN')} ₫
            </span>
            <span className="mb-1 text-sm text-white/60 dark:text-black/50">
              {pro.period}
            </span>
          </div>

          <p className="mt-2 text-sm text-white/70 dark:text-black/60">
            {pro.description}
          </p>

          {/* Feature list */}
          <ul className="mt-6 space-y-2.5 m-0 list-none p-0">
            {pro.features.map(f => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="shrink-0 text-[#34C759]" aria-hidden="true">✓</span>
                <span className="text-sm text-white/90 dark:text-black/80">{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA — VietQR checkout */}
          <BoostCheckoutButton
            productType="pro_monthly"
            label={`Nâng cấp Pro — ${pro.priceVnd.toLocaleString('vi-VN')} ₫/tháng`}
            className="mt-8 flex w-full cursor-pointer items-center justify-center rounded-full
                       bg-white py-3.5 text-[15px] font-bold text-gray-900
                       transition-opacity hover:opacity-85 disabled:opacity-50
                       dark:bg-black dark:text-white"
          />
        </div>

        {/* ── Back link ── */}
        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 no-underline hover:text-gray-600 dark:hover:text-gray-300"
          >
            ← Tiếp tục với Free
          </Link>
        </div>

      </div>
    </div>
  )
}
