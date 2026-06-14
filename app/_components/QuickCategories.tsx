import Link from 'next/link'

// AGRI-ONLY categories — restaurant/tourism/hotel moved to src/modules/local
const AGRI_CATEGORIES = [
  { icon: '🌾', label: 'Đất nông nghiệp',    href: '/dat-nong-nghiep' },
  { icon: '🌿', label: 'Nông sản',            href: '/nong-san'        },
  { icon: '🔧', label: 'Vật tư nông nghiệp',  href: '/vat-tu'          },
  { icon: '🚜', label: 'Máy nông nghiệp',     href: '/may-nong-nghiep' },
  { icon: '🐄', label: 'Chăn nuôi',           href: '/chan-nuoi'        },
  { icon: '⚙️', label: 'Dịch vụ nông nghiệp', href: '/dich-vu'         },
] as const

export function QuickCategories() {
  return (
    <nav aria-label="Danh mục nông nghiệp" className="border-b border-neutral-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="m-0 flex list-none overflow-x-auto p-0 no-scrollbar">
          {AGRI_CATEGORIES.map(cat => (
            <li key={cat.href} className="flex shrink-0">
              <Link
                href={cat.href}
                className="flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 no-underline
                           text-[0.8125rem] font-semibold text-[#1A1A1A]
                           transition-colors hover:bg-neutral-50 hover:text-[#2E7D32]
                           focus-visible:bg-neutral-50 focus-visible:outline-none"
              >
                <span className="text-base leading-none" aria-hidden="true">{cat.icon}</span>
                <span>{cat.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
