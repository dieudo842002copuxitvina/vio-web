import Link from 'next/link'

const CATEGORIES = [
  { href: '/dat-nong-nghiep', icon: '🏞️', iconBg: 'bg-emerald-50', label: 'Đất nông nghiệp',  count: '1.200+ tin đăng'   },
  { href: '/nong-san',        icon: '🌾', iconBg: 'bg-lime-50',    label: 'Nông sản',          count: '850+ sản phẩm'     },
  { href: '/doanh-nghiep',    icon: '🏢', iconBg: 'bg-blue-50',    label: 'Doanh nghiệp',     count: '500+ doanh nghiệp' },
  { href: '/dich-vu',         icon: '🔧', iconBg: 'bg-orange-50',  label: 'Dịch vụ',           count: '320+ dịch vụ'      },
  { href: '/vat-tu',          icon: '📦', iconBg: 'bg-violet-50',  label: 'Vật tư',            count: '280+ sản phẩm'     },
  { href: '/may-nong-nghiep', icon: '🚜', iconBg: 'bg-amber-50',   label: 'Máy nông nghiệp',  count: '150+ thiết bị'     },
] as const

export function ExploreCategories() {
  return (
    <section
      aria-labelledby="explore-categories-heading"
      className="px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex items-baseline justify-between">
          <h2
            id="explore-categories-heading"
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            Khám phá theo lĩnh vực
          </h2>
          <Link
            href="/dat-nong-nghiep"
            className="text-sm font-semibold text-green-700 no-underline hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-white p-4 text-center
                         no-underline ring-1 ring-black/5 shadow-sm
                         transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
              aria-label={`Khám phá ${cat.label}`}
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${cat.iconBg}
                            transition-transform duration-200 group-hover:scale-110`}
                aria-hidden="true"
              >
                {cat.icon}
              </span>
              <div>
                <p className="m-0 text-[0.8125rem] font-semibold leading-snug text-gray-900 sm:text-sm">
                  {cat.label}
                </p>
                <p className="m-0 mt-1 text-xs text-gray-400">
                  {cat.count}
                </p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
