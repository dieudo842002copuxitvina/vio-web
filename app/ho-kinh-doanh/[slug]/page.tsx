import { notFound }     from 'next/navigation'
import type { Metadata }  from 'next'
import Link               from 'next/link'
import { createClient }   from '@/lib/supabase/server'
import { getStorefrontDetail } from '@/features/storefronts/services/storefront-detail'
import type { ProductRef, ServiceRef, NearbyRef } from '@/features/storefronts/services/storefront-detail'
import StickyContactBar   from './sticky-contact-bar'

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
      url:    `/ho-kinh-doanh/${sf.slug}`,
      images: sf.avatar_url ? [{ url: sf.avatar_url, width: 400, height: 400 }] : [],
    },
    alternates: { canonical: `/ho-kinh-doanh/${sf.slug}` },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StorefrontDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const result   = await getStorefrontDetail(supabase, slug)
  if (!result) notFound()

  const { storefront: sf, province, district, ward, products, services, nearby } = result
  const hasContact = !!(sf.phone || sf.zalo_url)

  const breadcrumb = [
    { label: 'Trang chủ', href: '/' },
    province ? { label: province.name, href: `/${province.slug}` } : null,
    district ? { label: district.name, href: `/${province?.slug}/${district.slug}` } : null,
    { label: sf.business_name, href: null },
  ].filter(Boolean) as { label: string; href: string | null }[]

  return (
    <>
      <main
        className="max-w-4xl mx-auto px-4 md:px-8 pt-6"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[0.8125rem] text-gray-400 mb-6 flex-wrap">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">/</span>}
              {item.href
                ? <Link href={item.href} className="text-gray-400 no-underline hover:text-gray-600 transition-colors">{item.label}</Link>
                : <span className="text-gray-700 font-medium">{item.label}</span>
              }
            </span>
          ))}
        </nav>

        {/* Cover image — floating card */}
        {sf.cover_image_url && (
          <div className="w-full overflow-hidden rounded-[2rem] shadow-[0_4px_24px_rgb(0,0,0,0.10)] mb-8 bg-gray-100 dark:bg-gray-800">
            <img
              src={sf.cover_image_url}
              alt=""
              width={1080}
              height={360}
              className="w-full object-cover"
              style={{ height: 'clamp(180px, 28vw, 360px)' }}
              loading="eager"
            />
          </div>
        )}

        {/* ── Identity card ── */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.07)] dark:shadow-[0_2px_12px_rgb(0,0,0,0.3)] p-6 mb-6">
          <div className="flex gap-4 items-start">

            {/* Avatar */}
            <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-[0_2px_8px_rgb(0,0,0,0.10)]">
              {sf.avatar_url
                ? <img src={sf.avatar_url} alt="" width={80} height={80} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl select-none">🏪</div>
              }
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start gap-2 flex-wrap">
                <h1 className="m-0 text-[1.625rem] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                  {sf.business_name}
                </h1>
                {sf.is_verified && (
                  <span className="mt-1 shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15 text-[#34C759] dark:text-[#30D158] text-[0.6875rem] font-bold">
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                      <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Đã xác thực
                  </span>
                )}
              </div>

              {(ward || district || province) && (
                <p className="mt-1.5 m-0 flex items-center gap-1.5 text-[0.875rem] text-gray-500 dark:text-gray-400 leading-relaxed">
                  <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor" className="shrink-0 text-gray-400" aria-hidden="true">
                    <path d="M5.5 0C3.015 0 1 2.015 1 4.5c0 3.375 4.5 8.5 4.5 8.5S10 7.875 10 4.5C10 2.015 7.985 0 5.5 0Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/>
                  </svg>
                  {[ward?.name, district?.name, province?.name].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {sf.description && (
            <p className="mt-4 m-0 text-[0.9375rem] text-gray-500 dark:text-gray-400 leading-relaxed">
              {sf.description}
            </p>
          )}

          {/* Desktop contact — hidden on mobile (sticky bar handles it) */}
          {hasContact && (
            <div className="desktop-contact hidden md:flex gap-3 mt-5 flex-wrap">
              {sf.phone && (
                <a href={`tel:${sf.phone}`}
                  className="flex items-center gap-2 px-6 h-11 rounded-full bg-[#0071E3] hover:bg-[#005BBB] active:opacity-75 text-white font-semibold text-[0.9375rem] no-underline transition-colors">
                  📞 Gọi Ngay
                </a>
              )}
              {sf.zalo_url && (
                <a href={sf.zalo_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 h-11 rounded-full bg-black/[0.06] dark:bg-white/[0.1] hover:bg-black/[0.1] active:opacity-75 text-gray-900 dark:text-white font-semibold text-[0.9375rem] no-underline transition-colors">
                  💬 Zalo
                </a>
              )}
              {sf.facebook_url && (
                <a href={sf.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 h-11 rounded-full bg-black/[0.06] dark:bg-white/[0.1] hover:bg-black/[0.1] active:opacity-75 text-gray-900 dark:text-white font-medium text-[0.9375rem] no-underline transition-colors">
                  Facebook
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Products ── */}
        {products.length > 0 && (
          <section className="mb-8" aria-label="Sản phẩm">
            <SectionHeader label="Sản phẩm" />
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none m-0 p-0">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </ul>
          </section>
        )}

        {/* ── Services ── */}
        {services.length > 0 && (
          <section className="mb-8" aria-label="Dịch vụ">
            <SectionHeader label="Dịch vụ" />
            <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
              {services.map(s => <ServiceRow key={s.id} service={s} />)}
            </ul>
          </section>
        )}

        {/* ── Nearby ── */}
        {nearby.length > 0 && (
          <section className="mb-8" aria-label="Hộ kinh doanh lân cận">
            <SectionHeader label="Hộ kinh doanh lân cận" />
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none m-0 p-0">
              {nearby.map(n => <NearbyCard key={n.id} storefront={n} />)}
            </ul>
          </section>
        )}

      </main>

      {/* Sticky floating pill — mobile only */}
      {hasContact && (
        <StickyContactBar phone={sf.phone ?? null} zaloUrl={sf.zalo_url ?? null} />
      )}

      <style>{`
        @media (min-width: 768px) { .sticky-contact-bar { display: none !important; } }
      `}</style>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="m-0 text-[1.0625rem] font-bold tracking-tight text-gray-900 dark:text-white shrink-0">{label}</h2>
      <div className="flex-1 h-px bg-gray-200/70 dark:bg-white/[0.07]" />
    </div>
  )
}

function ProductCard({ product: p }: { product: ProductRef }) {
  return (
    <li>
      <Link
        href={`/san-pham/${p.slug}`}
        className="flex flex-col h-full p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-[0_1px_6px_rgb(0,0,0,0.07)] dark:shadow-[0_1px_6px_rgb(0,0,0,0.25)] no-underline transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        {p.is_featured && (
          <span className="self-start mb-2 px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] dark:text-[#409CFF] text-[0.625rem] font-bold tracking-wide uppercase">
            Nổi bật
          </span>
        )}
        <span className="font-semibold text-[0.875rem] text-gray-900 dark:text-white leading-snug">{p.title}</span>
        {p.price_text && (
          <span className="mt-auto pt-2 text-[0.8125rem] font-bold text-[#34C759] dark:text-[#30D158]">{p.price_text}</span>
        )}
      </Link>
    </li>
  )
}

function ServiceRow({ service: s }: { service: ServiceRef }) {
  return (
    <li>
      <Link
        href={`/dich-vu/${s.slug}`}
        className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-[0_1px_6px_rgb(0,0,0,0.07)] dark:shadow-[0_1px_6px_rgb(0,0,0,0.25)] no-underline transition-colors hover:bg-gray-50 dark:hover:bg-[#2C2C2E]"
      >
        <span className="text-xl shrink-0" aria-hidden="true">🔧</span>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-semibold text-[0.9375rem] text-gray-900 dark:text-white">{s.title}</p>
          {s.service_area_text && (
            <p className="m-0 text-[0.8125rem] text-gray-500 dark:text-gray-400 mt-0.5">{s.service_area_text}</p>
          )}
        </div>
        <svg className="shrink-0 text-gray-300" width="7" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 1l5 5-5 5"/>
        </svg>
      </Link>
    </li>
  )
}

function NearbyCard({ storefront: n }: { storefront: NearbyRef }) {
  return (
    <li>
      <Link
        href={`/ho-kinh-doanh/${n.slug}`}
        className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-[0_1px_6px_rgb(0,0,0,0.07)] dark:shadow-[0_1px_6px_rgb(0,0,0,0.25)] no-underline transition-colors hover:bg-gray-50 dark:hover:bg-[#2C2C2E]"
      >
        <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          {n.avatar_url
            ? <img src={n.avatar_url} alt="" width={44} height={44} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-lg select-none">🏪</div>
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-semibold text-[0.875rem] text-gray-900 dark:text-white truncate">{n.business_name}</p>
          {n.is_verified && (
            <p className="m-0 text-[0.6875rem] text-[#34C759] dark:text-[#30D158] mt-0.5 font-medium">✓ Đã xác thực</p>
          )}
        </div>
      </Link>
    </li>
  )
}
