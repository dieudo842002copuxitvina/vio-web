import Image from 'next/image'
import Link  from 'next/link'

// ── Province data ──────────────────────────────────────────────────────────────
//
// imageUrl trỏ tới ảnh local trong thư mục public/images/.
// Cách thêm ảnh: đặt file vào public/images/ với tên đúng như bên dưới,
// ví dụ: public/images/tinh-lam-dong.jpg (600×450, tỉ lệ 4:3, ≤150 kB).
//
// Nếu chưa có ảnh thực, thẻ <Image> sẽ hiển thị ảnh placeholder tạm thời
// nhờ thuộc tính onError bên dưới.

const PROVINCES = [
  {
    slug:     'lam-dong',
    name:     'Lâm Đồng',
    region:   'Tây Nguyên',
    imageUrl: '/images/tinh-lam-dong.jpg',
  },
  {
    slug:     'dak-lak',
    name:     'Đắk Lắk',
    region:   'Tây Nguyên',
    imageUrl: '/images/tinh-dak-lak.jpg',
  },
  {
    slug:     'gia-lai',
    name:     'Gia Lai',
    region:   'Tây Nguyên',
    imageUrl: '/images/tinh-gia-lai.jpg',
  },
  {
    slug:     'dong-nai',
    name:     'Đồng Nai',
    region:   'Đông Nam Bộ',
    imageUrl: '/images/tinh-dong-nai.jpg',
  },
  {
    slug:     'binh-phuoc',
    name:     'Bình Phước',
    region:   'Đông Nam Bộ',
    imageUrl: '/images/tinh-binh-phuoc.jpg',
  },
  {
    slug:     'tay-ninh',
    name:     'Tây Ninh',
    region:   'Đông Nam Bộ',
    imageUrl: '/images/tinh-tay-ninh.jpg',
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
      <Image
        src={imageUrl}
        alt={`Vùng đất nông nghiệp ${name}`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        // fallback: nếu file local chưa có, dùng màu nền xám thay vì ảnh vỡ
        onError={(e) => {
          const img = e.currentTarget
          img.style.display = 'none'
        }}
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
