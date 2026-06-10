import Link from 'next/link'

// ── Province data ──────────────────────────────────────────────────────────────
// listingCount is mock — swap for a live DB query once listings are seeded.

const PROVINCES = [
  {
    slug:         'dong-nai',
    name:         'Đồng Nai',
    region:       'Đông Nam Bộ',
    listingCount: '1.280+ lô đất',
    imageUrl:     'https://picsum.photos/seed/dong-nai-agri/800/1000',
  },
  {
    slug:         'binh-phuoc',
    name:         'Bình Phước',
    region:       'Đông Nam Bộ',
    listingCount: '940+ lô đất',
    imageUrl:     'https://picsum.photos/seed/binh-phuoc-agri/800/1000',
  },
  {
    slug:         'lam-dong',
    name:         'Lâm Đồng',
    region:       'Tây Nguyên',
    listingCount: '1.850+ lô đất',
    imageUrl:     'https://picsum.photos/seed/lam-dong-agri/800/1000',
  },
  {
    slug:         'tay-ninh',
    name:         'Tây Ninh',
    region:       'Đông Nam Bộ',
    listingCount: '760+ lô đất',
    imageUrl:     'https://picsum.photos/seed/tay-ninh-agri/800/1000',
  },
  {
    slug:         'dak-lak',
    name:         'Đắk Lắk',
    region:       'Tây Nguyên',
    listingCount: '2.100+ lô đất',
    imageUrl:     'https://picsum.photos/seed/dak-lak-agri/800/1000',
  },
] as const

type Province = typeof PROVINCES[number]

// ── Individual card ───────────────────────────────────────────────────────────

function ProvinceCard({
  province,
  isHero = false,
  className = '',
}: {
  province:  Province
  isHero?:   boolean
  className?: string
}) {
  return (
    <Link
      href={`/dat-nong-nghiep/${province.slug}`}
      className={`group relative block cursor-pointer overflow-hidden rounded-3xl no-underline ${className}`}
    >
      {/* ── Photo layer ─────────────────────────────────────────────────────── */}
      {/* bg-gray-800 shows while the photo loads / if it fails */}
      <div className="absolute inset-0 bg-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={province.imageUrl}
          alt={`Đất nông nghiệp ${province.name}`}
          className="h-full w-full object-cover opacity-90
                     transition-transform duration-700 ease-out
                     group-hover:scale-[1.06]"
          loading="lazy"
        />
      </div>

      {/* ── Gradient overlay ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* ── Bottom-aligned content ────────────────────────────────────────── */}
      <div className={`absolute bottom-0 left-0 right-0 ${isHero ? 'p-6' : 'p-4'}`}>

        {/* Region kicker */}
        <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">
          {province.region}
        </p>

        {/* Province name */}
        <h3
          className={`m-0 font-bold tracking-tight text-white
                      ${isHero
                        ? 'text-[1.875rem] leading-tight'
                        : 'text-[1.125rem] leading-snug'}`}
        >
          {province.name}
        </h3>

        {/* Glassmorphic listing-count pill */}
        <span
          className={`mt-2 inline-flex items-center rounded-full
                      border border-white/25 bg-white/15 font-semibold
                      text-white backdrop-blur-md
                      ${isHero
                        ? 'px-3.5 py-1.5 text-[13px]'
                        : 'px-2.5 py-1   text-[11px]'}`}
        >
          {province.listingCount}
        </span>

      </div>
    </Link>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

export function ProvinceDiscovery() {
  const [hero, ...rest] = PROVINCES   // Đồng Nai is the editorial hero

  return (
    <section
      aria-labelledby="province-discovery-heading"
      className="mx-auto max-w-7xl px-4 py-8"
    >

      {/* Header row */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2
            id="province-discovery-heading"
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            Khám phá đất theo khu vực
          </h2>
          <p className="m-0 mt-1 text-sm text-gray-500">
            Bất động sản nông nghiệp tại các vùng kinh tế trọng điểm
          </p>
        </div>
        <Link
          href="/dat-nong-nghiep"
          className="shrink-0 text-sm font-semibold text-green-700 no-underline hover:underline"
        >
          Xem tất cả →
        </Link>
      </div>

      {/* ── Desktop: editorial bento grid ─────────────────────────────────── */}
      {/*
          Layout (3-col, 2-row):
            ┌────────────────┬─────────┬─────────┐
            │                │  [1]    │  [2]    │
            │   hero (2fr)   ├─────────┼─────────┤
            │                │  [3]    │  [4]    │
            └────────────────┴─────────┴─────────┘
          The hero occupies 2fr of width + 2 rows → renders as a tall portrait card.
          Small cards use aspect-[4/5] to set the row heights; the hero fills them.
      */}
      <div
        className="hidden md:grid md:gap-3"
        style={{ gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: 'repeat(2, auto)' }}
      >
        <ProvinceCard province={hero} isHero className="row-span-2" />
        {rest.map(p => (
          <ProvinceCard key={p.slug} province={p} className="aspect-[4/5]" />
        ))}
      </div>

      {/* ── Mobile: horizontal scroll ──────────────────────────────────────── */}
      <div className="no-scrollbar md:hidden -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {PROVINCES.map(p => (
          <ProvinceCard
            key={p.slug}
            province={p}
            className="aspect-[4/5] w-[68vw] flex-none"
          />
        ))}
      </div>

    </section>
  )
}
