/**
 * MarketFeedLayer — Market Feed Layer
 *
 * Four sections placed immediately below the homepage hero:
 *   S1  Activity feed   — horizontal scroll, recent activity
 *   S2  Hot listings    — 4-col grid, trending → featured → any
 *   S3  Hot zones       — 4 province cards with listing counts
 *   S4  Buy requests    — wholesale / buy request cards
 *
 * Every section shows seed data when the database is empty.
 * No empty states ever.
 */

import Link             from 'next/link'
import { Suspense }     from 'react'
import { createCachedClient } from '@/lib/supabase/server'
import { LandListingCard, type LandListingCardProps, listingToLandCard } from '@/entities/listing'
import { getFeaturedListings, getListings } from '@/entities/listing/api/listing.server'
import { getTrendingListings }   from '@/features/recommendation/api/recommendation.server'
import { getWholesaleOpportunities } from '@/features/commerce/api/commerce.server'
import { TrackableCard } from '@/features/recommendation/components/TrackableCard'
import type { RecommendedListing } from '@/features/recommendation/types'

// ─────────────────────────────────────────────────────────────────────────────
//  Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diffMs  = Date.now() - new Date(dateStr).getTime()
  const mins    = Math.floor(diffMs / 60_000)
  const hours   = Math.floor(mins / 60)
  const days    = Math.floor(hours / 24)
  if (mins  <  1) return 'vừa xong'
  if (mins  < 60) return `${mins} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  return `${days} ngày trước`
}

// ─────────────────────────────────────────────────────────────────────────────
//  S1 – Activity feed
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityItem {
  key:          string
  typeLabel:    string
  typeColor:    string   // Tailwind text color class
  title:        string
  provinceName: string
  postedAt:     string   // ISO
  href:         string
}

const SEED_ACTIVITIES: ActivityItem[] = [
  { key: 'sa1',  typeLabel: 'Đất nông nghiệp', typeColor: 'text-[#34C759]', title: 'Đất cao su 5 ha, sổ đỏ',              provinceName: 'Đồng Nai',   postedAt: new Date(Date.now() - 2  * 60_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'sa2',  typeLabel: 'Đại lý',           typeColor: 'text-[#0071E3]', title: 'Thu mua sầu riêng Monthong',           provinceName: 'Bình Phước', postedAt: new Date(Date.now() - 5  * 60_000).toISOString(), href: '/doanh-nghiep' },
  { key: 'sa3',  typeLabel: 'Đất nông nghiệp', typeColor: 'text-[#34C759]', title: 'Vườn điều 8 ha cần chuyển nhượng',    provinceName: 'Bình Thuận', postedAt: new Date(Date.now() - 12 * 60_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'sa4',  typeLabel: 'Thu mua',          typeColor: 'text-[#FF9500]', title: 'Cần mua 30 tấn mắc-ca',               provinceName: 'Đắk Nông',   postedAt: new Date(Date.now() - 18 * 60_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'sa5',  typeLabel: 'Đất nông nghiệp', typeColor: 'text-[#34C759]', title: 'Đất trồng sầu riêng 3 ha',            provinceName: 'Lâm Đồng',   postedAt: new Date(Date.now() - 25 * 60_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'sa6',  typeLabel: 'Đại lý',           typeColor: 'text-[#0071E3]', title: 'Phân phối phân bón hữu cơ',            provinceName: 'Gia Lai',    postedAt: new Date(Date.now() - 31 * 60_000).toISOString(), href: '/doanh-nghiep' },
  { key: 'sa7',  typeLabel: 'Đất nông nghiệp', typeColor: 'text-[#34C759]', title: 'Trại gà 4 ha, đủ cơ sở hạ tầng',     provinceName: 'Đồng Nai',   postedAt: new Date(Date.now() - 45 * 60_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'sa8',  typeLabel: 'Thu mua',          typeColor: 'text-[#FF9500]', title: 'Thu mua 50 tấn cà phê robusta',        provinceName: 'Đắk Lắk',   postedAt: new Date(Date.now() - 52 * 60_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'sa9',  typeLabel: 'Đất nông nghiệp', typeColor: 'text-[#34C759]', title: 'Vườn tiêu 2 ha, năng suất cao',       provinceName: 'Bình Phước', postedAt: new Date(Date.now() - 68 * 60_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'sa10', typeLabel: 'Đại lý',           typeColor: 'text-[#0071E3]', title: 'Hợp tác xã nông sản sạch Lâm Đồng', provinceName: 'Lâm Đồng',   postedAt: new Date(Date.now() - 75 * 60_000).toISOString(), href: '/doanh-nghiep' },
  { key: 'sa11', typeLabel: 'Đất nông nghiệp', typeColor: 'text-[#34C759]', title: 'Đất trồng lúa 15 ha, quy hoạch rõ',  provinceName: 'An Giang',   postedAt: new Date(Date.now() - 90 * 60_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'sa12', typeLabel: 'Thu mua',          typeColor: 'text-[#FF9500]', title: 'Cần mua 100 tấn mía đường',           provinceName: 'Tây Ninh',   postedAt: new Date(Date.now() - 105 * 60_000).toISOString(), href: '/dat-nong-nghiep' },
]

async function fetchActivityItems(): Promise<ActivityItem[]> {
  const supabase = createCachedClient()

  const [listingRes, storefrontRes] = await Promise.all([
    supabase
      .from('listings')
      .select('id, slug, title, listing_type:type, province_id, published_at')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(10),

    supabase
      .from('storefronts')
      .select('id, slug, business_name, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const rows = listingRes.data ?? []
  const sfRows = storefrontRes.data ?? []

  if (!rows.length && !sfRows.length) return SEED_ACTIVITIES

  // Resolve province names
  const provinceIds = [...new Set(
    (rows as { province_id: number | null }[])
      .map(r => r.province_id)
      .filter((id): id is number => id != null),
  )]

  const provinceMap = new Map<number, string>()
  if (provinceIds.length) {
    const { data: provinces } = await supabase
      .from('provinces')
      .select('id, name')
      .in('id', provinceIds)
    for (const p of (provinces ?? []) as { id: number; name: string }[]) {
      provinceMap.set(p.id, p.name)
    }
  }

  const TYPE_LABEL: Record<string, string> = {
    land:       'Đất nông nghiệp',
    product:    'Nông sản',
    service:    'Dịch vụ',
    restaurant: 'Nhà hàng',
    tourism:    'Du lịch',
    rental:     'Cho thuê',
    event:      'Sự kiện',
  }
  const TYPE_COLOR: Record<string, string> = {
    land:    'text-[#34C759]',
    product: 'text-[#FF9500]',
    service: 'text-[#0071E3]',
  }

  const items: ActivityItem[] = []

  for (const row of rows as unknown as { id: string; slug: string; title: string; type: string; province_id: number | null; published_at: string }[]) {
    items.push({
      key:          row.id,
      typeLabel:    TYPE_LABEL[row.type] ?? 'Tin đăng',
      typeColor:    TYPE_COLOR[row.type] ?? 'text-gray-500',
      title:        row.title,
      provinceName: row.province_id ? (provinceMap.get(row.province_id) ?? 'Việt Nam') : 'Việt Nam',
      postedAt:     row.published_at,
      href:         `/dat-nong-nghiep/chi-tiet/${row.slug}`,
    })
  }

  for (const sf of sfRows as { id: string; slug: string; business_name: string; created_at: string }[]) {
    items.push({
      key:          sf.id,
      typeLabel:    'Đại lý',
      typeColor:    'text-[#0071E3]',
      title:        sf.business_name,
      provinceName: 'VIO Local',
      postedAt:     sf.created_at,
      href:         `/doanh-nghiep/${sf.slug}`,
    })
  }

  // Sort newest first, take 12
  items.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
  const final = items.slice(0, 12)

  // Pad with seeds if needed
  if (final.length < 6) {
    return [...final, ...SEED_ACTIVITIES.slice(final.length, 12)]
  }
  return final
}

async function ActivityFeed() {
  const items = await fetchActivityItems()

  return (
    <div>
      <div className="mb-5">
        <h2 className="m-0 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          🔥 Giao dịch mới trên VIO
        </h2>
        <p className="m-0 mt-1 text-[0.8125rem] text-gray-500 dark:text-gray-400">
          Cập nhật hoạt động mới nhất từ thị trường nông thôn
        </p>
      </div>

      {/* Horizontal scroll — no wrap */}
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map(item => (
          <Link
            key={item.key}
            href={item.href}
            className="group flex w-[196px] shrink-0 flex-col justify-between rounded-3xl border border-gray-100 bg-white p-4 no-underline transition-all hover:border-gray-200 hover:shadow-md dark:border-white/[0.07] dark:bg-[#1C1C1E]"
          >
            {/* Header row */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <span className={`text-[0.625rem] font-bold uppercase tracking-[0.08em] ${item.typeColor}`}>
                {item.typeLabel}
              </span>
              <span className="shrink-0 text-[0.625rem] text-gray-400 dark:text-gray-500">
                {timeAgo(item.postedAt)}
              </span>
            </div>

            {/* Title */}
            <p className="m-0 line-clamp-2 flex-1 text-[0.875rem] font-semibold leading-snug text-gray-900 dark:text-white">
              {item.title}
            </p>

            {/* Province */}
            <p className="m-0 mt-3 text-[0.75rem] text-gray-500 dark:text-gray-400">
              📍 {item.provinceName}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  S2 – Hot listings grid
// ─────────────────────────────────────────────────────────────────────────────

type SeedListing = { id: string } & LandListingCardProps

const SEED_LISTINGS: SeedListing[] = [
  { id: 'sl1', slug: 'dat-cao-su-5ha-dong-nai',      title: 'Đất cao su 5 ha, có sổ đỏ',             price_text: '2.5 Tỷ',    location: 'Huyện Cẩm Mỹ, Đồng Nai',     image_url: null, is_featured: true  },
  { id: 'sl2', slug: 'vuon-sau-rieng-3ha-lam-dong',  title: 'Vườn sầu riêng 3 ha đang cho trái',     price_text: '4.2 Tỷ',    location: 'Huyện Đạ Huoai, Lâm Đồng',   image_url: null, is_featured: true  },
  { id: 'sl3', slug: 'dat-trong-tieu-binh-phuoc',    title: 'Đất trồng tiêu 2 ha, năng suất tốt',    price_text: '1.8 Tỷ',    location: 'Huyện Hớn Quản, Bình Phước', image_url: null, is_featured: false },
  { id: 'sl4', slug: 'trai-ga-4ha-dong-nai',         title: 'Trại gà 4 ha, đủ chuồng trại',          price_text: '3.1 Tỷ',    location: 'Huyện Xuân Lộc, Đồng Nai',   image_url: null, is_featured: false },
  { id: 'sl5', slug: 'vuon-dieu-8ha-binh-thuan',     title: 'Vườn điều 8 ha, thu hoạch ổn định',     price_text: '5.0 Tỷ',    location: 'Huyện Đức Linh, Bình Thuận', image_url: null, is_featured: true  },
  { id: 'sl6', slug: 'dat-lua-15ha-an-giang',        title: 'Đất trồng lúa 15 ha, quy hoạch rõ',     price_text: '6.5 Tỷ',    location: 'Huyện Thoại Sơn, An Giang',  image_url: null, is_featured: false },
  { id: 'sl7', slug: 'dat-ca-phe-gia-lai',           title: 'Đất cà phê 10 ha, giá thương lượng',    price_text: '8.0 Tỷ',    location: 'Huyện Chư Prông, Gia Lai',   image_url: null, is_featured: false },
  { id: 'sl8', slug: 'dat-macca-dak-nong',           title: 'Đất trồng mắc-ca 6 ha mới khai thác',  price_text: '3.8 Tỷ',    location: 'Huyện Tuy Đức, Đắk Nông',    image_url: null, is_featured: false },
]

async function fetchHotListings(): Promise<RecommendedListing[]> {
  // Priority 1: trending
  const trending = await getTrendingListings('national', undefined, 8)
  if (trending.length >= 2) return trending

  // Priority 2: featured
  const featured = await getFeaturedListings({ type: 'land', limit: 8 })
  if (featured.length >= 2) return featured.map(l => ({ id: l.id, ...listingToLandCard(l) }))

  // Priority 3: any approved listings
  const { items } = await getListings({ type: 'land', limit: 8 })
  if (items.length >= 2) return items.map(l => ({ id: l.id, ...listingToLandCard(l) }))

  // Seed fallback
  return SEED_LISTINGS
}

async function HotListings() {
  const listings = await fetchHotListings()

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            🔥 Tin đăng nổi bật
          </h2>
          <p className="m-0 mt-1 text-[0.8125rem] text-gray-500 dark:text-gray-400">
            Những tin được quan tâm nhiều nhất
          </p>
        </div>
        <Link
          href="/dat-nong-nghiep"
          className="shrink-0 text-[0.875rem] font-semibold text-[#0071E3] no-underline transition-opacity hover:opacity-70 dark:text-[#409CFF]"
        >
          Xem tất cả →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map(({ id, ...card }) => (
          <TrackableCard key={id} targetId={id} type="discovery">
            <LandListingCard {...card} />
          </TrackableCard>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  S3 – Hot zones (4 fixed provinces)
// ─────────────────────────────────────────────────────────────────────────────

const HOT_ZONE_SLUGS = ['dong-nai', 'binh-phuoc', 'tay-ninh', 'lam-dong'] as const

const ZONE_ICONS: Record<string, string> = {
  'dong-nai':   '🌳',
  'binh-phuoc': '🌿',
  'tay-ninh':   '🌾',
  'lam-dong':   '🏔️',
}

async function fetchHotZones() {
  const supabase = createCachedClient()

  const [provinceRes, listingRes] = await Promise.all([
    supabase
      .from('provinces')
      .select('id, name, slug')
      .in('slug', HOT_ZONE_SLUGS as unknown as string[]),

    supabase
      .from('listings')
      .select('province_id')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .eq('listing_type', 'land')
      .limit(500),
  ])

  const provinces = (provinceRes.data ?? []) as { id: number; name: string; slug: string }[]
  const listings  = (listingRes.data  ?? []) as { province_id: number }[]

  const countMap = new Map<number, number>()
  for (const { province_id } of listings) {
    countMap.set(province_id, (countMap.get(province_id) ?? 0) + 1)
  }

  // Preserve requested order and merge counts
  return HOT_ZONE_SLUGS.map(slug => {
    const p = provinces.find(x => x.slug === slug)
    return {
      slug,
      name:         p?.name ?? slug,
      icon:         ZONE_ICONS[slug] ?? '📍',
      listingCount: p ? (countMap.get(p.id) ?? 0) : 0,
    }
  })
}

async function HotZones() {
  const zones = await fetchHotZones()

  return (
    <div>
      <div className="mb-5">
        <h2 className="m-0 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          🗺️ Điểm nóng giao dịch
        </h2>
        <p className="m-0 mt-1 text-[0.8125rem] text-gray-500 dark:text-gray-400">
          Các khu vực đang có nhiều hoạt động
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {zones.map(zone => (
          <Link
            key={zone.slug}
            href={`/dat-nong-nghiep/${zone.slug}`}
            className="group flex flex-col rounded-3xl border border-gray-100 bg-white p-5 no-underline transition-all hover:border-gray-200 hover:shadow-md dark:border-white/[0.07] dark:bg-[#1C1C1E]"
          >
            <span className="mb-4 text-3xl" aria-hidden="true">{zone.icon}</span>
            <p className="m-0 text-[1rem] font-bold text-gray-900 group-hover:text-[#0071E3] dark:text-white dark:group-hover:text-[#409CFF]">
              {zone.name}
            </p>
            <p className="m-0 mt-1 text-[0.8125rem] text-gray-500 dark:text-gray-400">
              {zone.listingCount > 0
                ? `${zone.listingCount.toLocaleString('vi-VN')} tin đăng`
                : 'Khám phá khu vực'}
            </p>
            <p className="m-0 mt-4 text-[0.8125rem] font-semibold text-[#0071E3] dark:text-[#409CFF]">
              Xem khu vực →
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  S4 – Buy requests
// ─────────────────────────────────────────────────────────────────────────────

interface BuyRequestCard {
  key:         string
  title:       string
  provinceName: string
  quantityText: string | null
  postedAt:    string
  href:        string
}

const SEED_BUY_REQUESTS: BuyRequestCard[] = [
  { key: 'br1', title: 'Cần mua 50 tấn sầu riêng Monthong',         provinceName: 'Bình Phước', quantityText: '50 tấn',   postedAt: new Date(Date.now() - 2  * 3600_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'br2', title: 'Thu mua cao su cốc nhỏ 3L, số lượng lớn',   provinceName: 'Bình Dương', quantityText: '20 tấn',   postedAt: new Date(Date.now() - 4  * 3600_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'br3', title: 'Đặt mua 1.000 kg mật ong rừng nguyên chất', provinceName: 'Đắk Lắk',   quantityText: '1.000 kg', postedAt: new Date(Date.now() - 6  * 3600_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'br4', title: 'Cần nguồn sầu riêng Ri6 xuất khẩu',         provinceName: 'Tiền Giang', quantityText: '100 tấn',  postedAt: new Date(Date.now() - 8  * 3600_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'br5', title: 'Thu mua hạt điều nhân W320, W240',          provinceName: 'Bình Phước', quantityText: '30 tấn',   postedAt: new Date(Date.now() - 10 * 3600_000).toISOString(), href: '/dat-nong-nghiep' },
  { key: 'br6', title: 'Cần mua 200 tấn mía đường, giá tốt',        provinceName: 'Tây Ninh',   quantityText: '200 tấn',  postedAt: new Date(Date.now() - 12 * 3600_000).toISOString(), href: '/dat-nong-nghiep' },
]

async function fetchBuyRequests(): Promise<BuyRequestCard[]> {
  const requests = await getWholesaleOpportunities({ limit: 6 })

  if (!requests.length) return SEED_BUY_REQUESTS

  return requests.map(r => ({
    key:          String(r.id),
    title:        r.title,
    provinceName: 'Việt Nam', // province_id only — would need a join for name
    quantityText: r.quantity_text,
    postedAt:     r.created_at,
    href:         '/dat-nong-nghiep',
  }))
}

async function BuyRequests() {
  const requests = await fetchBuyRequests()

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            📦 Nhu cầu thu mua
          </h2>
          <p className="m-0 mt-1 text-[0.8125rem] text-gray-500 dark:text-gray-400">
            Doanh nghiệp và đại lý đang tìm nguồn hàng
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {requests.map(req => (
          <Link
            key={req.key}
            href={req.href}
            className="group flex flex-col rounded-3xl bg-[#FF9500]/[0.06] p-5 no-underline transition-all hover:bg-[#FF9500]/[0.1] dark:bg-[#FF9500]/[0.08] dark:hover:bg-[#FF9500]/[0.12]"
          >
            {/* Badge */}
            <span className="mb-3 inline-flex w-fit items-center rounded-full bg-[#FF9500]/10 px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[#FF9500]">
              Đang cần mua
            </span>

            {/* Title */}
            <p className="m-0 text-[0.9375rem] font-semibold leading-snug text-gray-900 group-hover:text-[#FF9500] dark:text-white">
              {req.title}
            </p>

            {/* Meta row */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[0.75rem] text-gray-500 dark:text-gray-400">
                {req.quantityText && (
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    📦 {req.quantityText}
                  </span>
                )}
                <span>📍 {req.provinceName}</span>
              </div>
              <span className="shrink-0 text-[0.6875rem] text-gray-400 dark:text-gray-500">
                {timeAgo(req.postedAt)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export — MarketFeedLayer
// ─────────────────────────────────────────────────────────────────────────────

export function MarketFeedLayer() {
  return (
    <div className="space-y-0 divide-y divide-gray-100 dark:divide-white/[0.06]">

      {/* S1 – Activity feed */}
      <div className="px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={null}>
            <ActivityFeed />
          </Suspense>
        </div>
      </div>

      {/* S2 – Hot listings */}
      <div className="px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={null}>
            <HotListings />
          </Suspense>
        </div>
      </div>

      {/* S3 – Hot zones */}
      <div className="bg-gray-50/60 px-4 py-10 dark:bg-[#111]">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={null}>
            <HotZones />
          </Suspense>
        </div>
      </div>

      {/* S4 – Buy requests */}
      <div className="px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={null}>
            <BuyRequests />
          </Suspense>
        </div>
      </div>

    </div>
  )
}
