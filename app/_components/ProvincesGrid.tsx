import Link                    from 'next/link'
import { createCachedClient } from '@/lib/supabase/server'

const PROVINCES = [
  { slug: 'dong-nai',   name: 'Đồng Nai',   icon: '🌳', topCommodity: 'Cao su'     },
  { slug: 'binh-phuoc', name: 'Bình Phước', icon: '🌿', topCommodity: 'Hồ tiêu'   },
  { slug: 'tay-ninh',   name: 'Tây Ninh',   icon: '🌾', topCommodity: 'Khoai mì'  },
  { slug: 'lam-dong',   name: 'Lâm Đồng',   icon: '🏔️', topCommodity: 'Sầu riêng' },
  { slug: 'gia-lai',    name: 'Gia Lai',    icon: '☕', topCommodity: 'Cà phê'    },
  { slug: 'dak-lak',    name: 'Đắk Lắk',   icon: '🌱', topCommodity: 'Cà phê'    },
] as const

// ── Data ──────────────────────────────────────────────────────────────────────

async function getListingCounts(): Promise<Map<string, number>> {
  const supabase = createCachedClient()
  const slugs    = PROVINCES.map(p => p.slug)

  const [provinceRes, listingRes] = await Promise.all([
    supabase.from('provinces').select('id, slug').in('slug', slugs),
    supabase
      .from('listings')
      .select('province_id')
      .eq('listing_type', 'land')
      .eq('is_public', true)
      .eq('moderation_status', 'approved')
      .limit(500),
  ])

  const idToSlug = new Map<number, string>(
    ((provinceRes.data ?? []) as { id: number; slug: string }[]).map(p => [p.id, p.slug]),
  )

  const counts = new Map<string, number>()
  for (const { province_id } of (listingRes.data ?? []) as { province_id: number }[]) {
    const slug = idToSlug.get(province_id)
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  return counts
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function ProvincesGrid() {
  const counts = await getListingCounts()

  return (
    <section
      aria-labelledby="provinces-grid-heading"
      className="px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-widest text-amber-500">
              Bất động sản địa phương
            </p>
            <h2
              id="provinces-grid-heading"
              className="m-0 mt-1 text-2xl font-bold tracking-tight text-gray-900"
            >
              Khám phá theo khu vực
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {PROVINCES.map(p => {
            const count = counts.get(p.slug) ?? 0

            return (
              <Link
                key={p.slug}
                href={`/dat-nong-nghiep/${p.slug}`}
                className="group flex flex-col gap-3 rounded-2xl bg-white p-5 no-underline
                           ring-1 ring-black/5
                           transition-all duration-200
                           hover:shadow-sm hover:ring-green-500/50"
              >
                {/* Icon — top */}
                <span
                  className="text-3xl leading-none transition-transform duration-200 group-hover:scale-110"
                  aria-hidden="true"
                >
                  {p.icon}
                </span>

                {/* Province name — middle */}
                <div className="flex-1">
                  <p className="m-0 text-lg font-semibold leading-snug text-gray-900">
                    {p.name}
                  </p>
                  <p className="m-0 mt-1 text-xs text-gray-400">
                    {count > 0 ? `${count} tin đăng` : 'Xem tin đăng'}
                  </p>
                </div>

                {/* Crop tag — bottom */}
                <span
                  className="inline-block w-fit rounded-full bg-green-50 px-2.5 py-1
                             text-xs font-medium text-green-700"
                >
                  {p.topCommodity}
                </span>
              </Link>
            )
          })}
        </div>

      </div>
    </section>
  )
}
