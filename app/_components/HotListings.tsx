import { LandListingCard, type LandListingCardProps, listingToLandCard } from '@/entities/listing'
import { getFeaturedListings, getListings } from '@/entities/listing/api/listing.server'
import { getTrendingListings }    from '@/features/recommendation/api/recommendation.server'
import { TrackableCard }          from '@/features/recommendation/components/TrackableCard'
import type { RecommendedListing } from '@/features/recommendation/types'
import { SectionHeader }          from '@/shared/ui/section-header'

// ── Seed — shown when DB has no data ─────────────────────────────────────────

type Seed = { id: string } & LandListingCardProps

const MOCK: Seed[] = [
  { id: 'm1', slug: 'dat-cao-su-5ha-dong-nai',    title: 'Đất cao su 5 ha, sổ đỏ đầy đủ',               price_text: '2.5 Tỷ', land_area_text: '5 ha',  location: 'Huyện Cẩm Mỹ, Đồng Nai',     land_type_label: 'Cao su',     legal_status: 'Sổ đỏ',    image_url: null, is_featured: true  },
  { id: 'm2', slug: 'vuon-sau-rieng-3ha-lam-dong', title: 'Vườn sầu riêng 3 ha đang cho trái',            price_text: '4.2 Tỷ', land_area_text: '3 ha',  location: 'Huyện Đạ Huoai, Lâm Đồng',   land_type_label: 'Cây ăn trái', legal_status: null,       image_url: null, is_featured: true  },
  { id: 'm3', slug: 'dat-trong-tieu-binh-phuoc',   title: 'Đất trồng tiêu 2 ha, năng suất tốt',           price_text: '1.8 Tỷ', land_area_text: '2 ha',  location: 'Huyện Hớn Quản, Bình Phước', land_type_label: 'Tiêu',       legal_status: 'Sổ đỏ',    image_url: null, is_featured: false },
  { id: 'm4', slug: 'trai-ga-4ha-xuan-loc',        title: 'Trại gà 4 ha, hệ thống khép kín',             price_text: '3.1 Tỷ', land_area_text: '4 ha',  location: 'Huyện Xuân Lộc, Đồng Nai',   land_type_label: 'Chăn nuôi', legal_status: null,       image_url: null, is_featured: false },
  { id: 'm5', slug: 'vuon-dieu-8ha-binh-thuan',    title: 'Vườn điều 8 ha, thu hoạch ổn định',            price_text: '5.0 Tỷ', land_area_text: '8 ha',  location: 'Huyện Đức Linh, Bình Thuận', land_type_label: 'Điều',       legal_status: 'Sổ đỏ',    image_url: null, is_featured: true  },
  { id: 'm6', slug: 'dat-lua-15ha-an-giang',       title: 'Đất trồng lúa 15 ha, quy hoạch rõ ràng',       price_text: '6.5 Tỷ', land_area_text: '15 ha', location: 'Huyện Thoại Sơn, An Giang',  land_type_label: 'Lúa',        legal_status: null,       image_url: null, is_featured: false },
  { id: 'm7', slug: 'dat-ca-phe-10ha-gia-lai',     title: 'Đất cà phê 10 ha, giá thương lượng',           price_text: '8.0 Tỷ', land_area_text: '10 ha', location: 'Huyện Chư Prông, Gia Lai',   land_type_label: 'Cà phê',     legal_status: 'Sổ đỏ',    image_url: null, is_featured: false },
  { id: 'm8', slug: 'dat-macca-6ha-dak-nong',      title: 'Đất mắc-ca 6 ha mới bắt đầu thu hoạch',       price_text: '3.8 Tỷ', land_area_text: '6 ha',  location: 'Huyện Tuy Đức, Đắk Nông',    land_type_label: 'Mắc-ca',    legal_status: null,       image_url: null, is_featured: false },
]

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetchListings(): Promise<RecommendedListing[]> {
  const trending = await getTrendingListings('national', undefined, 8)
  if (trending.length >= 2) return trending

  const featured = await getFeaturedListings({ type: 'land', limit: 8 })
  if (featured.length >= 2) return featured.map(l => ({ id: l.id, ...listingToLandCard(l) }))

  const { items } = await getListings({ type: 'land', limit: 8 })
  if (items.length >= 2) return items.map(l => ({ id: l.id, ...listingToLandCard(l) }))

  return MOCK
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function HotListings() {
  const listings = await fetchListings()

  return (
    <section className="px-4 section-y">
      <div className="mx-auto max-w-7xl">

        <SectionHeader
          kicker="Đang được quan tâm"
          title="Tin đăng nổi bật"
          action={{ label: 'Xem tất cả →', href: '/dat-nong-nghiep' }}
          className="mb-8"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map(({ id, ...card }) => (
            <TrackableCard key={id} targetId={id} type="discovery">
              <LandListingCard {...card} />
            </TrackableCard>
          ))}
        </div>

      </div>
    </section>
  )
}
