import { notFound }      from 'next/navigation'
import type { Metadata } from 'next'
import { StoreHero }     from '@/features/storefronts/components/StoreHero'
import { StoreStats }    from '@/features/storefronts/components/StoreStats'
import { getMockStorefront, type MockStorefrontData } from '@/features/storefronts/mocks'
import { JsonLd }        from '@/shared/seo/JsonLd'

type Props = { params: Promise<{ slug: string }> }

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = getMockStorefront(slug)
  if (!data) return { title: 'Không tìm thấy' }

  return {
    title:       `${data.business_name} | VIO LOCAL`,
    description: `Xem sản phẩm và dịch vụ nông nghiệp của ${data.business_name}. Liên hệ trực tiếp qua điện thoại hoặc Zalo.`,
    openGraph: {
      title:  data.business_name,
      images: data.avatar_url ? [{ url: data.avatar_url, width: 120, height: 120 }] : [],
    },
    alternates: { canonical: `/store/${slug}` },
  }
}

// ── Schema builder ────────────────────────────────────────────────────────────
// trust_score (0–100) → ratingValue (0.0–5.0) via linear scale.
// reviewCount uses active_listings_count as a stand-in; replace with real
// review count once the reviews table is wired up.
function buildStorefrontSchema(data: MockStorefrontData) {
  const ratingValue = Math.round((data.trust_score / 100) * 5 * 10) / 10

  return {
    '@context': 'https://schema.org',
    '@type':    ['LocalBusiness', 'ProfilePage'],
    name:       data.business_name,
    url:        `/store/${data.slug}`,
    ...(data.avatar_url    && { image:     data.avatar_url }),
    ...(data.contact_phone && { telephone: data.contact_phone.replace(/\s/g, '') }),
    ...(data.social_links.website && { sameAs: [data.social_links.website] }),
    aggregateRating: {
      '@type':      'AggregateRating',
      ratingValue,
      bestRating:   5,
      worstRating:  1,
      reviewCount:  data.active_listings_count,
    },
  }
}

// ── Mock listing data ─────────────────────────────────────────────────────────

const MOCK_LISTINGS = [
  { id: '1', title: 'Máy kéo Kubota L3408',         price: '280.000.000 đ', bg: '#e8f5e9', fg: '#2e7d32' },
  { id: '2', title: 'Máy kéo Kubota B2441',         price: '185.000.000 đ', bg: '#e8f5e9', fg: '#2e7d32' },
  { id: '3', title: 'Máy gặt đập liên hợp DC-70',   price: '520.000.000 đ', bg: '#fff8e1', fg: '#f57f17' },
  { id: '4', title: 'Máy cấy lúa NSP8',             price: '195.000.000 đ', bg: '#e3f2fd', fg: '#1565c0' },
  { id: '5', title: 'Máy bơm nước ly tâm 3HP',      price: '8.500.000 đ',   bg: '#e0f2f1', fg: '#00695c' },
  { id: '6', title: 'Máy phun thuốc sâu tự hành',   price: '12.000.000 đ',  bg: '#fce4ec', fg: '#880e4f' },
  { id: '7', title: 'Phụ tùng chính hãng Kubota',   price: '3.200.000 đ',   bg: '#ede7f6', fg: '#4527a0' },
  { id: '8', title: 'Dịch vụ bảo dưỡng định kỳ',    price: 'Liên hệ',       bg: '#f3e5f5', fg: '#6a1b9a' },
] as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StorePage({ params }: Props) {
  const { slug } = await params
  const data = getMockStorefront(slug)
  if (!data) notFound()

  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 pt-4 md:px-6 md:pt-6">

      {/* ── JSON-LD ──────────────────────────────────────────────────────── */}
      <JsonLd schema={buildStorefrontSchema(data)} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <StoreHero
        business_name={data.business_name}
        avatar_url={data.avatar_url}
        banner_url={data.banner_url}
        is_verified={data.is_verified}
        social_links={data.social_links}
        contact_phone={data.contact_phone}
      />

      {/* ── Trust stats ──────────────────────────────────────────────────── */}
      <div className="mt-3">
        <StoreStats
          trust_score={data.trust_score}
          active_listings_count={data.active_listings_count}
          response_rate={data.response_rate}
        />
      </div>

      {/* ── Products / Services ──────────────────────────────────────────── */}
      <section className="mt-8" aria-labelledby="listings-heading">
        <h2
          id="listings-heading"
          className="m-0 mb-4 text-lg font-semibold tracking-tight text-[var(--sea-ink)]"
        >
          Sản phẩm / Dịch vụ của chúng tôi
        </h2>

        <ul
          className="m-0 list-none p-0 grid grid-cols-2 gap-3 md:grid-cols-4"
          role="list"
        >
          {MOCK_LISTINGS.map((item) => (
            <li key={item.id} className="rounded-xl overflow-hidden bg-[var(--surface)] shadow-[var(--shadow-apple-soft)]">
              {/* Image placeholder — coloured by category */}
              <div
                className="aspect-square flex items-center justify-center"
                style={{ backgroundColor: item.bg }}
                aria-hidden
              >
                <span
                  className="text-3xl font-bold select-none"
                  style={{ color: item.fg, opacity: 0.35 }}
                >
                  {item.id}
                </span>
              </div>

              <div className="px-3 py-2.5">
                <p className="m-0 text-[0.8125rem] font-medium leading-snug text-[var(--sea-ink)] line-clamp-2">
                  {item.title}
                </p>
                <p className="m-0 mt-1 text-[0.75rem] font-semibold text-[var(--lagoon-deep)]">
                  {item.price}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── About ────────────────────────────────────────────────────────── */}
      {data.about_html && (
        <section className="mt-8" aria-labelledby="about-heading">
          <h2
            id="about-heading"
            className="m-0 mb-4 text-lg font-semibold tracking-tight text-[var(--sea-ink)]"
          >
            Giới thiệu
          </h2>

          {/* about_html is authored by the merchant (trusted source), not user-generated */}
          <div
            className={[
              'rounded-2xl px-5 py-4 bg-[var(--surface)] shadow-[var(--shadow-apple-soft)]',
              'text-[0.9375rem] leading-relaxed text-[var(--sea-ink-soft)]',
              '[&_p]:m-0 [&_p+p]:mt-3',
              '[&_strong]:font-semibold [&_strong]:text-[var(--sea-ink)]',
              '[&_a]:text-[var(--lagoon-deep)] [&_a]:underline [&_a:hover]:opacity-75',
              '[&_ul]:my-3 [&_ul]:pl-5 [&_li]:mt-1',
            ].join(' ')}
            dangerouslySetInnerHTML={{ __html: data.about_html }}
          />
        </section>
      )}

    </article>
  )
}
