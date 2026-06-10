'use client'

import { useState } from 'react'
import Link          from 'next/link'
import { BookingSheet } from '@/features/booking/BookingSheet'
import type {
  ProductRef,
  ServiceRef,
  NearbyRef,
  ReviewRef,
} from '@/features/storefronts/services/storefront-detail'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  businessId:     string
  businessName:   string
  description:    string | null
  addressText:    string
  products:       ProductRef[]
  services:       ServiceRef[]
  nearby:         NearbyRef[]
  reviews:        ReviewRef[]
  review_count:   number
  average_rating: number | null
}

type Tab = 'overview' | 'listings' | 'services' | 'reviews'

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const full  = Math.floor(rating)
  const half  = rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  const sz    = size === 'lg' ? 'text-xl' : 'text-sm'
  return (
    <span className={`inline-flex gap-0.5 ${sz}`} aria-label={`${rating} sao`}>
      {'★'.repeat(full)}{half ? '⯨' : ''}{'☆'.repeat(empty)}
    </span>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ p }: { p: ProductRef }) {
  return (
    <Link
      href={`/san-pham/${p.slug}`}
      className="flex h-full flex-col rounded-2xl bg-white p-4
                 shadow-[0_1px_6px_rgba(0,0,0,0.07)] no-underline
                 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]
                 dark:bg-[#2C2C2E]"
    >
      {p.is_featured && (
        <span className="mb-2 self-start rounded-full bg-[#0071E3]/10 px-2 py-0.5
                         text-[0.625rem] font-bold uppercase tracking-wide text-[#0071E3]">
          Nổi bật
        </span>
      )}
      <span className="text-[0.875rem] font-semibold leading-snug text-gray-900 dark:text-white">
        {p.title}
      </span>
      {p.price_text && (
        <span className="mt-auto pt-2 text-[0.8125rem] font-bold text-[#34C759]">
          {p.price_text}
        </span>
      )}
    </Link>
  )
}

// ── Service card ──────────────────────────────────────────────────────────────

function ServiceCard({ s, onBook }: { s: ServiceRef; onBook: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4
                    shadow-[0_1px_6px_rgba(0,0,0,0.07)] dark:bg-[#2C2C2E]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-xl" aria-hidden="true">🔧</span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[0.9375rem] font-semibold text-gray-900 dark:text-white">
            {s.title}
          </p>
          {s.service_area_text && (
            <p className="m-0 mt-0.5 text-[0.8125rem] text-gray-500 dark:text-gray-400">
              {s.service_area_text}
            </p>
          )}
          {s.price_text && (
            <p className="m-0 mt-1 text-[0.875rem] font-bold text-[#34C759]">
              {s.price_text}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onBook(s.id)}
        className="flex h-11 min-h-[44px] w-full items-center justify-center
                   rounded-xl bg-[#0071E3] font-semibold text-[0.9375rem] text-white
                   transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
      >
        Đặt lịch
      </button>
    </div>
  )
}

// ── Nearby card ───────────────────────────────────────────────────────────────

function NearbyCard({ n }: { n: NearbyRef }) {
  return (
    <Link
      href={`/doanh-nghiep/${n.slug}`}
      className="flex items-center gap-3.5 rounded-2xl bg-white p-4
                 shadow-[0_1px_6px_rgba(0,0,0,0.07)] no-underline
                 transition-colors hover:bg-gray-50 dark:bg-[#2C2C2E] dark:hover:bg-white/[0.05]"
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
        {n.avatar_url
          ? <img src={n.avatar_url} alt="" width={44} height={44} className="h-full w-full object-cover" loading="lazy" />
          : <div className="flex h-full w-full items-center justify-center text-lg">🏪</div>
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[0.875rem] font-semibold text-gray-900 dark:text-white">
          {n.business_name}
        </p>
        {n.is_verified && (
          <p className="m-0 mt-0.5 text-[0.6875rem] font-medium text-[#34C759]">✓ Đã xác thực</p>
        )}
      </div>
    </Link>
  )
}

// ── Review card ───────────────────────────────────────────────────────────────

function ReviewCard({ r }: { r: ReviewRef }) {
  const date = new Date(r.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.07)] dark:bg-[#2C2C2E]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                          bg-gray-100 text-sm font-bold text-gray-600
                          dark:bg-gray-700 dark:text-gray-300">
            {(r.reviewer_name?.[0] ?? 'K').toUpperCase()}
          </div>
          <span className="text-[0.875rem] font-semibold text-gray-900 dark:text-white">
            {r.reviewer_name ?? 'Khách hàng'}
          </span>
        </div>
        <span className="shrink-0 text-[0.75rem] text-gray-400">{date}</span>
      </div>
      <div className="mt-2 text-[#FF9500]">
        <Stars rating={r.rating} />
      </div>
      {r.comment && (
        <p className="m-0 mt-2 text-[0.875rem] leading-relaxed text-gray-600 dark:text-gray-400">
          {r.comment}
        </p>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ msg }: { msg: string }) {
  return (
    <p className="py-10 text-center text-[0.9375rem] text-gray-400">{msg}</p>
  )
}

// ── StorefrontTabs ────────────────────────────────────────────────────────────

export function StorefrontTabs({
  businessId,
  description,
  addressText,
  products,
  services,
  nearby,
  reviews,
  review_count,
  average_rating,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [booking,   setBooking]   = useState<{ serviceId?: string } | null>(null)

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview',  label: 'Tổng quan' },
    { id: 'listings',  label: 'Tin đăng', count: products.length  || undefined },
    { id: 'services',  label: 'Dịch vụ',  count: services.length  || undefined },
    { id: 'reviews',   label: 'Đánh giá', count: review_count     || undefined },
  ]

  return (
    <>
      {/* ── Sticky tab bar ── */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-gray-100 bg-white/90 px-4
                      backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#1C1C1E]/90">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-selected={activeTab === tab.id}
              className={[
                'flex h-11 min-h-[44px] shrink-0 items-center gap-1.5 border-b-2 px-4',
                'text-[0.9375rem] font-semibold transition-colors',
                activeTab === tab.id
                  ? 'border-[#0071E3] text-[#0071E3]'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              ].join(' ')}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={[
                  'rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold',
                  activeTab === tab.id
                    ? 'bg-[#0071E3]/10 text-[#0071E3]'
                    : 'bg-gray-100 text-gray-500 dark:bg-white/[0.1] dark:text-gray-400',
                ].join(' ')}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="pt-6">

        {/* Tổng quan */}
        {activeTab === 'overview' && (
          <div className="space-y-8">

            {description && (
              <div>
                <h2 className="m-0 mb-3 text-[1.0625rem] font-bold text-gray-900 dark:text-white">
                  Giới thiệu
                </h2>
                <p className="m-0 text-[0.9375rem] leading-relaxed text-gray-600 dark:text-gray-400">
                  {description}
                </p>
              </div>
            )}

            {addressText && (
              <div>
                <h2 className="m-0 mb-2 text-[1.0625rem] font-bold text-gray-900 dark:text-white">
                  Địa chỉ
                </h2>
                <p className="m-0 flex items-start gap-2 text-[0.9375rem] text-gray-600 dark:text-gray-400">
                  <span className="mt-0.5 shrink-0">📍</span>
                  {addressText}, Việt Nam
                </p>
              </div>
            )}

            {/* Booking CTA — highest-intent moment in the funnel */}
            {services.length > 0 && (
              <div className="rounded-2xl border border-vio-primary/20 bg-vio-primary/5 p-5">
                <h2 className="m-0 text-[1.0625rem] font-bold text-gray-900 dark:text-white">
                  Đặt lịch dịch vụ
                </h2>
                <p className="m-0 mt-1 text-[0.875rem] text-gray-500 dark:text-gray-400">
                  Tư vấn kỹ thuật, bảo trì, lắp đặt và nhiều dịch vụ khác
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className="mt-4 flex h-11 min-h-[44px] w-full items-center justify-center gap-2
                             rounded-xl bg-vio-forest font-semibold text-[0.9375rem] text-white
                             transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                >
                  Xem {services.length} dịch vụ
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" />
                  </svg>
                </button>
              </div>
            )}

            {nearby.length > 0 && (
              <div>
                <h2 className="m-0 mb-3 text-[1.0625rem] font-bold text-gray-900 dark:text-white">
                  Hộ kinh doanh lân cận
                </h2>
                <ul className="grid grid-cols-1 gap-3 list-none m-0 p-0 sm:grid-cols-2">
                  {nearby.map(n => <li key={n.id}><NearbyCard n={n} /></li>)}
                </ul>
              </div>
            )}

            {!description && !addressText && services.length === 0 && nearby.length === 0 && (
              <EmptyState msg="Chưa có thông tin tổng quan." />
            )}
          </div>
        )}

        {/* Tin đăng */}
        {activeTab === 'listings' && (
          <div>
            {products.length === 0 ? (
              <EmptyState msg="Chưa có tin đăng nào." />
            ) : (
              <ul className="grid grid-cols-2 gap-3 list-none m-0 p-0 sm:grid-cols-3">
                {products.map(p => <li key={p.id}><ProductCard p={p} /></li>)}
              </ul>
            )}
          </div>
        )}

        {/* Dịch vụ */}
        {activeTab === 'services' && (
          <div>
            {services.length === 0 ? (
              <EmptyState msg="Chưa có dịch vụ nào được đăng." />
            ) : (
              <ul className="grid grid-cols-1 gap-3 list-none m-0 p-0 sm:grid-cols-2">
                {services.map(s => (
                  <li key={s.id}>
                    <ServiceCard s={s} onBook={(id) => setBooking({ serviceId: id })} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Đánh giá */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {average_rating !== null && (
              <div className="flex items-center gap-5 rounded-3xl bg-gray-50 p-5 dark:bg-[#2C2C2E]">
                <div className="text-center">
                  <p className="m-0 text-5xl font-bold text-gray-900 dark:text-white">
                    {average_rating.toFixed(1)}
                  </p>
                  <p className="m-0 mt-1 text-[0.75rem] text-gray-400">/ 5</p>
                </div>
                <div>
                  <div className="text-[#FF9500]">
                    <Stars rating={average_rating} size="lg" />
                  </div>
                  <p className="m-0 mt-1 text-[0.875rem] text-gray-500 dark:text-gray-400">
                    {review_count} đánh giá
                  </p>
                </div>
              </div>
            )}
            {reviews.length === 0 ? (
              <EmptyState msg="Chưa có đánh giá nào." />
            ) : (
              <ul className="flex flex-col gap-3 list-none m-0 p-0">
                {reviews.map(r => <li key={r.id}><ReviewCard r={r} /></li>)}
              </ul>
            )}
          </div>
        )}

      </div>

      {/* ── Sticky Booking CTA — mobile only, above BottomTabBar ── */}
      {services.length > 0 && booking === null && activeTab !== 'services' && (
        <div className="fixed bottom-20 inset-x-4 z-30 md:hidden">
          <button
            type="button"
            onClick={() => setBooking({})}
            className="flex h-14 w-full items-center justify-center gap-2.5
                       rounded-2xl bg-vio-forest font-bold text-[0.9375rem] text-white
                       shadow-[0_8px_24px_rgba(26,77,46,0.35)]
                       transition-all active:scale-[0.97]"
          >
            <svg
              width="18" height="18" viewBox="0 0 18 18" fill="none"
              stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2.5" y="3.5" width="13" height="12" rx="2.5" />
              <path d="M6 2v3M12 2v3M2.5 8h13" />
            </svg>
            Đặt lịch dịch vụ
          </button>
        </div>
      )}

      {/* ── Booking sheet ── */}
      {booking !== null && (
        <BookingSheet
          businessId={businessId}
          serviceId={booking.serviceId}
          onClose={() => setBooking(null)}
        />
      )}
    </>
  )
}
