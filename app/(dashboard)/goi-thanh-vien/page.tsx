import type { Metadata }  from 'next'
import Link               from 'next/link'
import { createClient }   from '@/lib/supabase/server'
import {
  getActiveSubscription,
}                         from '@/features/billing/api/subscription.server'
import { PLAN_DISPLAY }   from '@/features/billing/types'
import { CancelSubscriptionButton } from './_components/CancelSubscriptionButton'
import { BoostCheckoutButton }      from '@/app/(dashboard)/xuc-tien-tin-dang/_components/BoostCheckoutButton'

export const metadata: Metadata = { title: 'Gói thành viên — VIO AGRI' }
export const revalidate = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtPrice(vnd: number): string {
  return vnd.toLocaleString('vi-VN') + ' ₫'
}

// ── Feature row ───────────────────────────────────────────────────────────────

function FeatureRow({ label, free, pro }: { label: string; free: string; pro: string }) {
  return (
    <div className="grid grid-cols-[1fr_100px_100px] gap-4 border-b border-gray-50 py-3 last:border-0">
      <p className="m-0 text-[14px] text-gray-600">{label}</p>
      <p className="m-0 text-center text-[13px] text-gray-400">{free}</p>
      <p className="m-0 text-center text-[13px] font-semibold text-vio-forest">{pro}</p>
    </div>
  )
}

// ── Pro plan card (active subscriber) ────────────────────────────────────────

