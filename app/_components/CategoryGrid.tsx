import Link from 'next/link'

const CATEGORIES = [
  {
    icon:   '🌾',
    iconBg: 'bg-emerald-50',
    title:  'Đất nông nghiệp',
    count:  '1.200+ tin',
    href:   '/dat-nong-nghiep',
  },
  {
    icon:   '🌿',
    iconBg: 'bg-lime-50',
    title:  'Nông sản',
    count:  '830+ tin',
    href:   '/nong-san',
  },
  {
    icon:   '🏢',
    iconBg: 'bg-blue-50',
    title:  'Doanh nghiệp',
    count:  '180+ DN',
    href:   '/doanh-nghiep',
  },
  {
    icon:   '🔧',
    iconBg: 'bg-orange-50',
    title:  'Dịch vụ',
    count:  '320+ tin',
    href:   '/dich-vu',
  },
  {
    icon:   '📦',
    iconBg: 'bg-violet-50',
    title:  'Vật tư',
    count:  '210+ tin',
    href:   '/vat-tu',
  },
  {
    icon:   '🚜',
    iconBg: 'bg-amber-50',
    title:  'Máy móc',
    count:  '140+ tin',
    href:   '/may-nong-nghiep',
  },
] as const

export function CategoryGrid() {
  return (
    <section
      aria-labelledby="categories-heading"
      className="px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">

        {/* Section header */}
        <div className="mb-6 flex items-baseline justify-between">
          <h2
            id="categories-heading"
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            Khám phá theo lĩnh vực
          </h2>
          <Link
            href="/danh-muc"
            className="text-sm font-semibold text-green-700 no-underline hover:underline"
          >
            Tất cả →
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-white p-4 text-center
                         no-underline ring-1 ring-black/5 shadow-sm
                         transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
              aria-label={`Khám phá ${cat.title}`}
            >
              {/* Pastel icon circle */}
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${cat.iconBg}
                            transition-transform duration-200 group-hover:scale-110`}
                aria-hidden="true"
              >
                {cat.icon}
              </span>

              <div>
                <p className="m-0 text-[0.8125rem] font-semibold leading-snug text-gray-900 sm:text-sm">
                  {cat.title}
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
