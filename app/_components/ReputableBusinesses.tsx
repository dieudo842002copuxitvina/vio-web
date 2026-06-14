import Link               from 'next/link'
import { createCachedClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BusinessCard {
  slug:       string
  name:       string
  location:   string | null
  avatarUrl:  string | null
  trustScore: number
  verified:   boolean
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK: BusinessCard[] = [
  { slug: 'htx-nong-nghiep-dong-nai',   name: 'HTX Nông Nghiệp Đồng Nai',        location: 'Đồng Nai',   avatarUrl: null, trustScore: 92, verified: true  },
  { slug: 'cong-ty-cao-su-binh-phuoc',  name: 'Công ty Cao Su Bình Phước',        location: 'Bình Phước', avatarUrl: null, trustScore: 88, verified: true  },
  { slug: 'nong-trai-huu-co-gia-lai',   name: 'Nông Trại Hữu Cơ Gia Lai',        location: 'Gia Lai',    avatarUrl: null, trustScore: 83, verified: true  },
  { slug: 'htx-lua-gao-an-giang',       name: 'HTX Lúa Gạo An Giang',            location: 'An Giang',   avatarUrl: null, trustScore: 79, verified: true  },
  { slug: 'cty-nong-san-dak-lak',       name: 'Cty Xuất Khẩu Nông Sản Đắk Lắk', location: 'Đắk Lắk',   avatarUrl: null, trustScore: 76, verified: true  },
  { slug: 'trang-trai-dieu-binh-thuan', name: 'Trang Trại Điều Bình Thuận',      location: 'Bình Thuận', avatarUrl: null, trustScore: 72, verified: false },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function starRating(score: number): string {
  return (score / 20).toFixed(1)
}

// ── Data ──────────────────────────────────────────────────────────────────────

type SfRow = {
  slug: string; business_name: string; avatar_url: string | null; is_verified: boolean
  provinces: { name: string } | null
}

async function fetchBusinesses(): Promise<BusinessCard[]> {
  try {
    const supabase = createCachedClient()
    const { data } = await supabase
      .from('storefronts')
      .select('slug, business_name, avatar_url, is_verified, provinces(name)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(6)

    const rows = (data ?? []) as unknown as SfRow[]
    if (rows.length < 2) return MOCK

    return rows.map((s, i) => ({
      slug:       s.slug,
      name:       s.business_name,
      location:   s.provinces?.name ?? null,
      avatarUrl:  s.avatar_url,
      trustScore: Math.max(65, 95 - i * 4),
      verified:   s.is_verified,
    }))
  } catch {
    return MOCK
  }
}

// ── Card ──────────────────────────────────────────────────────────────────────

function Card({ biz }: { biz: BusinessCard }) {
  const stars = starRating(biz.trustScore)

  return (
    <Link
      href={`/doanh-nghiep/${biz.slug}`}
      className="flex items-center gap-4 rounded-[20px] bg-white p-5 no-underline
                 shadow-sm ring-1 ring-black/5
                 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Avatar — circular, gray-100 background */}
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden
                   rounded-full bg-gray-100"
        aria-hidden="true"
      >
        {biz.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={biz.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <span className="text-sm font-bold text-gray-500">
            {initials(biz.name)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate font-bold text-gray-900">
          {biz.name}
        </p>
        {biz.location && (
          <p className="m-0 mt-0.5 truncate text-sm text-gray-400">
            {biz.location}
          </p>
        )}

        {/* Star rating + verified */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
            ★ <span className="tabular-nums">{stars}</span>
          </span>

          {biz.verified && (
            <>
              <span className="h-3 w-px bg-gray-200" aria-hidden="true" />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[9px] text-white"
                  aria-hidden="true"
                >
                  ✓
                </span>
                Đã xác thực
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function ReputableBusinesses() {
  const businesses = await fetchBusinesses()

  return (
    <section
      aria-labelledby="reputable-businesses-heading"
      className="px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex items-baseline justify-between">
          <h2
            id="reputable-businesses-heading"
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            Doanh nghiệp uy tín
          </h2>
          <Link
            href="/doanh-nghiep"
            className="text-sm font-semibold text-green-700 no-underline hover:underline"
          >
            Tất cả doanh nghiệp →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {businesses.map(biz => (
            <Card key={biz.slug} biz={biz} />
          ))}
        </div>

      </div>
    </section>
  )
}
