import type { Metadata }       from 'next'
import Link                    from 'next/link'
import { createCachedClient }  from '@/lib/supabase/server'
import { SectionHeader }       from '@/shared/ui/section-header'
import { DirectoryFilters }    from './_components/DirectoryFilters'
import {
  MerchantCard,
  FeaturedMerchantCard,
  CompactFeaturedCard,
  type DirectoryMerchant,
}                              from './_components/MerchantCard'

export const revalidate = 1800

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Doanh nghiệp địa phương | VIO LOCAL',
  description: 'Tìm kiếm và kết nối với doanh nghiệp nông nghiệp uy tín nhất khu vực. Xếp hạng theo điểm uy tín thực tế.',
  alternates:  { canonical: '/doanh-nghiep' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string | null): string | null {
  if (!html) return null
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 150) || null
}

// ── Data fetch ────────────────────────────────────────────────────────────────

interface FilterOpts {
  provinceSlug?: string
  verified?:     boolean
  sort?:         string
  q?:            string
}

async function fetchDirectory(opts: FilterOpts): Promise<{
  merchants: DirectoryMerchant[]
  total:     number
}> {
  const supabase = createCachedClient()

  // ── 1. Get trust scores, ordered by trust DESC ─────────────────────────────
  const { data: trustRows } = await supabase
    .from('merchant_trust_scores')
    .select('profile_id, trust_score, identity_verified, active_listings, avg_response_hours')
    .eq('fraud_flag', false)
    .order('trust_score', { ascending: false })
    .limit(300)

  const trustMap = new Map(
    ((trustRows ?? []) as {
      profile_id: string; trust_score: number; identity_verified: boolean
      active_listings: number; avg_response_hours: number
    }[]).map(t => [t.profile_id, t]),
  )

  // ── 2. Province lookup (resolve slug → id for filter) ──────────────────────
  let filterProvinceId: number | null = null
  if (opts.provinceSlug) {
    const { data: provRow } = await supabase
      .from('provinces')
      .select('id')
      .eq('slug', opts.provinceSlug)
      .maybeSingle()
    filterProvinceId = (provRow as { id: number } | null)?.id ?? null
  }

  // ── 3. Fetch storefronts with province info ─────────────────────────────────
  type SfRow = {
    id: string; slug: string; business_name: string; about_html: string | null
    avatar_url: string | null; is_verified: boolean; contact_phone: string | null
    merchant_id: string; province_id: number | null; created_at: string
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sfQuery: any = supabase
    .from('storefronts')
    .select('id, slug, business_name, about_html, avatar_url, is_verified, contact_phone, merchant_id, province_id, created_at')
    .eq('is_public', true)

  if (filterProvinceId)  sfQuery = sfQuery.eq('province_id', filterProvinceId)
  if (opts.verified)     sfQuery = sfQuery.eq('is_verified', true)

  sfQuery = sfQuery.limit(300)

  const { data: sfData } = await sfQuery
  const storefronts = (sfData ?? []) as SfRow[]

  // ── 4. Province names lookup ───────────────────────────────────────────────
  const provinceIds = [...new Set(storefronts.map(s => s.province_id).filter(Boolean) as number[])]
  let provMap = new Map<number, { name: string; slug: string }>()

  if (provinceIds.length > 0) {
    const { data: provData } = await supabase
      .from('provinces')
      .select('id, name, slug')
      .in('id', provinceIds)

    provMap = new Map(
      ((provData ?? []) as { id: number; name: string; slug: string }[]).map(p => [p.id, p]),
    )
  }

  // ── 5. Join + sort + filter ────────────────────────────────────────────────
  let merchants: DirectoryMerchant[] = storefronts.map(sf => {
    const trust = trustMap.get(sf.merchant_id)
    const prov  = sf.province_id ? provMap.get(sf.province_id) : null
    return {
      id:                  sf.id,
      slug:                sf.slug,
      business_name:       sf.business_name,
      description:         stripHtml(sf.about_html),
      avatar_url:          sf.avatar_url,
      is_verified:         sf.is_verified,
      contact_phone:       sf.contact_phone,
      province_name:       prov?.name ?? null,
      province_slug:       prov?.slug ?? null,
      merchant_id:         sf.merchant_id,
      created_at:          sf.created_at,
      trust_score:         trust?.trust_score         ?? 0,
      identity_verified:   trust?.identity_verified   ?? false,
      active_listings:     trust?.active_listings     ?? 0,
      avg_response_hours:  trust?.avg_response_hours  ?? 0,
    }
  })

  // Text search
  if (opts.q?.trim()) {
    const qL = opts.q.trim().toLowerCase()
    merchants = merchants.filter(m =>
      m.business_name.toLowerCase().includes(qL) ||
      m.description?.toLowerCase().includes(qL) ||
      m.province_name?.toLowerCase().includes(qL),
    )
  }

  // Sort
  switch (opts.sort) {
    case 'newest':
      merchants.sort((a, b) => b.created_at.localeCompare(a.created_at))
      break
    case 'listings':
      merchants.sort((a, b) => b.active_listings - a.active_listings)
      break
    default: // 'trust' (default)
      merchants.sort((a, b) => b.trust_score - a.trust_score)
  }

  return { merchants: merchants.slice(0, 96), total: merchants.length }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    province?: string
    verified?: string
    sort?:     string
    q?:        string
  }>
}

