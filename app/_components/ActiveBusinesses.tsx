import Link from 'next/link'
import { createCachedClient } from '@/lib/supabase/server'

// ── Data ──────────────────────────────────────────────────────────────────────

interface StorefrontCard {
  id:            string
  slug:          string
  business_name: string
  description:   string | null
  avatar_url:    string | null
  is_verified:   boolean
}

async function getPublicStorefronts(limit = 8): Promise<StorefrontCard[]> {
  const supabase = createCachedClient()
  const { data } = await supabase
    .from('storefronts')
    .select('id, slug, business_name, description, avatar_url, is_verified')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as StorefrontCard[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function ActiveBusinesses() {
  const storefronts = await getPublicStorefronts(8)
  if (!storefronts.length) return null

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[#0071E3]">
              Đại lý & Hộ kinh doanh
            </p>
            <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Doanh nghiệp đang hoạt động
            </h2>
          </div>
          <Link
            href="/doanh-nghiep"
            className="shrink-0 text-[0.875rem] font-semibold text-[#0071E3] no-underline transition-opacity hover:opacity-70 dark:text-[#409CFF]"
          >
            Tất cả đại lý →
          </Link>
        </div>

        {/* Grid — 4 col desktop / 2 col tablet / 1 col mobile */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {storefronts.map(s => (
            <Link
              key={s.id}
              href={`/doanh-nghiep/${s.slug}`}
              className="group flex items-center gap-4 rounded-3xl bg-white p-5 no-underline shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-transform duration-200 hover:scale-[1.02] dark:bg-[#1C1C1E]"
            >
              {/* Avatar */}
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                {s.avatar_url
                  ? <img src={s.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  : <div className="flex h-full w-full items-center justify-center text-2xl select-none" aria-hidden="true">🏪</div>
                }
              </div>

              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[0.9375rem] font-semibold text-gray-900 group-hover:text-[#0071E3] dark:text-white dark:group-hover:text-[#409CFF]">
                  {s.business_name}
                </p>
                {s.is_verified && (
                  <p className="m-0 mt-0.5 text-[0.75rem] font-semibold text-[#34C759]">
                    ✓ Đã xác thực
                  </p>
                )}
                {s.description && (
                  <p className="m-0 mt-0.5 line-clamp-1 text-[0.75rem] text-gray-500 dark:text-gray-400">
                    {s.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
