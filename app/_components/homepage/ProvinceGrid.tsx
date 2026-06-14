import Link from 'next/link'

// ── Province data ──────────────────────────────────────────────────────────────
//
// Unsplash images are temporary royalty-free placeholders.
// Replace with actual provincial photography before launch.
// Image dimensions: 600 × 450 (4:3) at 80% quality.

const PROVINCES = [
  {
    slug:     'lam-dong',
    name:     'Lâm Đồng',
    region:   'Tây Nguyên',
    imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=75',
  },
  {
    slug:     'dak-lak',
    name:     'Đắk Lắk',
    region:   'Tây Nguyên',
    imageUrl: 'https://images.unsplash.com/photo-1520637836993-5ebe81f8d8b8?auto=format&fit=crop&w=600&q=75',
  },
  {
    slug:     'gia-lai',
    name:     'Gia Lai',
    region:   'Tây Nguyên',
    imageUrl: 'https://images.unsplash.com/photo-1536054590849-a48eae5af3b6?auto=format&fit=crop&w=600&q=75',
  },
  {
    slug:     'dong-nai',
    name:     'Đồng Nai',
    region:   'Đông Nam Bộ',
    imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=75',
  },
  {
    slug:     'binh-phuoc',
    name:     'Bình Phước',
    region:   'Đông Nam Bộ',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-f7e8bc44d2c3?auto=format&fit=crop&w=600&q=75',
  },
  {
    slug:     'tay-ninh',
    name:     'Tây Ninh',
    region:   'Đông Nam Bộ',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=75',
  },
  {
    slug:     'an-giang',
    name:     'An Giang',
    region:   'Đồng bằng sông Cửu Long',
    imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=75',
  },
  {
    slug:     'long-an',
    name:     'Long An',
    region:   'Đồng bằng sông Cửu Long',
    imageUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=75',
  },
] as const

// ── ProvinceCard ───────────────────────────────────────────────────────────────

function ProvinceCard({
  slug, name, region, imageUrl,
}: (typeof PROVINCES)[number]) {
  return (
    <Link
      href={`/dat-nong-nghiep/${slug}`}
      prefetch={false}
      className="group relative block aspect-[4/3] overflow-hidden rounded-[16px]
                 no-underline shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
      aria-label={`Xem đất tại ${name}`}
    >
      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`Vùng đất nông nghiệp ${name}`}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover
                   transition-transform duration-500 group-hover:scale-[1.05]"
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.68) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Text */}
      <div className="absolute bottom-0 left-0 p-4">
        <p className="text-[17px] font-bold leading-tight text-white">{name}</p>
        <p className="mt-0.5 text-[12px] text-white/75">{region}</p>
      </div>
    </Link>
  )
}

// ── ProvinceGrid ───────────────────────────────────────────────────────────────

export function ProvinceGrid() {
  return (
    <section
      className="bg-[#F5F5F7] py-24 sm:py-32"
      aria-labelledby="provinces-heading"
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">

        {/* Header */}
        <div className="mb-14">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">
            Tỉnh thành
          </p>
          <h2
            id="provinces-heading"
            className="text-[32px] font-bold tracking-[-0.02em] text-[#1d1d1f]
                       sm:text-[40px]"
          >
            Khám phá đất theo tỉnh
          </h2>
        </div>

        {/* Grid: 4 cols desktop / 3 cols tablet / 2 cols mobile */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {PROVINCES.map(p => (
            <ProvinceCard key={p.slug} {...p} />
          ))}
        </div>

        {/* View all link */}
        <div className="mt-10 text-center">
          <Link
            href="/dat-nong-nghiep"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-full border border-[#1d1d1f]/12
                       bg-white px-6 py-3 text-[15px] font-semibold text-[#1d1d1f]
                       no-underline shadow-[0_1px_4px_rgba(0,0,0,0.06)]
                       transition-all hover:bg-[#F0F0F0]"
          >
            Xem tất cả 63 tỉnh thành
          </Link>
        </div>

      </div>
    </section>
  )
}
