import type { Metadata }   from 'next'
import Link                 from 'next/link'
import { createCachedClient } from '@/lib/supabase/server'
import {
  fetchLandListings,
  fetchProvinces,
}                           from '@/features/search/api/land-search.server'
import { SearchPanel }      from './_components/SearchPanel'

export const revalidate = 60

// ── Metadata ──────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    q?:          string
    province?:   string
    land_type?:  string
    legal?:      string
    price_min?:  string
    price_max?:  string
    sort?:       string
    page?:       string
  }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const p = await searchParams
  const q = p.q?.trim()
  return {
    title: q
      ? `"${q}" — Tìm kiếm đất | VIO AGRI`
      : 'Tìm kiếm đất nông nghiệp | VIO AGRI',
    description: 'Tìm kiếm và lọc đất nông nghiệp, đất vườn, trang trại trên toàn quốc với bộ lọc chuyên sâu.',
    alternates: { canonical: '/tim-kiem' },
  }
}

// ── Province slug → id ────────────────────────────────────────────────────────

async function resolveProvinceId(slug: string): Promise<number | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createCachedClient()
  const { data } = await supabase
    .from('provinces')
    .select('id')
    .eq('slug', slug)
    .single()
  return (data as { id: number } | null)?.id ?? null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TimKiemPage({ searchParams }: PageProps) {
  const p = await searchParams

  const provinceId = p.province ? (await resolveProvinceId(p.province)) ?? undefined : undefined
  const landTypes  = p.land_type ? p.land_type.split(',').filter(Boolean) : []
  const legals     = p.legal     ? p.legal.split(',').filter(Boolean)     : []
  const priceMin   = p.price_min ? Number(p.price_min) : undefined
  const priceMax   = p.price_max ? Number(p.price_max) : undefined
  const sort       = (p.sort as 'newest' | 'price_asc' | 'price_desc') ?? 'newest'
  const page       = p.page ? Math.max(1, Number(p.page)) : 1

  const [result, provinces] = await Promise.all([
    fetchLandListings({ q: p.q?.trim(), provinceId, landTypes, legals, priceMin, priceMax, sort, page }),
    fetchProvinces(),
  ])

  const activeFilterCount = [
    p.province,
    p.land_type,
    p.legal,
    p.price_min ?? p.price_max,
  ].filter(Boolean).length

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">

      {/* ── Sticky header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 backdrop-blur-md">
        <div className="flex h-[57px] items-center gap-4 px-4 sm:px-5 lg:px-6">

          {/* Logo / back */}
          <Link
            href="/"
            className="shrink-0 text-[15px] font-black tracking-tight text-vio-forest no-underline"
          >
            VIO
          </Link>

          {/* Search form */}
          <form
            action="/tim-kiem"
            method="get"
            className="flex flex-1 items-center gap-2"
          >
            {/* Preserve non-q filters across search */}
            {p.province  && <input type="hidden" name="province"   value={p.province}  />}
            {p.land_type && <input type="hidden" name="land_type"  value={p.land_type} />}
            {p.legal     && <input type="hidden" name="legal"      value={p.legal}     />}
            {p.price_min && <input type="hidden" name="price_min"  value={p.price_min} />}
            {p.price_max && <input type="hidden" name="price_max"  value={p.price_max} />}
            {sort !== 'newest' && <input type="hidden" name="sort" value={sort} />}

            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="2"/>
                <path d="M17 17l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="search"
                name="q"
                defaultValue={p.q ?? ''}
                placeholder="Tìm kiếm đất nông nghiệp..."
                autoComplete="off"
                className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-0
                           pl-9 pr-3 text-[14px] text-[#1d1d1f] placeholder:text-neutral-400
                           outline-none transition-colors
                           focus:border-vio-forest/40 focus:bg-white focus:ring-2 focus:ring-vio-forest/10"
              />
            </div>
          </form>

          {/* Active filter indicator (mobile) */}
          {activeFilterCount > 0 && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                             bg-vio-forest text-[11px] font-black text-white lg:hidden">
              {activeFilterCount}
            </span>
          )}
        </div>
      </header>

      {/* ── 3-column content ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        <SearchPanel
          result={result}
          provinces={provinces}
          currentSort={sort}
        />
      </div>

    </div>
  )
}
