import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { LAND_TYPE_LABELS } from '@/features/land-listings/types'
import type { LandType }    from '@/features/land-listings/types'
import { ListingBrowser }   from './_components/listing-browser'
import type { ListingEntry } from './_components/listing-browser'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Khám phá Đất Nông Nghiệp toàn quốc',
  description: 'Mua bán và cho thuê đất nông nghiệp trên toàn 63 tỉnh thành Việt Nam. Đất lúa, cây ăn trái, cây lâu năm, lâm nghiệp và nhiều loại khác.',
  alternates: { canonical: '/dat-nong-nghiep' },
}

// ── Price formatter ────────────────────────────────────────────────────────
// Dùng cho cột price (BIGINT) nếu DB có. Hiện tại DB dùng price_text.

export function formatPrice(amount: number): string {
  if (amount >= 1_000_000_000) {
    const ty = amount / 1_000_000_000
    const str = ty % 1 === 0 ? `${ty}` : ty.toFixed(1).replace(/\.0$/, '')
    return `${str} Tỷ`
  }
  if (amount >= 1_000_000) {
    return `${Math.round(amount / 1_000_000)} Triệu`
  }
  return `${amount.toLocaleString('vi-VN')} đ`
}

// Trích số tỷ từ price_text để dùng cho filter range
function parsePriceTy(text: string | null | undefined): number {
  if (!text) return 0
  const s = text.toLowerCase().replace(/,/g, '.').replace(/\s/g, '')
  const ty    = s.match(/(\d+\.?\d*)tỷ/)
  const trieu = s.match(/(\d+\.?\d*)triệu/)
  if (ty)    return parseFloat(ty[1])
  if (trieu) return parseFloat(trieu[1]) / 1000
  return 0
}

// ── DB row type (select chỉ lấy những cột cần thiết) ──────────────────────

type RawRow = {
  slug:              string
  title:             string
  price_text:        string | null
  land_area_text:    string | null
  land_type:         LandType | null
  legal_status_text: string | null
  province_id:       number | null
  is_featured:       boolean
  land_listing_images: Array<{ image_url: string; sort_order: number }> | null
}

// ── Data fetching ──────────────────────────────────────────────────────────

async function fetchListings(): Promise<ListingEntry[]> {
  const supabase = await createClient()

  const [listingsRes, provincesRes] = await Promise.all([
    supabase
      .from('land_listings')
      .select(`
        slug, title, price_text, land_area_text, land_type,
        legal_status_text, province_id, is_featured,
        land_listing_images ( image_url, sort_order )
      `)
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .order('created_at',  { ascending: false })
      .limit(24),

    supabase.from('provinces').select('id, name, slug'),
  ])

  const rows      = (listingsRes.data ?? []) as RawRow[]
  const provinces = provincesRes.data ?? []

  const nameByPid = new Map(provinces.map(p => [p.id, p.name as string]))
  const slugByPid = new Map(provinces.map(p => [p.id, p.slug as string]))

  return rows.map((l): ListingEntry => {
    const images   = (l.land_listing_images ?? []).sort((a, b) => a.sort_order - b.sort_order)
    const coverUrl = images[0]?.image_url ?? null

    return {
      // ── card display props ──
      slug:             l.slug,
      title:            l.title,
      price_text:       l.price_text,
      land_area_text:   l.land_area_text,
      location:         nameByPid.get(l.province_id ?? 0) ?? null,
      land_type_label:  l.land_type ? LAND_TYPE_LABELS[l.land_type] : null,
      legal_status:     l.legal_status_text,
      image_url:        coverUrl,
      is_featured:      l.is_featured,
      // ── filter metadata ──
      _province_slug:   slugByPid.get(l.province_id ?? 0) ?? '',
      _land_type:       l.land_type ?? '',
      _price_ty:        parsePriceTy(l.price_text),
    }
  })
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function LandIndexPage() {
  const listings = await fetchListings()

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-20">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[0.8125rem] text-gray-400 mb-8">
        <Link href="/" className="text-gray-400 no-underline hover:text-gray-600 transition-colors">
          Trang chủ
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Đất nông nghiệp</span>
      </nav>

      {/* ── iOS Large Title ── */}
      <header className="mb-8">
        <span className="inline-flex items-center mb-3 px-3 py-1 rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15 text-[#34C759] dark:text-[#30D158] text-[0.6875rem] font-bold tracking-[0.1em] uppercase">
          Thị trường đất đai
        </span>
        <h1 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-tight text-gray-900 dark:text-white m-0 leading-tight">
          Khám phá Đất Nông Nghiệp
        </h1>
        <p className="mt-2 text-[0.9375rem] text-gray-500 dark:text-gray-400 leading-relaxed">
          {listings.length > 0
            ? `${listings.length} tin đăng đất đang hiển thị`
            : 'Mua bán & cho thuê đất lúa, cây ăn trái, lâm nghiệp toàn quốc.'}
        </p>
      </header>

      {/* Filter pills + grid (Client Component) */}
      <ListingBrowser listings={listings} />

    </main>
  )
}
