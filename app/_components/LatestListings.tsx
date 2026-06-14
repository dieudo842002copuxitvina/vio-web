import Link                                 from 'next/link'
import { getListings, getFeaturedListings } from '@/entities/listing/api/listing.server'
import { listingToLandCard }               from '@/entities/listing'
import { TrackableCard }                   from '@/features/recommendation/components/TrackableCard'
import type { LandListingCardProps }       from '@/entities/listing'
import type { Listing }                    from '@/entities/listing'

// ── Type ─────────────────────────────────────────────────────────────────────

type Seed = { id: string } & LandListingCardProps

// ── Mock fallback (10 items: 5-col × 2-row on 2xl, 4-col × 2-row on xl) ─────

const MOCK: Seed[] = [
  { id: 'm01', slug: 'dat-cao-su-5ha-dong-nai',    title: 'Đất cao su 5 ha, sổ đỏ đầy đủ',      price_text: '2.5 Tỷ',  land_area_text: '5 ha',  location: 'Cẩm Mỹ, Đồng Nai',    land_type_label: 'Cao su',      legal_status: 'Sổ đỏ', image_url: null, is_featured: true  },
  { id: 'm02', slug: 'vuon-sau-rieng-3ha-lam-dong', title: 'Vườn sầu riêng 3 ha đang cho trái', price_text: '4.2 Tỷ',  land_area_text: '3 ha',  location: 'Đạ Huoai, Lâm Đồng',  land_type_label: 'Cây ăn trái', legal_status: null,    image_url: null, is_featured: true  },
  { id: 'm03', slug: 'dat-trong-tieu-binh-phuoc',   title: 'Đất trồng tiêu 2 ha, năng suất tốt', price_text: '1.8 Tỷ',  land_area_text: '2 ha',  location: 'Hớn Quản, Bình Phước', land_type_label: 'Tiêu',        legal_status: 'Sổ đỏ', image_url: null, is_featured: false },
  { id: 'm04', slug: 'trai-ga-4ha-xuan-loc',        title: 'Trại gà 4 ha, hệ thống khép kín',   price_text: '3.1 Tỷ',  land_area_text: '4 ha',  location: 'Xuân Lộc, Đồng Nai',   land_type_label: 'Chăn nuôi',  legal_status: null,    image_url: null, is_featured: false },
  { id: 'm05', slug: 'vuon-dieu-8ha-binh-thuan',    title: 'Vườn điều 8 ha, thu hoạch ổn định', price_text: '5.0 Tỷ',  land_area_text: '8 ha',  location: 'Đức Linh, Bình Thuận', land_type_label: 'Điều',        legal_status: 'Sổ đỏ', image_url: null, is_featured: true  },
  { id: 'm06', slug: 'dat-ca-phe-10ha-gia-lai',     title: 'Đất cà phê 10 ha, giá thương lượng', price_text: '8.0 Tỷ',  land_area_text: '10 ha', location: 'Chư Prông, Gia Lai',   land_type_label: 'Cà phê',      legal_status: 'Sổ đỏ', image_url: null, is_featured: false },
  { id: 'm07', slug: 'dat-lua-8ha-an-giang',        title: 'Đất trồng lúa 8 ha An Giang',        price_text: '4.2 Tỷ',  land_area_text: '8 ha',  location: 'Châu Phú, An Giang',   land_type_label: 'Lúa',         legal_status: 'Sổ đỏ', image_url: null, is_featured: false },
  { id: 'm08', slug: 'dat-trong-tieu-binh-phuoc-2', title: 'Đất tiêu 3 ha Bình Phước sổ đỏ',    price_text: '2.4 Tỷ',  land_area_text: '3 ha',  location: 'Lộc Ninh, Bình Phước', land_type_label: 'Tiêu',        legal_status: 'Sổ đỏ', image_url: null, is_featured: false },
  { id: 'm09', slug: 'vuon-mit-thai-tien-giang',    title: 'Vườn mít Thái 2 ha đang thu hoạch',  price_text: '1.6 Tỷ',  land_area_text: '2 ha',  location: 'Cai Lậy, Tiền Giang',  land_type_label: 'Cây ăn trái', legal_status: 'Sổ đỏ', image_url: null, is_featured: false },
  { id: 'm10', slug: 'dat-trong-long-an',           title: 'Đất trồng lúa 5 ha Long An',         price_text: '3.5 Tỷ',  land_area_text: '5 ha',  location: 'Tân Hưng, Long An',    land_type_label: 'Lúa',         legal_status: 'Sổ đỏ', image_url: null, is_featured: false },
]

