import { notFound }  from 'next/navigation'
import type { Metadata } from 'next'
import Link            from 'next/link'
import { createClient }          from '@/lib/supabase/server'
import { getStorefrontDetail }   from '@/features/storefronts/services/storefront-detail'
import type {
  ProductRef,
  ServiceRef,
  NearbyRef,
}                                from '@/features/storefronts/services/storefront-detail'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { SchemaMarkup }          from '@/shared/seo/SchemaMarkup'

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
        <path
          d="M1.5 4.5l2 2 4-4"
          stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      Đã xác thực
    </span>
  )
}

function PinIcon() {
  return (
    <svg
      width="11" height="13" viewBox="0 0 11 13"
      fill="currentColor" aria-hidden="true"
      className="shrink-0 text-gray-400"
    >
      <path d="M5.5 0C3.015 0 1 2.015 1 4.5c0 3.375 4.5 8.5 4.5 8.5S10 7.875 10 4.5C10 2.015 7.985 0 5.5 0Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16"
      fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.5 10.6c-.6.6-1.2.9-1.9.7-1.5-.4-3-1.4-4.3-2.7C6 7.3 5 5.8 4.6 4.3c-.2-.7.1-1.3.7-1.9l.9-.9c.3-.3.8-.3 1.1 0L9 3.3c.3.3.3.7 0 1L7.9 5.5a.4.4 0 0 0-.1.4 8.5 8.5 0 0 0 3.8 3.8.4.4 0 0 0 .4-.1l1.2-1.2c.3-.3.7-.3 1 0L16 10c.3.3.3.7 0 1l-2.5-.4Z" />
    </svg>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="m-0 shrink-0 text-[1.0625rem] font-bold tracking-tight text-gray-900">
        {label}
      </h2>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  )
}

function ProductCard({ p }: { p: ProductRef }) {
  return (
    <Link
      href={`/san-pham/${p.slug}`}
      className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.07)] no-underline transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
    >
      {p.is_featured && (
        <span className="mb-2 self-start rounded-full bg-[#0071E3]/10 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-[#0071E3]">
          Nổi bật
        </span>
      )}
      <span className="text-[0.875rem] font-semibold leading-snug text-gray-900">
        {p.title}
      </span>
      {p.price_text && (
        <span className="mt-auto pt-2 text-[0.8125rem] font-bold text-[#34C759]">
          {p.price_text}
        </span>
      )}
    </Link>
  )
}

function ServiceRow({ s }: { s: ServiceRef }) {
  return (
    <Link
      href={`/dich-vu/${s.slug}`}
      className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.07)] no-underline transition-colors hover:bg-gray-50"
    >
      <span className="shrink-0 text-xl" aria-hidden="true">🔧</span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[0.9375rem] font-semibold text-gray-900">{s.title}</p>
        {s.service_area_text && (
          <p className="m-0 mt-0.5 text-[0.8125rem] text-gray-500">{s.service_area_text}</p>
        )}
      </div>
      <svg
        className="shrink-0 text-gray-300" width="7" height="12"
        fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M1 1l5 5-5 5" />
      </svg>
    </Link>
  )
}

