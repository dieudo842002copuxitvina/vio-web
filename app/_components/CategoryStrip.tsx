import Link from 'next/link'

const CATEGORIES = [
  { label: '🌾 Đất nông nghiệp', href: '/dat-nong-nghiep' },
  { label: '🥬 Nông sản',         href: '/nong-san'         },
  { label: '🚜 Máy móc',          href: '/may-nong-nghiep'  },
  { label: '🧪 Vật tư',           href: '/vat-tu'           },
  { label: '🌿 Dịch vụ',          href: '/dich-vu'          },
  { label: '🏡 Cho thuê',         href: '/cho-thue'         },
] as const

export function CategoryStrip() {
  return (
    <div className="border-b border-gray-100 bg-white">
      <div className="no-scrollbar mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3">
        {CATEGORIES.map(cat => (
          <Link
            key={cat.href}
            href={cat.href}
            className="whitespace-nowrap rounded-full border border-gray-200
                       bg-white px-4 py-2 text-sm font-medium text-gray-700
                       no-underline
                       transition-colors
                       hover:border-green-500 hover:text-green-700
                       active:scale-[0.97]"
          >
            {cat.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
