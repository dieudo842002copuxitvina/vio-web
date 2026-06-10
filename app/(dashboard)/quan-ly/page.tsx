import type { Metadata }         from 'next'
import Link                       from 'next/link'
import Image                      from 'next/image'
import { createClient }           from '@/lib/supabase/server'
import { getActiveSubscription }  from '@/features/billing/api/subscription.server'

export const metadata: Metadata = { title: 'Tổng quan — VIO AGRI' }
export const revalidate = 0

// ── Types ─────────────────────────────────────────────────────────────────────

interface SavedSearch {
  id:        string
  label:     string
  query_url: string
}

interface SavedListing {
  listing_id: string
  listings: {
    slug:          string
    title:         string
    cover_url:     string | null
    location_text: string | null
    price_text:    string | null
  } | null
}

// ── Land type quick filters ────────────────────────────────────────────────────

const QUICK_FILTERS = [
  { label: 'Đất lúa',       href: '/dat-nong-nghiep?land_type=lua'        },
  { label: 'Cây ăn trái',   href: '/dat-nong-nghiep?land_type=an_trai'    },
  { label: 'Cây lâu năm',   href: '/dat-nong-nghiep?land_type=cay_lau_nam'},
  { label: 'Lâm nghiệp',    href: '/dat-nong-nghiep?land_type=lam_nghiep' },
  { label: 'Trang trại',    href: '/dat-nong-nghiep?land_type=hon_hop'    },
]

// ── Search hero ───────────────────────────────────────────────────────────────
// Plain HTML form — works without JS, navigates to /dat-nong-nghiep?q=...

function SearchHero() {
  return (
    <section
      className={[
        'overflow-hidden rounded-3xl',
        'bg-gradient-to-br from-vio-forest to-[#1A4A2A]',
        'px-6 py-8 sm:px-10 sm:py-10',
      ].join(' ')}
      aria-label="Tìm đất nông nghiệp"
    >
      <h2 className="m-0 mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
        Khám phá
      </h2>
      <p className="m-0 mb-6 text-[1.5rem] font-bold leading-tight tracking-tight text-white sm:text-[1.75rem]">
        Tìm đất nông nghiệp<br className="hidden sm:block" /> phù hợp với bạn
      </p>

      {/* Search form */}
      <form action="/dat-nong-nghiep" method="get" role="search">
        <div className="flex overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <label htmlFor="dashboard-search" className="sr-only">Tìm kiếm đất</label>
          <input
            id="dashboard-search"
            name="q"
            type="search"
            autoComplete="off"
            placeholder="Tìm theo tỉnh, loại đất, diện tích..."
            className={[
              'flex-1 bg-transparent px-5 py-3.5',
              'text-[15px] text-gray-900 placeholder:text-gray-400',
              'outline-none',
            ].join(' ')}
          />
          <button
            type="submit"
            className={[
              'shrink-0 bg-vio-forest px-5',
              'text-[14px] font-bold text-white',
              'transition-opacity hover:opacity-90',
            ].join(' ')}
          >
            Tìm ngay
          </button>
        </div>
      </form>

      {/* Quick filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_FILTERS.map(f => (
          <Link
            key={f.href}
            href={f.href}
            className={[
              'rounded-full border border-white/20 bg-white/10 px-3 py-1.5',
              'text-[12px] font-semibold text-white/85 no-underline',
              'transition-colors hover:bg-white/20',
            ].join(' ')}
          >
            {f.label}
          </Link>
        ))}
        <Link
          href="/dat-nong-nghiep"
          className={[
            'rounded-full border border-white/20 bg-white/10 px-3 py-1.5',
            'text-[12px] font-semibold text-white/85 no-underline',
            'transition-colors hover:bg-white/20',
          ].join(' ')}
        >
          Xem tất cả →
        </Link>
      </div>
    </section>
  )
}

// ── Saved search pill ─────────────────────────────────────────────────────────

function SavedSearchPill({ s }: { s: SavedSearch }) {
  return (
    <Link
      href={s.query_url}
      className={[
        'flex items-center gap-2 rounded-full',
        'border border-gray-200 bg-white px-4 py-2.5',
        'shadow-[0_1px_3px_rgb(0,0,0,0.04)]',
        'text-[13px] font-medium text-gray-700 no-underline',
        'transition-all hover:border-vio-forest/30 hover:text-vio-forest',
        'whitespace-nowrap',
      ].join(' ')}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-400">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2"/>
        <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      {s.label}
    </Link>
  )
}

// ── Saved listing card ────────────────────────────────────────────────────────

function SavedListingCard({ l }: { l: NonNullable<SavedListing['listings']>; listingId: string }) {
  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${l.slug}`}
      className={[
        'group block overflow-hidden rounded-2xl border border-gray-100 bg-white',
        'shadow-[0_1px_4px_rgb(0,0,0,0.04)] no-underline',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgb(0,0,0,0.08)]',
      ].join(' ')}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {l.cover_url ? (
          <Image
            src={l.cover_url}
            alt={l.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, 200px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-200">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 22V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 13C11 11 8.5 9.5 6 10c.5-3.5 3-5 6-5s5.5 1.5 6 5c-2.5-.5-5 1-6 3z"
                    stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      {/* Body */}
      <div className="p-3">
        {l.price_text && (
          <p className="m-0 text-[14px] font-bold text-vio-forest">{l.price_text}</p>
        )}
        <p className="m-0 mt-0.5 line-clamp-1 text-[12px] text-gray-700">{l.title}</p>
        {l.location_text && (
          <p className="m-0 mt-1 flex items-center gap-1 text-[11px] text-gray-400">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            {l.location_text}
          </p>
        )}
      </div>
    </Link>
  )
}