function NearbyCard({ n }: { n: NearbyRef }) {
  return (
    <Link
      href={`/doanh-nghiep/${n.slug}`}
      className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.07)] no-underline transition-colors hover:bg-gray-50"
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {n.avatar_url
          ? <img src={n.avatar_url} alt="" width={44} height={44} className="h-full w-full object-cover" loading="lazy" />
          : <div className="flex h-full w-full items-center justify-center text-lg">🏪</div>
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[0.875rem] font-semibold text-gray-900">{n.business_name}</p>
        {n.is_verified && (
          <p className="m-0 mt-0.5 text-[0.6875rem] font-medium text-[#34C759]">✓ Đã xác thực</p>
        )}
      </div>
    </Link>
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

  const { storefront: sf, province, district, ward, products, services, nearby } = result

  const addressParts = [ward?.name, district?.name, province?.name].filter(Boolean)
  const addressText  = addressParts.join(', ')

  const breadcrumb = [
    { label: 'Trang chủ', href: '/' },
    province ? { label: province.name, href: `/${province.slug}` } : null,
    district ? { label: district.name, href: `/${province!.slug}/${district.slug}` } : null,
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

      {/* ── Hero cover image ───────────────────────────────────────────────── */}
      <section
        className="relative h-64 overflow-hidden bg-gray-100 md:h-80"
        aria-hidden="true"
      >
        {sf.cover_image_url ? (
          <img
            src={sf.cover_image_url}
            alt=""
            width={1080}
            height={320}
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        ) : (
          // Fallback gradient when no cover image is set
          <div className="h-full w-full bg-gradient-to-br from-vio-primary/20 via-emerald-50 to-vio-earth/20" />
        )}
        {/* Gradient overlay — darkens bottom so white avatar ring pops */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
      </section>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-4 pb-24 md:px-8">

        {/* Breadcrumb */}
        <nav
          className="mb-6 flex flex-wrap items-center gap-1.5 pt-4 text-[0.8125rem] text-gray-400"
          aria-label="Breadcrumb"
        >
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300" aria-hidden="true">/</span>}
              {item.href
                ? <Link href={item.href} className="text-gray-400 no-underline transition-colors hover:text-gray-600">{item.label}</Link>
                : <span className="font-medium text-gray-700">{item.label}</span>
              }
            </span>
          ))}
        </nav>

        {/* ── Avatar — pulled up over the hero bottom edge ── */}
        {/* -mt-20 from current flow position (after hero).    */}
        {/* Avatar (h-24 = 6rem) protrudes ~2rem into the hero */}
        <div className="-mt-20 mb-4 pl-1">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-200 ring-4 ring-white shadow-xl">
            {sf.avatar_url
              ? (
                <img
                  src={sf.avatar_url}
                  alt={sf.business_name}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              )
              : (
                <div className="flex h-full w-full items-center justify-center text-4xl select-none">
                  🏪
                </div>
              )
            }
          </div>
        </div>

        {/* ── Name + verified badge ── */}
        <div className="mb-6">
          <div className="flex flex-wrap items-start gap-2">
            <h1 className="m-0 text-3xl font-bold tracking-tight text-gray-900 leading-tight">
              {sf.business_name}
            </h1>
            {sf.is_verified && <VerifiedBadge />}
          </div>

          {addressText && (
            <p className="m-0 mt-2 flex items-center gap-1.5 text-[0.9375rem] text-gray-500">
              <PinIcon />
              {addressText}
            </p>
          )}
        </div>

        {/* ── Description card ── */}
        {sf.description && (
          <Card className="mb-4">
            <CardHeader>
              <h2 className="m-0 text-[0.9375rem] font-bold text-gray-900">Giới thiệu</h2>
            </CardHeader>
            <CardContent>
              <p className="m-0 text-[0.9375rem] leading-relaxed text-gray-600">
                {sf.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Contact card ── */}
        {(sf.phone || sf.zalo_url || sf.facebook_url) && (
          <Card className="mb-4">
            <CardHeader>
              <h2 className="m-0 text-[0.9375rem] font-bold text-gray-900">Liên hệ</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">

              {sf.phone && (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="m-0 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Điện thoại
                    </p>
                    <p className="m-0 text-[0.9375rem] font-medium text-gray-900">
                      {sf.phone}
                    </p>
                  </div>
                  {/* Styled <a> — semantically correct for a phone link */}
                  <a
                    href={`tel:${sf.phone}`}
                    className={[
                      'inline-flex h-11 min-h-[44px] shrink-0 items-center gap-2',
                      'rounded-xl bg-vio-primary px-5',
                      'text-[0.9375rem] font-semibold text-white no-underline',
                      'transition-all duration-200 hover:opacity-90 active:scale-[0.98]',
                    ].join(' ')}
                  >
                    <PhoneIcon />
                    Gọi ngay
                  </a>
                </div>
              )}

              {sf.zalo_url && (
                <a
                  href={sf.zalo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={[
                    'flex h-11 min-h-[44px] items-center justify-center gap-2',
                    'rounded-xl bg-gray-100 hover:bg-gray-200',
                    'text-[0.9375rem] font-semibold text-gray-700 no-underline',
                    'transition-colors duration-150 active:opacity-75',
                  ].join(' ')}
                >
                  💬 Nhắn qua Zalo
                </a>
              )}

              {sf.facebook_url && (
                <a
                  href={sf.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={[
                    'flex h-11 min-h-[44px] items-center justify-center gap-2',
                    'rounded-xl bg-gray-100 hover:bg-gray-200',
                    'text-[0.9375rem] font-medium text-gray-700 no-underline',
                    'transition-colors duration-150 active:opacity-75',
                  ].join(' ')}
                >
                  Facebook
                </a>
              )}

            </CardContent>
          </Card>
        )}

        {/* ── Address card ── */}
        {addressText && (
          <Card className="mb-8">
            <CardHeader>
              <h2 className="m-0 text-[0.9375rem] font-bold text-gray-900">Địa chỉ</h2>
            </CardHeader>
            <CardContent>
              <p className="m-0 flex items-start gap-2 text-[0.9375rem] text-gray-600">
                <PinIcon />
                {addressText}, Việt Nam
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Products ── */}
        {products.length > 0 && (
          <section className="mb-8" aria-label="Sản phẩm">
            <SectionDivider label="Sản phẩm" />
            <ul className="grid grid-cols-2 gap-3 list-none m-0 p-0 sm:grid-cols-3">
              {products.map(p => (
                <li key={p.id}>
                  <ProductCard p={p} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Services ── */}
        {services.length > 0 && (
          <section className="mb-8" aria-label="Dịch vụ">
            <SectionDivider label="Dịch vụ" />
            <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
              {services.map(s => (
                <li key={s.id}>
                  <ServiceRow s={s} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Nearby businesses ── */}
        {nearby.length > 0 && (
          <section aria-label="Hộ kinh doanh lân cận">
            <SectionDivider label="Lân cận" />
            <ul className="grid grid-cols-1 gap-3 list-none m-0 p-0 sm:grid-cols-2">
              {nearby.map(n => (
                <li key={n.id}>
                  <NearbyCard n={n} />
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>
    </>
  )
}
