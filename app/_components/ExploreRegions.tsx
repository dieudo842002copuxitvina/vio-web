import Link from 'next/link'

const REGIONS = [
  { slug: 'dong-nai',   name: 'Đồng Nai',   icon: '🌳' },
  { slug: 'binh-phuoc', name: 'Bình Phước', icon: '🌿' },
  { slug: 'tay-ninh',   name: 'Tây Ninh',   icon: '🌾' },
  { slug: 'lam-dong',   name: 'Lâm Đồng',   icon: '🏔️' },
  { slug: 'gia-lai',    name: 'Gia Lai',    icon: '☕'  },
  { slug: 'dak-lak',    name: 'Đắk Lắk',   icon: '🌱'  },
] as const

export function ExploreRegions() {
  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl">

        <div className="mb-10">
          <p className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[#FF9500]">
            Bất động sản địa phương
          </p>
          <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Khám phá theo khu vực
          </h2>
        </div>

        {/* 3×2 on sm+, 2×3 on mobile — no borders, whitespace only */}
        <div className="grid grid-cols-2 gap-y-12 sm:grid-cols-3">
          {REGIONS.map(r => (
            <div
              key={r.slug}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span className="text-[3.5rem] leading-none" aria-hidden="true">
                {r.icon}
              </span>
              <div>
                <p className="m-0 text-[0.9375rem] font-semibold text-gray-900">
                  {r.name}
                </p>
                <Link
                  href={`/dat-nong-nghiep/${r.slug}`}
                  className="text-sm font-medium text-blue-600 no-underline hover:underline"
                >
                  Xem tin đăng
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
