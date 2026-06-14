import Link                       from 'next/link'
import { getTrustedMerchantFeed } from '@/features/commerce/api/regional-ops.server'
import { createCachedClient }     from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MerchantDisplay {
  slug:               string
  business_name:      string
  description:        string | null
  avatar_url:         string | null
  is_verified:        boolean
  trust_score:        number
  active_listings:    number
  avg_response_hours: number
  identity_verified:  boolean
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK: MerchantDisplay[] = [
  { slug: 'htx-nong-nghiep-dong-nai',   business_name: 'HTX Nông Nghiệp Đồng Nai',        description: null, avatar_url: null, is_verified: true,  trust_score: 91, active_listings: 12, avg_response_hours: 2.5,  identity_verified: true  },
  { slug: 'cong-ty-cao-su-binh-phuoc',  business_name: 'Công ty Cao Su Bình Phước',        description: null, avatar_url: null, is_verified: true,  trust_score: 87, active_listings: 8,  avg_response_hours: 3.0,  identity_verified: true  },
  { slug: 'nong-trai-huu-co-gia-lai',   business_name: 'Nông Trại Hữu Cơ Gia Lai',        description: null, avatar_url: null, is_verified: true,  trust_score: 83, active_listings: 6,  avg_response_hours: 4.0,  identity_verified: true  },
  { slug: 'htx-lua-gao-an-giang',       business_name: 'HTX Lúa Gạo An Giang',            description: null, avatar_url: null, is_verified: true,  trust_score: 79, active_listings: 5,  avg_response_hours: 6.0,  identity_verified: false },
  { slug: 'cty-xuat-khau-dak-lak',      business_name: 'Cty Xuất Khẩu Nông Sản Đắk Lắk', description: null, avatar_url: null, is_verified: true,  trust_score: 76, active_listings: 9,  avg_response_hours: 3.5,  identity_verified: true  },
  { slug: 'trang-trai-dieu-binh-thuan', business_name: 'Trang Trại Điều Bình Thuận',      description: null, avatar_url: null, is_verified: false, trust_score: 72, active_listings: 3,  avg_response_hours: 8.0,  identity_verified: false },
  { slug: 'dai-ly-nong-san-tay-ninh',   business_name: 'Đại Lý Nông Sản Tây Ninh',        description: null, avatar_url: null, is_verified: false, trust_score: 68, active_listings: 4,  avg_response_hours: 5.0,  identity_verified: false },
  { slug: 'vuon-sau-rieng-lam-dong',    business_name: 'Vườn Sầu Riêng Lâm Đồng',         description: null, avatar_url: null, is_verified: false, trust_score: 65, active_listings: 2,  avg_response_hours: 12.0, identity_verified: false },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function avatarBg(name: string): string {
  const colors = ['#1A4D2E', '#0071E3', '#FF9500', '#2E7D32', '#5856D6', '#C62828']
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]!
}

function formatResponse(hours: number): string {
  if (hours < 1)  return '< 1h'
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}ngày`
}

function trustLabel(score: number): string {
  if (score >= 85) return '⭐ Xuất sắc'
  if (score >= 75) return '✓ Tốt'
  return '○ Cơ bản'
}

// ── Data ──────────────────────────────────────────────────────────────────────

type StorefrontRow = {
  merchant_id: string; slug: string; business_name: string
  description: string | null; avatar_url: string | null; is_verified: boolean
}

async function fetchMerchants(): Promise<MerchantDisplay[]> {
  const trusted = await getTrustedMerchantFeed(null, 8)
  if (!trusted.length) return MOCK

  const supabase = createCachedClient()
  const { data } = await supabase
    .from('storefronts')
    .select('merchant_id, slug, business_name, description, avatar_url, is_verified')
    .in('merchant_id', trusted.map(t => t.profile_id))
    .eq('is_public', true)

  const sfMap = new Map<string, StorefrontRow>(
    ((data ?? []) as StorefrontRow[]).map(s => [s.merchant_id, s]),
  )

  const result = trusted
    .map(t => {
      const s = sfMap.get(t.profile_id)
      if (!s) return null
      return {
        slug: s.slug, business_name: s.business_name, description: s.description,
        avatar_url: s.avatar_url, is_verified: s.is_verified, trust_score: t.trust_score,
        active_listings: t.active_listings, avg_response_hours: t.avg_response_hours,
        identity_verified: t.identity_verified,
      }
    })
    .filter((m): m is MerchantDisplay => m !== null)

  return result.length >= 2 ? result : MOCK
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function FeaturedBusinesses() {
  const merchants = await fetchMerchants()

  return (
    <section className="border-t border-neutral-100 bg-[#F7F9F5] px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-1 rounded-full"
              style={{ background: '#2E7D32' }}
              aria-hidden="true"
            />
            <h2 className="m-0 text-[1rem] font-black text-[#1A1A1A]">
              Doanh nghiệp nông nghiệp uy tín
            </h2>
          </div>
          <Link
            href="/doanh-nghiep"
            className="text-[0.8125rem] font-semibold no-underline"
            style={{ color: '#2E7D32' }}
          >
            Tất cả doanh nghiệp →
          </Link>
        </div>

        {/* 4-col compact merchant grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {merchants.map(m => (
            <Link
              key={m.slug}
              href={`/doanh-nghiep/${m.slug}`}
              className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white
                         px-4 py-3.5 no-underline transition-all
                         hover:border-neutral-200 hover:shadow-sm"
            >
              {/* Avatar */}
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden
                           rounded-xl text-[0.75rem] font-black text-white"
                style={{ backgroundColor: avatarBg(m.business_name) }}
                aria-hidden="true"
              >
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  initials(m.business_name)
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[0.8125rem] font-bold leading-tight text-[#1A1A1A]">
                  {m.business_name}
                </p>

                {/* Badges */}
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {m.identity_verified && (
                    <span
                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ background: '#E8F5E9', color: '#2E7D32' }}
                    >
                      ✓ Định danh
                    </span>
                  )}
                  {m.is_verified && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                      ✓ Xác thực
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="mt-1.5 flex items-center gap-3 text-[0.6875rem] text-neutral-400">
                  <span>
                    <span className="font-bold text-[#1A1A1A]">{m.active_listings}</span> tin
                  </span>
                  <span className="h-3 w-px bg-neutral-200" aria-hidden="true" />
                  <span>
                    Phản hồi <span className="font-bold text-[#1A1A1A]">{formatResponse(m.avg_response_hours)}</span>
                  </span>
                  <span className="h-3 w-px bg-neutral-200" aria-hidden="true" />
                  <span
                    className="font-semibold"
                    style={{ color: m.trust_score >= 85 ? '#F9A825' : m.trust_score >= 75 ? '#2E7D32' : '#9E9E9E' }}
                  >
                    {trustLabel(m.trust_score)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