export default async function BusinessDirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const opts: FilterOpts = {
    provinceSlug: params.province || undefined,
    verified:     params.verified === 'true',
    sort:         params.sort || 'trust',
    q:            params.q?.trim() || undefined,
  }

  const activeFilterCount = [
    params.province,
    params.verified === 'true' ? 'verified' : null,
    params.sort && params.sort !== 'trust' ? params.sort : null,
    params.q,
  ].filter(Boolean).length

  const { merchants, total } = await fetchDirectory(opts)

  // Top 3 featured (by trust_score, shown separately)
  const featured  = merchants.slice(0, 3)
  const gridItems = merchants.slice(3)

  // Active filter chips
  const chips: { label: string; clearKey: string }[] = []
  if (params.province) {
    const PROV_NAMES: Record<string, string> = {
      'dong-nai':'Đồng Nai','binh-phuoc':'Bình Phước','lam-dong':'Lâm Đồng',
      'gia-lai':'Gia Lai','dak-lak':'Đắk Lắk','tay-ninh':'Tây Ninh',
      'an-giang':'An Giang','binh-thuan':'Bình Thuận',
    }
    chips.push({ label: `📍 ${PROV_NAMES[params.province] ?? params.province}`, clearKey: 'province' })
  }
  if (params.verified === 'true') chips.push({ label: '✓ Đã xác thực', clearKey: 'verified' })
  if (params.q)                   chips.push({ label: `"${params.q}"`,    clearKey: 'q'        })

  function clearChipHref(key: string): string {
    const next = new URLSearchParams(
      Object.entries(params).filter(([k, v]) => k !== key && v) as [string, string][]
    )
    const qs = next.toString()
    return qs ? `/doanh-nghiep?${qs}` : '/doanh-nghiep'
  }

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ── Directory Header ──────────────────────────────── */}
      <header className="border-b border-neutral-100 bg-white px-4 sm:px-6 lg:px-8 py-10">
        <div className="mx-auto max-w-7xl">

          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-vio-blue">
            Trang Vàng Thế Hệ Mới
          </div>

          <h1 className="m-0 text-4xl font-black tracking-tight text-[#0A0A0A] sm:text-5xl">
            🏪 Doanh nghiệp
            <br />
            <span className="text-vio-forest">địa phương</span>
          </h1>

          <p className="m-0 mt-3 max-w-lg text-[1.0625rem] leading-relaxed text-neutral-500">
            Kết nối với doanh nghiệp uy tín nhất khu vực. Xếp hạng theo điểm uy tín thực tế từ lịch sử giao dịch.
          </p>

          {/* Stats strip */}
          <div className="mt-5 flex flex-wrap gap-5 text-[0.875rem] text-neutral-500">
            <span>
              <strong className="font-black text-[#0A0A0A]">{total}</strong> doanh nghiệp
            </span>
            <span>
              <strong className="font-black text-[#0A0A0A]">63</strong> tỉnh thành
            </span>
            <span>
              <strong className="font-black text-[#0A0A0A]">
                {merchants.filter(m => m.identity_verified || m.is_verified).length}
              </strong> đã xác thực
            </span>
          </div>

          {/* Inline search */}
          <form className="mt-6" method="get" action="/doanh-nghiep">
            {params.province  && <input type="hidden" name="province" value={params.province} />}
            {params.verified  && <input type="hidden" name="verified" value={params.verified} />}
            {params.sort      && <input type="hidden" name="sort"     value={params.sort}     />}
            <div className="relative max-w-lg">
              <svg
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
                fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="8.5" cy="8.5" r="5.75" />
                <path d="M13 13l3.5 3.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ''}
                placeholder="Tìm tên doanh nghiệp, tỉnh, ngành..."
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-12 pr-4
                           text-[0.9375rem] placeholder:text-neutral-400
                           focus:border-vio-primary focus:outline-none focus:ring-2 focus:ring-vio-primary/20"
              />
            </div>
          </form>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map(chip => (
                <Link
                  key={chip.clearKey}
                  href={clearChipHref(chip.clearKey)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200
                             bg-white px-3 py-1 text-[0.8125rem] font-medium text-[#0A0A0A] no-underline
                             transition-colors hover:bg-neutral-50"
                >
                  {chip.label}
                  <span className="text-neutral-400" aria-hidden="true">×</span>
                </Link>
              ))}
              {chips.length > 1 && (
                <Link
                  href="/doanh-nghiep"
                  className="self-center text-[0.8125rem] text-neutral-400 no-underline hover:text-neutral-600"
                >
                  Xóa tất cả
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Featured Businesses ───────────────────────────── */}
      {featured.length > 0 && !opts.q && (
        <div className="border-b border-neutral-100 bg-white px-4 sm:px-6 lg:px-8 py-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              kicker="Nổi bật"
              kickerColor="text-amber-600"
              title="Doanh nghiệp hàng đầu"
              subtitle="Xếp hạng theo điểm uy tín cao nhất trên VIO LOCAL"
              className="mb-6"
            />

            <div className="space-y-3">
              {/* Rank #1 — hero horizontal card */}
              {featured[0] && <FeaturedMerchantCard m={featured[0]} />}

              {/* Rank #2 + #3 — compact cards */}
              {featured.slice(1).length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {featured.slice(1).map(m => (
                    <CompactFeaturedCard key={m.id} m={m} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main: filters sidebar + grid ─────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start gap-8">

            {/* DirectoryFilters renders desktop sidebar + mobile FAB */}
            <DirectoryFilters activeFilterCount={activeFilterCount} />

            {/* Results */}
            <main className="flex-1 min-w-0" role="region" aria-label="Danh sách doanh nghiệp">

              {/* Result count + sort indicator */}
              <div className="mb-5 flex items-center justify-between">
                <p className="m-0 text-[0.875rem] font-medium text-neutral-500">
                  <span className="font-black text-[#0A0A0A]">{gridItems.length}</span> doanh nghiệp
                  {opts.sort === 'trust'    && ' · Sắp xếp theo uy tín'}
                  {opts.sort === 'newest'   && ' · Mới nhất trước'}
                  {opts.sort === 'listings' && ' · Nhiều tin nhất'}
                </p>
              </div>

              {gridItems.length > 0 ? (
                <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
                    aria-label="Danh sách doanh nghiệp">
                  {gridItems.map(m => (
                    <li key={m.id}>
                      <MerchantCard m={m} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-neutral-200 py-20 text-center">
                  <p className="m-0 text-3xl" aria-hidden="true">🏪</p>
                  <p className="m-0 mt-3 text-xl font-black text-[#0A0A0A]">
                    Không tìm thấy doanh nghiệp
                  </p>
                  <p className="m-0 mt-1 text-[0.9375rem] text-neutral-500">
                    Thử thay đổi bộ lọc hoặc tìm kiếm với từ khoá khác
                  </p>
                  <Link
                    href="/doanh-nghiep"
                    className="mt-5 inline-flex h-10 items-center rounded-xl border border-neutral-200
                               bg-white px-6 text-sm font-semibold text-[#0A0A0A] no-underline
                               transition-colors hover:bg-neutral-50"
                  >
                    Xem tất cả doanh nghiệp
                  </Link>
                </div>
              )}

              {/* Đăng ký CTA */}
              <div className="mt-12 rounded-2xl border border-vio-primary/20 bg-vio-primary/5 p-6 text-center">
                <p className="m-0 text-xl font-black text-[#0A0A0A]">
                  Doanh nghiệp của bạn chưa có mặt?
                </p>
                <p className="m-0 mt-1 text-[0.9375rem] text-neutral-500">
                  Đăng ký gian hàng miễn phí để tiếp cận hàng ngàn khách hàng tiềm năng
                </p>
                <Link
                  href="/dang-ky-gian-hang"
                  className="mt-4 inline-flex h-11 items-center rounded-xl bg-vio-forest px-8
                             text-[0.9375rem] font-bold text-white no-underline
                             transition-all hover:bg-vio-forest-mid active:scale-[0.98]"
                >
                  Tạo gian hàng miễn phí →
                </Link>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
