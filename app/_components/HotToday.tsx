import Link                      from 'next/link'
import { ImageIcon }             from 'lucide-react'
import { getFeaturedListings }   from '@/entities/listing/api/listing.server'
import { listingToLandCard }     from '@/entities/listing'
import type { Listing }          from '@/entities/listing'
import type { LandListingCardProps } from '@/entities/listing'

// ── Type ─────────────────────────────────────────────────────────────────────

type HotItem = { id: string } & LandListingCardProps

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK: HotItem[] = [
  { id: 'm1', slug: 'dat-cao-su-5ha-dong-nai',    title: 'Đất cao su 5ha, sổ đỏ đầy đủ',     price_text: '2.5 Tỷ', land_area_text: '5 ha',  location: 'Đồng Nai',   land_type_label: 'Cao su',      legal_status: 'Sổ đỏ', image_url: null, is_featured: true  },
  { id: 'm2', slug: 'vuon-sau-rieng-3ha-lam-dong', title: 'Vườn sầu riêng 3ha đang cho trái', price_text: '4.2 Tỷ', land_area_text: '3 ha',  location: 'Lâm Đồng',  land_type_label: 'Cây ăn trái', legal_status: null,    image_url: null, is_featured: true  },
  { id: 'm3', slug: 'dat-ca-phe-10ha-gia-lai',     title: 'Đất cà phê 10ha Gia Lai',          price_text: '8.0 Tỷ', land_area_text: '10 ha', location: 'Gia Lai',    land_type_label: 'Cà phê',      legal_status: 'Sổ đỏ', image_url: null, is_featured: true  },
  { id: 'm4', slug: 'trai-ga-4ha-xuan-loc',        title: 'Trại gà 4ha hệ thống khép kín',    price_text: '3.1 Tỷ', land_area_text: '4 ha',  location: 'Đồng Nai',   land_type_label: 'Chăn nuôi',  legal_status: null,    image_url: null, is_featured: true  },
  { id: 'm5', slug: 'vuon-dieu-8ha-binh-thuan',    title: 'Vườn điều 8ha, thu hoạch ổn định', price_text: '5.0 Tỷ', land_area_text: '8 ha',  location: 'Bình Thuận', land_type_label: 'Điều',        legal_status: 'Sổ đỏ', image_url: null, is_featured: true  },
  { id: 'm6', slug: 'vuon-cao-su-dong-nai-2',      title: 'Vườn cao su 7ha đang khai thác',   price_text: '6.5 Tỷ', land_area_text: '7 ha',  location: 'Đồng Nai',   land_type_label: 'Cao su',      legal_status: 'Sổ đỏ', image_url: null, is_featured: true  },
  { id: 'm7', slug: 'dat-lua-8ha-an-giang',        title: 'Đất trồng lúa 8ha An Giang',       price_text: '4.2 Tỷ', land_area_text: '8 ha',  location: 'An Giang',   land_type_label: 'Lúa',         legal_status: 'Sổ đỏ', image_url: null, is_featured: true  },
  { id: 'm8', slug: 'dat-trong-tieu-binh-phuoc-2', title: 'Đất tiêu 3ha Bình Phước sổ đỏ',   price_text: '2.4 Tỷ', land_area_text: '3 ha',  location: 'Bình Phước', land_type_label: 'Tiêu',        legal_status: 'Sổ đỏ', image_url: null, is_featured: true  },
]

// ── Data ─────────────────────────────────────────────────────────────────────

async function fetchHotItems(): Promise<HotItem[]> {
  const featured = await getFeaturedListings({ type: 'land', limit: 10 })
  if (featured.length >= 3) {
    return featured.map((l: Listing) => ({ id: l.id, ...listingToLandCard(l) }))
  }
  return MOCK
}

// ── Card ─────────────────────────────────────────────────────────────────────

function HotCard({ item }: { item: HotItem }) {
  return (
    <Link
      href={`/dat-nong-nghiep/chi-tiet/${item.slug}`}
      className="group block w-[152px] shrink-0 rounded-[18px] bg-white p-2.5 no-underline
                 ring-1 ring-black/5 shadow-sm
                 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      {/* Square image — fallback always rendered, image floats on top */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
        <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
          <ImageIcon size={26} className="text-gray-300" strokeWidth={1.25} />
        </div>
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover
                       transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        )}
        {item.is_featured && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5
                           text-[9px] font-bold leading-none text-white">
            Hot
          </span>
        )}
      </div>

      {/* Content */}
      <div className="mt-2.5">
        <p className="m-0 text-[0.9375rem] font-bold leading-none text-green-700">
          {item.price_text ?? 'Liên hệ'}
        </p>
        <p className="m-0 mt-1 line-clamp-2 text-xs font-medium leading-snug text-gray-900">
          {item.title}
        </p>
        {item.location && (
          <p className="m-0 mt-1 truncate text-[11px] text-gray-400">{item.location}</p>
        )}
      </div>
    </Link>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function HotToday() {
  const items = await fetchHotItems()

  return (
    <section
      aria-labelledby="hot-today-heading"
      className="px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2
              id="hot-today-heading"
              className="text-2xl font-bold tracking-tight text-gray-900"
            >
              Hàng hot hôm nay
            </h2>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-500">
              🔥 ĐANG HOT
            </span>
          </div>
          <Link
            href="/dat-nong-nghiep?sort=featured"
            className="text-sm font-semibold text-green-700 no-underline hover:underline"
          >
            Xem thêm →
          </Link>
        </div>

        <div className="-mx-4 flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2 sm:mx-0 sm:px-0">
          {items.map(item => (
            <HotCard key={item.id} item={item} />
          ))}
        </div>

      </div>
    </section>
  )
}
