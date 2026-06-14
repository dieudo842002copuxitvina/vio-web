import { notFound, redirect } from 'next/navigation'
import type { Metadata }      from 'next'
import Link                   from 'next/link'
import { createClient }       from '@/lib/supabase/server'
import { LandListingCard }    from '@/entities/listing'
import { listingToLandCard }  from '@/entities/listing'
import { getPageState, getRobotsMeta } from '@/lib/seo/thin-page'
import { breadcrumbSchema, placeSchema, itemListSchema } from '@/lib/seo/schema'
import { getLandListingsByProvinceSEO } from '@/features/seo/api/seo-feeds.server'
import { seoRowToListing }              from '@/features/seo/api/seo-utils'
import { getTrendingListings }          from '@/features/recommendation/api/recommendation.server'
import { TrackableCard }                from '@/features/recommendation/components/TrackableCard'
import { faqPageSchema }                from '@/lib/seo/schema'
import type { Province } from '@/lib/geo/types'
import { ProvinceAgriSection }          from './_components/ProvinceAgriSection'
import { ProvinceAtlasSection }         from './_components/ProvinceAtlasSection'

// ── SEO content by region ───────────────────────────────────────────────────

const REGION_CONTENT: Record<string, { headline: string; body: string; tags: string[] }> = {
  'Đồng bằng sông Hồng': {
    headline: 'Vựa lúa phía Bắc',
    body:     'Vùng đồng bằng màu mỡ, thích hợp trồng lúa nước, rau màu và cây ăn quả. Hệ thống kênh mương thủy lợi hoàn chỉnh, giao thông thuận tiện. Đất nông nghiệp tại đây được định giá ổn định và có tính thanh khoản cao.',
    tags:     ['Đất lúa', 'Rau màu', 'Cây ăn quả', 'Trang trại rau sạch'],
  },
  'Đồng bằng sông Cửu Long': {
    headline: 'Vựa trái cây và thủy sản',
    body:     'Đồng bằng sông Cửu Long nổi tiếng với vườn cây ăn trái (sầu riêng, xoài, bưởi) và nuôi trồng thuỷ sản (tôm, cá tra). Khí hậu nhiệt đới, đất phù sa giàu dinh dưỡng, phù hợp nông nghiệp thâm canh và xuất khẩu.',
    tags:     ['Cây ăn trái', 'Nuôi thuỷ sản', 'Đất lúa', 'Trang trại'],
  },
  'Tây Nguyên': {
    headline: 'Thủ phủ cà phê và hồ tiêu',
    body:     'Tây Nguyên là vùng trọng điểm cà phê, hồ tiêu, cao su và điều của Việt Nam. Đất đỏ bazan màu mỡ, khí hậu mát mẻ, phù hợp cây công nghiệp dài ngày và cây ăn quả ôn đới. Nhiều cơ hội đầu tư đất nông nghiệp quy mô lớn.',
    tags:     ['Cà phê', 'Hồ tiêu', 'Cao su', 'Cây lâu năm'],
  },
  'Đông Nam Bộ': {
    headline: 'Vùng cây công nghiệp và nông nghiệp đô thị',
    body:     'Vùng Đông Nam Bộ có nền nông nghiệp đa dạng: cao su, điều, cây ăn trái đặc sản và rau sạch phục vụ TP.HCM. Giao thông thuận lợi, thị trường tiêu thụ lớn, thích hợp đầu tư trang trại và nông nghiệp công nghệ cao.',
    tags:     ['Cao su', 'Cây ăn trái', 'Rau sạch', 'Cây lâu năm'],
  },
  'Bắc Trung Bộ': {
    headline: 'Đất đồi và rừng kinh tế',
    body:     'Bắc Trung Bộ có địa hình đa dạng từ đồng bằng ven biển đến đồi núi, phù hợp trồng cao su, keo tràm và cây ăn quả. Đất rừng kinh tế có giá trị đầu tư dài hạn, đặc biệt tại các huyện miền núi.',
    tags:     ['Rừng kinh tế', 'Cao su', 'Cây ăn quả', 'Lâm nghiệp'],
  },
  'Duyên hải miền Trung': {
    headline: 'Nông nghiệp ven biển',
    body:     'Duyên hải miền Trung có thế mạnh nuôi trồng thuỷ sản ven biển, làm muối và trồng cây ăn quả nhiệt đới. Đất nông nghiệp ven biển ngày càng được quan tâm với sự phát triển của du lịch nông nghiệp và nông sản đặc sản địa phương.',
    tags:     ['Nuôi thuỷ sản', 'Muối', 'Cây ăn quả', 'Nông nghiệp ven biển'],
  },
  'Trung du miền núi phía Bắc': {
    headline: 'Vùng chè và đặc sản núi rừng',
    body:     'Vùng núi phía Bắc nổi tiếng với chè Shan tuyết, quế, hồi và nhiều loại nông sản đặc sản. Đất đồi núi phù hợp trồng chè, cây lâu năm và rừng kinh tế. Tiềm năng lớn cho du lịch nông nghiệp kết hợp canh tác bền vững.',
    tags:     ['Chè', 'Quế hồi', 'Rừng kinh tế', 'Cây đặc sản'],
  },
}