// ── Pro upgrade strip ─────────────────────────────────────────────────────────

function ProUpgradeStrip() {
  return (
    <div
      className={[
        'flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5',
        'shadow-[0_1px_4px_rgb(0,0,0,0.04)]',
        'sm:flex-row sm:items-center',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[15px] font-bold text-gray-900">
          Tìm đất hiệu quả hơn với Pro
        </p>
        <p className="m-0 mt-0.5 text-[13px] text-gray-400">
          Smart Matching, 100 tin đăng, phân tích 30 ngày.
        </p>
      </div>
      <Link
        href="/goi-thanh-vien"
        className={[
          'shrink-0 rounded-full bg-gray-900 px-5 py-2.5',
          'text-[13px] font-bold text-white no-underline',
          'transition-opacity hover:opacity-80',
        ].join(' ')}
      >
        Xem gói Pro
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function QuanLyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [subscription, listingRes] = await Promise.all([
    getActiveSubscription(user.id),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'published'),
  ])

  const isPro          = subscription?.plan_id === 'pro' && subscription?.status === 'active'
  const displayName    = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Bạn'
  const activeCount    = listingRes.count ?? 0

  // Saved searches (graceful empty)
  let savedSearches: SavedSearch[] = []
  try {
    const res = await supabase
      .from('saved_searches')
      .select('id, label, query_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
    savedSearches = (res.data ?? []) as SavedSearch[]
  } catch { savedSearches = [] }

  // Saved listings (graceful empty)
  let savedListings: SavedListing[] = []
  try {
    const res = await supabase
      .from('listing_saves')
      .select(`listing_id, listings ( slug, title, cover_url, location_text, price_text )`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4)
    savedListings = ((res.data ?? []) as unknown as SavedListing[]).filter(r => r.listings !== null)
  } catch { savedListings = [] }

  return (
    <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-9">

      {/* ── Greeting ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Dashboard
          </p>
          <h1 className="m-0 mt-0.5 text-[1.5rem] font-bold tracking-tight text-gray-900 sm:text-[1.75rem]">
            Xin chào, {displayName}
          </h1>
        </div>
        {isPro ? (
          <span className="shrink-0 rounded-full border border-vio-forest/20 bg-[#F0F7F1] px-3 py-1 text-[11px] font-bold text-vio-forest">
            Pro
          </span>
        ) : (
          <Link
            href="/goi-thanh-vien"
            className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-500 no-underline shadow-[0_1px_2px_rgb(0,0,0,0.04)] hover:border-gray-300 hover:text-gray-700"
          >
            Free
          </Link>
        )}
      </div>

      {/* ── 1. Find land — search hero ────────────────────────────── */}
      <SearchHero />

      {/* ── 2. Find land — saved searches ─────────────────────────── */}
      {savedSearches.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-bold text-gray-900">Tìm kiếm đã lưu</h2>
            <Link
              href="/tim-kiem-da-luu"
              className="text-[12px] font-semibold text-vio-forest no-underline hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map(s => <SavedSearchPill key={s.id} s={s} />)}
          </div>
        </section>
      )}

      {/* ── 3. Evaluate land — saved listings ─────────────────────── */}
      {savedListings.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-bold text-gray-900">Đất đã lưu</h2>
            <Link
              href="/tin-da-luu"
              className="text-[12px] font-semibold text-vio-forest no-underline hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {savedListings.map(r => (
              <SavedListingCard
                key={r.listing_id}
                listingId={r.listing_id}
                l={r.listings!}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 4. My listings — minimal seller row ───────────────────── */}
      <section>
        <div
          className={[
            'flex items-center justify-between gap-4 rounded-2xl',
            'border border-gray-100 bg-white px-5 py-4',
            'shadow-[0_1px_3px_rgb(0,0,0,0.04)]',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="m-0 text-[14px] font-semibold text-gray-900">
                {activeCount > 0
                  ? `${activeCount} tin đang hiển thị`
                  : 'Chưa có tin đăng nào'}
              </p>
              <p className="m-0 mt-0.5 text-[12px] text-gray-400">
                {activeCount > 0
                  ? 'Đất của bạn đang được hiển thị cho người mua'
                  : 'Đăng tin để tiếp cận hàng nghìn người tìm đất'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {activeCount > 0 && (
              <Link
                href="/tin-dang-cua-toi"
                className="text-[12px] font-semibold text-gray-400 no-underline hover:text-gray-700"
              >
                Quản lý
              </Link>
            )}
            <Link
              href="/dang-tin-dat"
              className={[
                'rounded-full bg-vio-forest px-4 py-2',
                'text-[13px] font-bold text-white no-underline',
                'hover:opacity-90',
              ].join(' ')}
            >
              + Đăng tin
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Upgrade to Pro ─────────────────────────────────────── */}
      {!isPro && <ProUpgradeStrip />}

    </div>
  )
}
