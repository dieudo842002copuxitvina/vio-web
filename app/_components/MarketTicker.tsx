'use client'

import Link from 'next/link'

// ── Local type — compatible with ActivityListing from page.tsx ────────────────
interface TickerItem {
  id:         string
  slug:       string
  title:      string
  price_text: string | null
  location:   string | null
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK: TickerItem[] = [
  { id: 'a1', slug: 'dat-cao-su-5ha-dong-nai',    title: 'Đất cao su 5ha, sổ đỏ',         price_text: '2.5 Tỷ',   location: 'Đồng Nai'   },
  { id: 'a2', slug: 'ca-phe-nhan-xo-500kg',        title: 'Cà phê nhân xô 500kg',          price_text: '68k/kg',   location: 'Đắk Lắk'   },
  { id: 'a3', slug: 'vuon-sau-rieng-3ha-lam-dong', title: 'Vườn sầu riêng 3ha',            price_text: '4.2 Tỷ',   location: 'Lâm Đồng'  },
  { id: 'a4', slug: 'dat-trong-tieu-binh-phuoc',   title: 'Đất trồng tiêu 2ha',            price_text: '1.8 Tỷ',   location: 'Bình Phước' },
  { id: 'a5', slug: 'may-gat-dap-lien-hop',        title: 'Máy gặt đập liên hợp Kubota',  price_text: '380 Tr',   location: 'An Giang'   },
  { id: 'a6', slug: 'phan-bon-npk-dong-nai',       title: 'Phân bón NPK 20-20-15',         price_text: '520k/bao', location: 'Đồng Nai'   },
  { id: 'a7', slug: 'lua-giong-st25-soc-trang',    title: 'Lúa giống ST25 mùa vụ 2025',   price_text: '18k/kg',   location: 'Sóc Trăng'  },
  { id: 'a8', slug: 'vuon-dieu-8ha-binh-thuan',    title: 'Vườn điều 8ha, cận thu hoạch', price_text: '5.0 Tỷ',   location: 'Bình Thuận' },
  { id: 'a9', slug: 'dat-ca-phe-10ha-gia-lai',     title: 'Đất cà phê 10ha Gia Lai',       price_text: '8.0 Tỷ',   location: 'Gia Lai'    },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketTicker({ items }: { items: TickerItem[] }) {
  const feed = items.length > 0 ? items : MOCK
  const doubled = [...feed, ...feed]

  return (
    <div className="overflow-hidden bg-[#0D2E1A] py-1.5" aria-label="Hoạt động thị trường mới nhất">
      <div
        className="flex gap-8 whitespace-nowrap"
        style={{ animation: 'ticker-scroll 40s linear infinite', width: 'max-content' }}
        aria-hidden="true"
      >
        {doubled.map((item, i) => (
          <Link
            key={`${item.id}-${i}`}
            href={`/dat-nong-nghiep/chi-tiet/${item.slug}`}
            className="inline-flex items-center gap-2 no-underline"
            tabIndex={-1}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#66BB6A]" />
            <span className="text-[0.75rem] font-semibold text-white/85">
              {item.title}
            </span>
            {item.location && (
              <span className="text-[0.6875rem] text-white/40">{item.location}</span>
            )}
            {item.price_text && (
              <span className="text-[0.75rem] font-black text-[#F9A825]">
                {item.price_text}
              </span>
            )}
            <span className="text-white/15" aria-hidden="true">·</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