export const revalidate = 3600

// ── Province FAQ data ───────────────────────────────────────────────────────

function buildProvinceFAQ(provinceName: string, provinceNameFull: string): Array<{ question: string; answer: string }> {
  return [
    {
      question: `Giá đất nông nghiệp tại ${provinceName} hiện nay là bao nhiêu?`,
      answer:   `Giá đất nông nghiệp tại ${provinceNameFull} dao động tùy loại đất và vị trí. Đất lúa vùng đồng bằng thường từ 300–800 triệu/1.000m². Đất vườn cây ăn trái có thể từ 500 triệu đến vài tỷ đồng/1.000m² tùy giống cây và năng suất. Xem danh sách tin đăng cập nhật trên VIO AGRI để có giá thực tế theo từng khu vực.`,
    },
    {
      question: `Mua đất nông nghiệp tại ${provinceName} cần giấy tờ gì?`,
      answer:   `Khi mua đất nông nghiệp tại ${provinceName}, bạn cần: (1) Sổ đỏ hoặc Sổ hồng hợp lệ của người bán, (2) Giấy CMND/CCCD hai bên, (3) Hợp đồng chuyển nhượng quyền sử dụng đất công chứng, (4) Tờ khai thuế thu nhập cá nhân và lệ phí trước bạ. Nên thuê luật sư địa phương kiểm tra quy hoạch trước khi ký hợp đồng.`,
    },
    {
      question: `Đất nông nghiệp tại ${provinceName} có chuyển mục đích sử dụng được không?`,
      answer:   `Việc chuyển mục đích sử dụng đất nông nghiệp sang đất ở tại ${provinceName} phụ thuộc vào quy hoạch sử dụng đất của địa phương và phê duyệt của UBND cấp tỉnh/huyện. Đất nằm trong khu vực quy hoạch đô thị hoặc đất lúa được bảo vệ thường không được phép chuyển đổi. Cần tra cứu quy hoạch tại Phòng Tài nguyên & Môi trường địa phương.`,
    },
    {
      question: `Có nên đầu tư đất nông nghiệp tại ${provinceName} không?`,
      answer:   `${provinceName} có tiềm năng nông nghiệp đặc thù theo từng vùng. Nhà đầu tư nên xem xét: khả năng canh tác thực tế (loại cây phù hợp, nguồn nước, khí hậu), tính thanh khoản của bất động sản trong vùng, và xu hướng quy hoạch trong 5–10 năm tới. Đất gần khu công nghiệp nông nghiệp hoặc vùng chuyên canh xuất khẩu có xu hướng tăng giá tốt hơn.`,
    },
    {
      question: `Làm sao để xác minh tính pháp lý đất nông nghiệp tại ${provinceName}?`,
      answer:   `Để xác minh pháp lý đất nông nghiệp tại ${provinceName}: (1) Yêu cầu bản gốc sổ đỏ/sổ hồng và kiểm tra tại Văn phòng Đăng ký Đất đai cấp huyện, (2) Kiểm tra xem đất có đang thế chấp ngân hàng không, (3) Tra cứu quy hoạch sử dụng đất tại UBND xã/huyện, (4) Xem bản đồ địa chính để xác nhận ranh giới thực địa. VIO AGRI chỉ hiển thị tin đăng có xác thực pháp lý.`,
    },
    {
      question: `Đất nông nghiệp tại ${provinceName} có cho thuê được không?`,
      answer:   `Có, đất nông nghiệp tại ${provinceName} được phép cho thuê theo quy định pháp luật. Hợp đồng thuê cần công chứng nếu thời hạn từ 1 năm trở lên. Thời hạn thuê không vượt quá thời hạn sử dụng đất còn lại trên sổ đỏ. Giá thuê đất nông nghiệp tại ${provinceName} thường từ 3–10 triệu đồng/1.000m²/năm tùy vị trí và loại đất.`,
    },
  ]
}