// ── Category tabs ─────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Đất nông nghiệp', href: '/dat-nong-nghiep', active: true  },
  { label: 'Nông sản',        href: '/nong-san',         active: false },
  { label: 'Vật tư',          href: '/vat-tu',           active: false },
  { label: 'Dịch vụ',         href: '/dich-vu',          active: false },
  { label: 'Máy móc',         href: '/may-nong-nghiep',  active: false },
] as const

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetchLatestListings(): Promise<Seed[]> {
  const { items } = await getListings({ type: 'land', limit: 10 })
  if (items.length >= 4) return items.map((l: Listing) => ({ id: l.id, ...listingToLandCard(l) }))

  const featured = await getFeaturedListings({ type: 'land', limit: 10 })
  if (featured.length >= 2) return featured.map((l: Listing) => ({ id: l.id, ...listingToLandCard(l) }))

  return MOCK
}

// ── Grid card — price-dominant, marketplace density ──────────────────────────

function GridCard({ listing }: { listing: Seed }) {
  const imageBadge = listing.legal_status ?? listing.land_type_label

  const trustBadges = [
    listing.image_url !== null && { label: 'Có ảnh',  bg: '#E8F5E9', fg: '#2E7D32' },
    listing.legal_status === 'Sổ đỏ' && { label: 'Sổ đỏ', bg: '#E3F2FD', fg: '#1565C0' },
  ].filter((b): b is { label: string; bg: string; fg: string } => Boolean(b))

  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${listing.slug}`}
      className="group block overflow-hidden rounded-xl bg-white no-underline
                 ring-1 ring-neutral-200
                 transition-all duration-150 hover:ring-[#2E7D32]/40 hover:shadow-md"
    >
      {/* Image — 4:3 aspect */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#EEF2EE]">
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image_url}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="select-none text-3xl opacity-[0.07]" aria-hidden="true">🌾</span>
          </div>
        )}

        {listing.is_featured && (
          <span
            className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[8px] font-black leading-none text-white"
            style={{ background: '#F9A825' }}
          >
            NỔI BẬT
          </span>
        )}

        {imageBadge && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[8px] font-semibold leading-none text-white">
            {imageBadge}
          </span>
        )}
      </div>

      {/* Body — price dominant */}
      <div className="px-2 pb-2 pt-1.5">
        {/* Price — 28px, weight 800, dark forest green */}
        <p
          className="m-0 truncate text-[1.75rem] font-extrabold leading-none tracking-tight"
          style={{ color: '#1A4D2E' }}
        >
          {listing.price_text ?? '—'}
        </p>

        {/* Title — single line */}
        <p className="m-0 mt-0.5 truncate text-[0.6875rem] font-medium leading-snug text-[#1A1A1A]">
          {listing.title}
        </p>

        {/* Location · area */}
        <p className="m-0 mt-0.5 truncate text-[0.5625rem] leading-none text-neutral-400">
          {[listing.location, listing.land_area_text].filter(Boolean).join(' · ') || ' '}
        </p>

        {/* Trust micro-badges */}
        {trustBadges.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {trustBadges.map(b => (
              <span
                key={b.label}
                className="rounded px-1 py-px text-[8px] font-bold"
                style={{ background: b.bg, color: b.fg }}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function LatestListings() {
  const listings = await fetchLatestListings()

  return (
    <section className="bg-[#F7F9F5] px-4 pb-4 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-1 rounded-full bg-[#2E7D32]" aria-hidden="true" />
            <h2 className="m-0 text-[1rem] font-black text-[#1A1A1A]">Tin đăng mới nhất</h2>
          </div>
          <Link
            href="/dat-nong-nghiep"
            className="shrink-0 text-[0.8125rem] font-semibold no-underline"
            style={{ color: '#2E7D32' }}
          >
            Xem tất cả →
          </Link>
        </div>

        {/* Category tab strip */}
        <div className="-mx-4 mb-2.5 flex overflow-x-auto no-scrollbar sm:mx-0">
          {TABS.map((tab, i) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                'shrink-0 border-b-2 px-4 pb-1.5 pt-0.5 text-[0.8125rem] font-semibold no-underline transition-colors',
                tab.active
                  ? 'border-[#2E7D32] text-[#2E7D32]'
                  : 'border-transparent text-neutral-500 hover:text-[#1A1A1A]',
                i === 0 ? 'sm:pl-0' : '',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Responsive grid:
            mobile  = 2 cols
            1024px  = 3 cols
            1280px  = 4 cols
            1600px+ = 5 cols  */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {listings.map(({ id, ...card }) => (
            <TrackableCard key={id} targetId={id} type="discovery">
              <GridCard listing={{ id, ...card }} />
            </TrackableCard>
          ))}
        </div>

        <div className="mt-3 flex justify-center">
          <Link
            href="/dat-nong-nghiep"
            className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white
                       px-6 text-[0.8125rem] font-semibold text-[#1A1A1A] no-underline
                       transition-all hover:border-neutral-300 hover:bg-neutral-50"
          >
            Xem thêm tin đăng →
          </Link>
        </div>

      </div>
    </section>
  )
}