function ProCard({ periodEnd, periodStart }: { periodEnd: string | null; periodStart: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-vio-forest/15 bg-gradient-to-br from-vio-forest/5 to-vio-forest/[0.02]">
      {/* Header band */}
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-vio-forest/10 px-3 py-1 text-[11px] font-bold tracking-wide text-vio-forest">
            <span className="h-1.5 w-1.5 rounded-full bg-vio-forest" />
            Pro đang hoạt động
          </span>
          <p className="m-0 mt-2 text-[24px] font-bold text-gray-900">Gói Pro</p>
          <p className="m-0 mt-0.5 text-[13px] text-gray-500">{PLAN_DISPLAY.pro.description}</p>
        </div>
        <div className="hidden sm:block">
          <p className="m-0 text-right text-[28px] font-black text-gray-900">
            {fmtPrice(PLAN_DISPLAY.pro.priceVnd)}
          </p>
          <p className="m-0 text-right text-[12px] text-gray-400">{PLAN_DISPLAY.pro.period}</p>
        </div>
      </div>

      <div className="mx-6 h-px bg-vio-forest/10" />

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-3">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
            Bắt đầu
          </p>
          <p className="m-0 mt-1 text-[15px] font-semibold text-gray-900">{fmtDate(periodStart)}</p>
        </div>
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
            Gia hạn
          </p>
          <p className="m-0 mt-1 text-[15px] font-semibold text-gray-900">{fmtDate(periodEnd)}</p>
        </div>
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
            Giá
          </p>
          <p className="m-0 mt-1 text-[15px] font-semibold text-gray-900">
            {fmtPrice(PLAN_DISPLAY.pro.priceVnd)} <span className="text-[12px] font-normal text-gray-400">/ tháng</span>
          </p>
        </div>
      </div>

      {/* Features included */}
      <div className="mx-6 h-px bg-vio-forest/10" />
      <div className="px-6 py-5">
        <p className="m-0 mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">
          Tính năng đang dùng
        </p>
        <ul className="m-0 grid grid-cols-1 gap-2 list-none p-0 sm:grid-cols-2">
          {PLAN_DISPLAY.pro.features.map(f => (
            <li key={f} className="flex items-center gap-2 text-[13px] text-gray-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-vio-forest">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="border-t border-vio-forest/10 bg-white/50 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/lien-he?subject=manage-subscription"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 no-underline transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            Quản lý gói
          </Link>
          <CancelSubscriptionButton />
        </div>
      </div>
    </div>
  )
}

// ── Free plan upgrade card ────────────────────────────────────────────────────

function FreeUpgradeCard() {
  const pro = PLAN_DISPLAY.pro

  return (
    <div className="space-y-5">

      {/* Current plan badge */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-500">
            <rect x="2" y="6" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.75"/>
            <path d="M2 10h20" stroke="currentColor" strokeWidth="1.75"/>
          </svg>
        </div>
        <div>
          <p className="m-0 text-[14px] font-bold text-gray-900">Gói Free</p>
          <p className="m-0 mt-0.5 text-[12px] text-gray-400">Bạn đang sử dụng gói miễn phí</p>
        </div>
      </div>

      {/* Pro card */}
      <div className="overflow-hidden rounded-3xl bg-gray-900 text-white">
        <div className="px-6 pt-6">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">Pro</p>
          <div className="mt-3 flex items-end gap-1.5">
            <span className="text-[2.5rem] font-black leading-none">{fmtPrice(pro.priceVnd)}</span>
            <span className="mb-1.5 text-[14px] text-white/50">{pro.period}</span>
          </div>
          <p className="m-0 mt-1.5 text-[14px] text-white/70">{pro.description}</p>
        </div>

        <div className="mt-5 px-6">
          <ul className="m-0 grid grid-cols-1 gap-2.5 list-none p-0 sm:grid-cols-2">
            {pro.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-[13px] text-white/85">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-emerald-400">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-6 bg-black/30 px-6 py-5">
          <BoostCheckoutButton
            productType="pro_monthly"
            label={`Nâng cấp Pro — ${fmtPrice(pro.priceVnd)}/tháng`}
            className="flex w-full cursor-pointer items-center justify-center rounded-full bg-white
                       py-3 text-[14px] font-bold text-gray-900 transition-opacity
                       hover:opacity-90 disabled:opacity-50"
          />
        </div>
      </div>

    </div>
  )
}

// ── Comparison table ──────────────────────────────────────────────────────────

function ComparisonTable() {
  const rows = [
    { label: 'Số tin đăng',             free: '10',         pro: '100'          },
    { label: 'Phân tích',               free: '7 ngày',     pro: '30 ngày'      },
    { label: 'Lead Funnel Analytics',   free: 'Cơ bản',     pro: 'Đầy đủ'       },
    { label: 'Lead nóng & rất nóng',    free: '—',          pro: '✓'            },
    { label: 'ROI & Health Score',      free: '—',          pro: '✓'            },
    { label: 'Smart Matching',          free: '—',          pro: '✓'            },
    { label: 'Boost 30 ngày / Spotlight', free: '—',        pro: '✓'            },
    { label: 'Featured Listing',        free: '—',          pro: '✓'            },
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_100px] gap-4 border-b border-gray-100 px-5 py-3">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">Tính năng</p>
        <p className="m-0 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">Free</p>
        <p className="m-0 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-vio-forest">Pro</p>
      </div>
      <div className="px-5">
        {rows.map(r => <FeatureRow key={r.label} {...r} />)}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GoiThanhVienPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const subscription = await getActiveSubscription(user.id)
  const isPro = subscription?.plan_id === 'pro' && subscription?.status === 'active'

  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="mb-7">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Dashboard
        </p>
        <h1 className="m-0 mt-1 text-[1.75rem] font-bold tracking-tight text-gray-900">
          Gói thành viên
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">

        {/* Left: current plan */}
        <div>
          <h2 className="m-0 mb-4 text-[15px] font-bold text-gray-900">Gói hiện tại</h2>
          {isPro ? (
            <ProCard
              periodStart={subscription!.current_period_start}
              periodEnd={subscription!.current_period_end}
            />
          ) : (
            <FreeUpgradeCard />
          )}
        </div>

        {/* Right: comparison + promote CTA */}
        <div className="space-y-5">
          <div>
            <h2 className="m-0 mb-4 text-[15px] font-bold text-gray-900">So sánh gói</h2>
            <ComparisonTable />
          </div>

          {/* Promote Center cross-sell */}
          <div className="overflow-hidden rounded-2xl border border-amber-200/70 bg-amber-50">
            <div className="px-5 py-4">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-amber-600">
                Xúc tiến tin đăng
              </p>
              <p className="m-0 mt-1 text-[14px] font-semibold text-gray-900">
                Tăng khả năng hiển thị với Boost & Spotlight
              </p>
              <p className="m-0 mt-1 text-[13px] text-gray-500">
                Độc lập với gói thành viên — Boost 7 ngày cho tất cả người dùng.
              </p>
            </div>
            <div className="border-t border-amber-200/60 bg-white/60 px-5 py-3">
              <Link
                href="/xuc-tien-tin-dang"
                className="text-[13px] font-semibold text-amber-700 no-underline hover:underline"
              >
                Xem Promote Center →
              </Link>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