// ── FAQ Component ───────────────────────────────────────────────────────────

function FAQModule({ items }: { items: Array<{ question: string; answer: string }> }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-16">
      <div className="mb-5">
        <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">
          Giải đáp thắc mắc
        </p>
        <h2 id="faq-heading" className="mt-1 text-xl font-bold tracking-tight text-gray-900">
          Câu hỏi thường gặp
        </h2>
      </div>
      <div className="divide-y divide-gray-100 rounded-[20px] border border-gray-200 bg-white">
        {items.map((item, i) => (
          <details key={i} className="group px-5 py-4 open:pb-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <span className="text-[0.9375rem] font-semibold text-gray-900 leading-snug">
                {item.question}
              </span>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                               bg-gray-100 text-gray-500 group-open:bg-green-100 group-open:text-green-700
                               transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                     className="group-open:rotate-45 transition-transform duration-200">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round"/>
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-gray-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

// ── Geo resolution ─────────────────────────────────────────────────────────

async function resolveProvince(slug: string): Promise<{ province: Province; redirectSlug?: string } | null> {
  const supabase = await createClient()

  const { data: direct } = await supabase
    .from('provinces')
    .select('id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (direct) return { province: direct as Province }

  const { data: alias } = await supabase
    .from('geographic_aliases')
    .select('provinces!inner(id, code, name, name_full, slug, type, region, lat, lng, created_at, updated_at)')
    .eq('alias_slug', slug)
    .eq('entity_type', 'province')
    .maybeSingle()

  if (alias?.provinces) {
    const prov = Array.isArray(alias.provinces) ? alias.provinces[0] : alias.provinces
    return { province: prov as Province, redirectSlug: prov.slug }
  }

  return null
}

// ── generateMetadata ────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ province: string }> },
): Promise<Metadata> {
  const { province: slug } = await params
  const result = await resolveProvince(slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { province } = result
  const title       = `Đất nông nghiệp tại ${province.name_full}`
  const description = `Danh sách đất nông nghiệp cần bán và cho thuê tại ${province.name_full}. Đất lúa, cây ăn trái, cây lâu năm và nhiều loại đất khác.`

  const enc   = encodeURIComponent
  const ogUrl = `/api/og?type=province&name=${enc(province.name)}&count=0&region=${enc(province.region ?? '')}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:    `/dat-nong-nghiep/${province.slug}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogUrl] },
    alternates: { canonical: `/dat-nong-nghiep/${province.slug}` },
  }
}

// ── Land type quick filters ─────────────────────────────────────────────────

const LAND_TYPES = [
  { label: 'Tất cả',        value: ''          },
  { label: '🌾 Đất lúa',    value: 'lua'        },
  { label: '🌳 Cây ăn trái', value: 'an_trai'   },
  { label: '🌿 Cây lâu năm', value: 'cay_lau_nam' },
  { label: '🌊 Mặt nước',   value: 'mat_nuoc'   },
  { label: '🌲 Lâm nghiệp', value: 'lam_nghiep' },
] as const

// ── Page ────────────────────────────────────────────────────────────────────

export default async function LandProvincePage(
  { params }: { params: Promise<{ province: string }> },
) {
  const { province: slug } = await params

  const result = await resolveProvince(slug)
  if (!result) notFound()

  const { province, redirectSlug } = result
  if (redirectSlug) redirect(`/dat-nong-nghiep/${redirectSlug}`, 301 as never)

  const supabase = await createClient()

  const [{ items, total }, recommendations, districtsResult, listingDistrictRows] =
    await Promise.all([
      getLandListingsByProvinceSEO(province.id, { type: 'land' }),
      getTrendingListings('province', province.id, 6),
      supabase
        .from('districts')
        .select('id, name, slug')
        .eq('province_id', province.id)
        .order('name'),
      supabase
        .from('listings')
        .select('district_id')
        .eq('province_id', province.id)
        .eq('is_public', true)
        .eq('moderation_status', 'approved')
        .limit(500),
    ])

  // Build district → listing count map
  const districtCountMap = new Map<string, number>()
  for (const row of (listingDistrictRows.data ?? [])) {
    if (!row.district_id) continue
    districtCountMap.set(row.district_id, (districtCountMap.get(row.district_id) ?? 0) + 1)
  }

  // Districts with at least 1 listing, sorted by count desc
  const districts = (districtsResult.data ?? [])
    .map(d => ({ ...d, count: districtCountMap.get(d.id) ?? 0 }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)

  const regionContent = province.region ? REGION_CONTENT[province.region] ?? null : null

  const pageState = getPageState('province', total)
  if (pageState === 'not-found') notFound()
  const robots = getRobotsMeta(pageState)

  const displayCount = total > 0
    ? total.toLocaleString('vi-VN')
    : '0'

  // ── Structured data ────────────────────────────────────────────────────────
  const faqItems         = buildProvinceFAQ(province.name, province.name_full)
  const schemaFaq        = faqPageSchema(faqItems)

  const schemaBreadcrumb = breadcrumbSchema([
    { name: 'Trang chủ',       href: '/' },
    { name: 'Đất nông nghiệp', href: '/dat-nong-nghiep' },
    { name: province.name },
  ])

  const schemaPlace = placeSchema({
    name:        province.name_full,
    description: `Đất nông nghiệp tại ${province.name_full}`,
    lat:         province.lat,
    lng:         province.lng,
  })

  const schemaItems = items.length > 0
    ? itemListSchema({
        name:  `Đất nông nghiệp tại ${province.name}`,
        items: items.map(row => ({ slug: row.slug, title: row.title })),
      })
    : null

  return (
    <>
      <meta name="robots" content={robots} />

      {/* Structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaPlace) }} />
      {schemaItems && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaItems) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFaq) }} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-gray-200/60 bg-[#FBFBFD]">

        {/* Ambient glow orbs */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full
                     bg-green-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full
                     bg-emerald-100/50 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-8 md:px-8 md:pb-14 md:pt-10">

          {/* Breadcrumb */}
          <nav
            className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-gray-400"
            aria-label="Điều hướng vị trí"
          >
            <Link href="/" className="no-underline transition-colors hover:text-gray-600">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <Link href="/dat-nong-nghiep" className="no-underline transition-colors hover:text-gray-600">Đất nông nghiệp</Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-gray-900">{province.name}</span>
          </nav>

          {/* Live count badge */}
          {total > 0 && (
            <div className="mt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3.5 py-1.5
                               text-[0.75rem] font-semibold text-green-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
                {displayCount} tin đăng đang hoạt động
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="mt-4 text-[2.25rem] font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            Đất nông nghiệp
            <br />
            <span className="text-green-700">{province.name_full}</span>
          </h1>

          <p className="mt-3 max-w-xl text-[1rem] leading-relaxed text-gray-500">
            Mua bán và cho thuê đất nông nghiệp tại {province.name}.
            Kết nối trực tiếp với chủ đất — không qua môi giới.
          </p>

          {/* Quick type filters — "Tất cả" stays on province page; typed filters go to search */}
          <div className="mt-6 flex flex-wrap gap-2">
            {LAND_TYPES.map(t => (
              <Link
                key={t.value}
                href={t.value
                  ? `/tim-kiem?province=${province.slug}&land_type=${t.value}`
                  : `/dat-nong-nghiep/${province.slug}`}
                className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5
                           text-[0.8125rem] font-medium text-gray-600 no-underline
                           transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700
                           active:scale-[0.96]"
              >
                {t.label}
              </Link>
            ))}
          </div>

        </div>
      </div>

      {/* ── Listings ─────────────────────────────────────────────────────── */}
      <main className="bg-[#FBFBFD] px-4 pb-20 pt-8 md:px-8">
        <div className="mx-auto max-w-5xl">

          {/* Thin page notice */}
          {pageState === 'noindex' && total > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="m-0 text-[0.875rem] leading-relaxed text-amber-800">
                {province.name_full} hiện có{' '}
                <strong className="font-semibold">{total}</strong>{' '}
                tin đăng. Danh sách đầy đủ sẽ hiển thị khi có thêm tin đăng.
              </p>
            </div>
          )}

          {/* Listings grid */}
          {items.length > 0 ? (
            <section aria-label={`Danh sách đất nông nghiệp tại ${province.name}`}>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[0.9375rem] font-bold text-gray-900">
                  {displayCount} tin đăng
                </p>
                <Link
                  href="/dang-tin"
                  className="rounded-full border border-green-600 px-4 py-2 text-[0.8125rem]
                             font-semibold text-green-700 no-underline transition-colors
                             hover:bg-green-600 hover:text-white active:scale-[0.97]"
                >
                  + Đăng tin
                </Link>
              </div>

              <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(row => (
                  <li key={row.id}>
                    <LandListingCard {...listingToLandCard(seoRowToListing(row))} />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="flex flex-col items-center gap-5 rounded-[28px] border-2 border-dashed
                            border-gray-200 bg-white py-20 text-center">
              <span className="select-none text-6xl opacity-20" aria-hidden="true">🌾</span>
              <div>
                <p className="m-0 text-[1rem] font-semibold text-gray-900">
                  Chưa có tin đăng tại {province.name}
                </p>
                <p className="m-0 mt-1 text-[0.875rem] text-gray-500">
                  Hãy là người đầu tiên đăng tin tại khu vực này
                </p>
              </div>
              <Link
                href="/dang-tin"
                className="inline-flex h-11 items-center justify-center rounded-full
                           bg-green-700 px-7 text-sm font-semibold text-white no-underline
                           transition-all hover:bg-green-800 active:scale-[0.98]"
              >
                Đăng tin tại {province.name}
              </Link>
            </div>
          )}

          {/* Trending / Recommendations */}
          {recommendations.length > 0 && (
            <section aria-label="Có thể bạn quan tâm" className="mt-16">
              <div className="mb-5">
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Gợi ý cho bạn
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
                  Có thể bạn quan tâm
                </h2>
              </div>
              <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map(({ id, ...card }) => (
                  <li key={id}>
                    <TrackableCard targetId={id} type="seo">
                      <LandListingCard {...card} />
                    </TrackableCard>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── District grid ─────────────────────────────────────────── */}
          {districts.length > 0 && (
            <section aria-labelledby="district-heading" className="mt-16">
              <div className="mb-5">
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Theo huyện / thị xã / thành phố
                </p>
                <h2
                  id="district-heading"
                  className="mt-1 text-xl font-bold tracking-tight text-gray-900"
                >
                  Đất nông nghiệp theo khu vực
                </h2>
              </div>
              <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 md:grid-cols-4">
                {districts.map(d => (
                  <li key={d.id}>
                    <Link
                      href={`/dat-nong-nghiep/${province.slug}/${d.slug}`}
                      className="flex flex-col rounded-2xl border border-gray-200 bg-white
                                 px-4 py-3 no-underline transition-all
                                 hover:border-green-300 hover:bg-green-50 active:scale-[0.98]"
                    >
                      <span className="text-[0.875rem] font-semibold leading-snug text-gray-800">
                        {d.name}
                      </span>
                      <span className="mt-1 text-[0.75rem] font-medium text-green-700">
                        {d.count} tin đăng
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Agricultural Knowledge Graph ──────────────────────────── */}
          <div className="mt-16">
            <div className="mb-5">
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-gray-400">
                Dữ liệu nông nghiệp
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
                Hồ sơ nông nghiệp {province.name}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ProvinceAgriSection provinceSlug={province.slug} />
              <ProvinceAtlasSection provinceSlug={province.slug} />
            </div>
          </div>

          {/* ── SEO agricultural content module ───────────────────────── */}
          {regionContent && (
            <section aria-labelledby="agri-content-heading" className="mt-16">
              <div className="rounded-[24px] border border-green-100/80 bg-gradient-to-br
                              from-green-50 to-emerald-50/50 px-7 py-8">
                <p className="m-0 mb-1 text-[0.75rem] font-bold uppercase tracking-[0.12em]
                              text-green-500">
                  Đặc điểm nông nghiệp
                </p>
                <h2
                  id="agri-content-heading"
                  className="mt-1 text-xl font-bold tracking-tight text-gray-900"
                >
                  {province.name_full} — {regionContent.headline}
                </h2>
                <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-gray-600">
                  {regionContent.body}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {regionContent.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/70 px-3.5 py-1.5 text-[0.8125rem]
                                 font-medium text-green-800 ring-1 ring-green-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* FAQ Module */}
          <FAQModule items={faqItems} />

          {/* Bottom CTA */}
          <div className="relative mt-16 overflow-hidden rounded-[28px] bg-[#F5F5F7] px-8 py-12 text-center">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-green-200/50 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900">
                Bạn có đất tại {province.name}?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] text-gray-500">
                Đăng tin miễn phí, tiếp cận hàng nghìn người mua trong khu vực.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/dang-tin"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full
                             bg-green-800 px-7 text-sm font-semibold text-white no-underline
                             transition-all hover:bg-green-900 active:scale-[0.98] sm:w-auto"
                >
                  Đăng tin ngay — miễn phí
                </Link>
                <Link
                  href="/dat-nong-nghiep"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full
                             border border-gray-300 bg-white/70 px-7 text-sm font-semibold
                             text-gray-700 no-underline transition-all hover:bg-white
                             active:scale-[0.98] sm:w-auto"
                >
                  Xem tất cả tỉnh thành →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
