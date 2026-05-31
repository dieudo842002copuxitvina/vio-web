import { notFound }  from 'next/navigation'
import type { Metadata } from 'next'
import Link            from 'next/link'
import { createClient }          from '@/lib/supabase/server'
import { getStorefrontDetail }   from '@/features/storefronts/services/storefront-detail'
import { SchemaMarkup }          from '@/shared/seo/SchemaMarkup'
import { StorefrontTabs }        from './_components/StorefrontTabs'

export const revalidate = 3600

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug }  = await params
  const supabase  = await createClient()
  const result    = await getStorefrontDetail(supabase, slug)
  if (!result) return { title: 'Không tìm thấy' }

  const { storefront: sf, province, district } = result
  const locationParts = [district?.name, province?.name].filter(Boolean)
  const locationText  = locationParts.length ? ` tại ${locationParts.join(', ')}` : ''
  const title         = `${sf.business_name}${locationText}`
  const description   = sf.description
    ?? `Hộ kinh doanh ${sf.business_name}${locationText}. Xem sản phẩm, dịch vụ và liên hệ trực tiếp.`

  return {
    title,
    description,
    openGraph: {
      title, description,
      url:    `/doanh-nghiep/${sf.slug}`,
      images: sf.avatar_url ? [{ url: sf.avatar_url, width: 400, height: 400 }] : [],
    },
    alternates: { canonical: `/doanh-nghiep/${sf.slug}` },
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#34C759]/10 px-2.5 py-0.5 text-[0.6875rem] font-bold text-[#34C759]"
      aria-label="Đã xác thực"
    >
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
        <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Đã xác thực
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const result   = await getStorefrontDetail(supabase, slug)
  if (!result) notFound()

  const {
    storefront: sf,
    province, district, ward,
    products, services, nearby,
    reviews, review_count, average_rating,
  } = result

  const addressParts = [ward?.name, district?.name, province?.name].filter(Boolean)
  const addressText  = addressParts.join(', ')

  const breadcrumb = [
    { label: 'Trang chủ', href: '/' },
    { label: 'Doanh nghiệp', href: '/doanh-nghiep' },
    province ? { label: province.name, href: `/dat-nong-nghiep/${province.slug}` } : null,
    { label: sf.business_name, href: null },
  ].filter(Boolean) as { label: string; href: string | null }[]

  return (
    <>
      {/* ── JSON-LD ── */}
      <SchemaMarkup
        schema={{
          '@context': 'https://schema.org',
          '@type':    'LocalBusiness',
          name:       sf.business_name,
          description: sf.description ?? undefined,
          image:      sf.avatar_url   ?? undefined,
          telephone:  sf.phone        ?? undefined,
          url:        `/doanh-nghiep/${sf.slug}`,
          ...(average_rating !== null && {
            aggregateRating: {
              '@type':      'AggregateRating',
              ratingValue:  average_rating,
              reviewCount:  review_count,
              bestRating:   5,
              worstRating:  1,
            },
          }),
          ...(addressText && {
            address: {
              '@type':         'PostalAddress',
              addressLocality: district?.name ?? undefined,
              addressRegion:   province?.name ?? undefined,
              addressCountry:  'VN',
            },
          }),
        }}
      />

      {/* ── Cover image ── */}
      <section className="relative h-56 overflow-hidden bg-gray-100 md:h-72" aria-hidden="true">
        {sf.cover_image_url ? (
          <img
            src={sf.cover_image_url}
            alt=""
            width={1080}
            height={288}
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-blue-50 via-emerald-50 to-amber-50 dark:from-blue-950/30 dark:via-emerald-950/30 dark:to-amber-950/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
      </section>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-4xl px-4 pb-24 md:px-8">

        {/* Breadcrumb */}
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 pt-4 text-[0.8125rem] text-gray-400" aria-label="Breadcrumb">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300" aria-hidden="true">/</span>}
              {item.href
                ? <Link href={item.href} className="text-gray-400 no-underline transition-colors hover:text-gray-600">{item.label}</Link>
                : <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
              }
            </span>
          ))}
        </nav>

        {/* ── Avatar — pulled up over cover bottom ── */}
        <div className="-mt-16 mb-4 pl-1">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-200 ring-4 ring-white shadow-xl dark:ring-[#1C1C1E]">
            {sf.avatar_url ? (
              <img
                src={sf.avatar_url}
                alt={sf.business_name}
                width={96}
                height={96}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl select-none">
                🏪
              </div>
            )}
          </div>
        </div>

        {/* ── Identity block ── */}
        <div className="mb-5">
          <div className="flex flex-wrap items-start gap-2">
            <h1 className="m-0 text-[1.75rem] font-bold tracking-tight text-gray-900 leading-tight dark:text-white">
              {sf.business_name}
            </h1>
            {sf.is_verified && <VerifiedBadge />}
          </div>

          {addressText && (
            <p className="m-0 mt-1.5 flex items-center gap-1.5 text-[0.9375rem] text-gray-500 dark:text-gray-400">
              <span className="text-sm" aria-hidden="true">📍</span>
              {addressText}
            </p>
          )}

          {average_rating !== null && (
            <p className="m-0 mt-1 flex items-center gap-1.5 text-[0.875rem] text-[#FF9500]">
              <span>{'★'.repeat(Math.round(average_rating))}</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {average_rating.toFixed(1)}
              </span>
              <span className="text-gray-400">({review_count} đánh giá)</span>
            </p>
          )}
        </div>

        {/* ── Quick contact bar ── */}
        {(sf.phone || sf.zalo_url) && (
          <div className="mb-6 flex gap-3">
            {sf.phone && (
              <a
                href={`tel:${sf.phone}`}
                className={[
                  'flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2',
                  'rounded-2xl bg-[#0071E3] font-semibold text-[0.9375rem] text-white no-underline',
                  'transition-all duration-150 hover:opacity-90 active:scale-[0.98]',
                ].join(' ')}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M13.5 10.6c-.6.6-1.2.9-1.9.7-1.5-.4-3-1.4-4.3-2.7C6 7.3 5 5.8 4.6 4.3c-.2-.7.1-1.3.7-1.9l.9-.9c.3-.3.8-.3 1.1 0L9 3.3c.3.3.3.7 0 1L7.9 5.5a.4.4 0 0 0-.1.4 8.5 8.5 0 0 0 3.8 3.8.4.4 0 0 0 .4-.1l1.2-1.2c.3-.3.7-.3 1 0L16 10c.3.3.3.7 0 1l-2.5-.4Z" />
                </svg>
                Gọi ngay
              </a>
            )}
            {sf.zalo_url && (
              <a
                href={sf.zalo_url}
                target="_blank"
                rel="noopener noreferrer"
                className={[
                  'flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2',
                  'rounded-2xl bg-gray-100 font-semibold text-[0.9375rem] text-gray-700 no-underline',
                  'transition-colors duration-150 hover:bg-gray-200 active:opacity-75 dark:bg-[#2C2C2E] dark:text-gray-200',
                ].join(' ')}
              >
                💬 Zalo
              </a>
            )}
            {sf.facebook_url && !sf.zalo_url && (
              <a
                href={sf.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className={[
                  'flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2',
                  'rounded-2xl bg-gray-100 font-semibold text-[0.9375rem] text-gray-700 no-underline',
                  'transition-colors duration-150 hover:bg-gray-200 active:opacity-75 dark:bg-[#2C2C2E] dark:text-gray-200',
                ].join(' ')}
              >
                Facebook
              </a>
            )}
          </div>
        )}

        {/* ── Tabbed content ── */}
        <StorefrontTabs
          businessId={sf.id}
          businessName={sf.business_name}
          description={sf.description}
          addressText={addressText}
          products={products}
          services={services}
          nearby={nearby}
          reviews={reviews}
          review_count={review_count}
          average_rating={average_rating}
        />

      </div>
    </>
  )
}
