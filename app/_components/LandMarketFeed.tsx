import { LandListingCard } from './LandListingCard'
import type { LandListing } from '@/types/land'

// ── Mock data — 10 realistic Vietnamese agricultural land listings ─────────────
// Replace with a live Supabase query once the listings table is seeded.

const MOCK_LISTINGS: LandListing[] = [
  {
    id:              'm1',
    title:           'Vườn sầu riêng đang thu hoạch, có sẵn nhà cấp 4, giếng nước tưới',
    price:           '4.2 Tỷ',
    area_sqm:        15_000,
    location_text:   'Huyện Đạ Huoai, Lâm Đồng',
    legal_status:    'so_do',
    image_url:       null,
    is_featured:     true,
    seller_verified: true,
  },
  {
    id:              'm2',
    title:           'Trang trại heo rừng 3 ha, đường nhựa tráng, điện 3 pha, chuồng trại đầy đủ',
    price:           '2.8 Tỷ',
    area_sqm:        30_000,
    location_text:   'Huyện Chơn Thành, Bình Phước',
    legal_status:    'so_do',
    image_url:       null,
    is_featured:     false,
    seller_verified: true,
  },
  {
    id:              'm3',
    title:           'Đất lúa 2 vụ bằng phẳng, hệ thống thủy lợi đầu tư bài bản',
    price:           '1.1 Tỷ',
    area_sqm:        5_000,
    location_text:   'Huyện Tháp Mười, Đồng Tháp',
    legal_status:    'so_hong',
    image_url:       null,
    is_featured:     false,
    seller_verified: false,
  },
  {
    id:              'm4',
    title:           'Rừng trồng keo tai tượng 7 năm tuổi, sắp đến chu kỳ khai thác',
    price:           '3.5 Tỷ',
    area_sqm:        50_000,
    location_text:   'Huyện Định Hóa, Thái Nguyên',
    legal_status:    'so_do',
    image_url:       null,
    is_featured:     true,
    seller_verified: false,
  },
  {
    id:              'm5',
    title:           'Vườn chôm chôm, mít Thái xen canh, thu hoạch quanh năm',
    price:           '2.3 Tỷ',
    area_sqm:        12_000,
    location_text:   'Huyện Chợ Lách, Bến Tre',
    legal_status:    'so_do',
    image_url:       null,
    is_featured:     false,
    seller_verified: true,
  },
  {
    id:              'm6',
    title:           'Trang trại tổng hợp: ao cá tra, chuồng gà, vườn tiêu đang khai thác',
    price:           '5.8 Tỷ',
    area_sqm:        80_000,
    location_text:   'Huyện Ea Súp, Đắk Lắk',
    legal_status:    'so_do',
    image_url:       null,
    is_featured:     true,
    seller_verified: true,
  },
  {
    id:              'm7',
    title:           'Đất vườn hồ tiêu 2 ha, năng suất ổn định, cách QL14 chỉ 500m',
    price:           '3.0 Tỷ',
    area_sqm:        20_000,
    location_text:   'Huyện Lộc Ninh, Bình Phước',
    legal_status:    'so_do',
    image_url:       null,
    is_featured:     false,
    seller_verified: true,
  },
  {
    id:              'm8',
    title:           'Đất rẫy cà phê Arabica cao nguyên, khí hậu mát, thổ nhưỡng đỏ bazan',
    price:           '1.9 Tỷ',
    area_sqm:        8_000,
    location_text:   'Huyện Lạc Dương, Lâm Đồng',
    legal_status:    'so_hong',
    image_url:       null,
    is_featured:     false,
    seller_verified: false,
  },
  {
    id:              'm9',
    title:           'Khu đất nông nghiệp quy hoạch khu công nghiệp, tiềm năng chuyển đổi cao',
    price:           null,
    area_sqm:        200_000,
    location_text:   'Huyện Bàu Bàng, Bình Dương',
    legal_status:    'so_do',
    image_url:       null,
    is_featured:     true,
    seller_verified: true,
  },
  {
    id:              'm10',
    title:           'Vườn thanh long ruột đỏ xuất khẩu, đã có hợp đồng tiêu thụ dài hạn',
    price:           '2.6 Tỷ',
    area_sqm:        18_000,
    location_text:   'Huyện Hàm Thuận Nam, Bình Thuận',
    legal_status:    'so_do',
    image_url:       null,
    is_featured:     false,
    seller_verified: true,
  },
]

// ── Section ───────────────────────────────────────────────────────────────────

export function LandMarketFeed() {
  return (
    <section aria-labelledby="land-feed-heading">
      <h2
        id="land-feed-heading"
        className="mb-4 text-xl font-bold tracking-tight text-gray-900"
      >
        Bất động sản nông nghiệp mới nhất
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        {MOCK_LISTINGS.map(listing => (
          <LandListingCard key={listing.id} {...listing} />
        ))}
      </div>
    </section>
  )
}
