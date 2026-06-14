import Link from 'next/link'

const TRENDING = [
  { label: 'Đất cao su Đồng Nai', href: '/dat-nong-nghiep?q=cao+su'        },
  { label: 'Sầu riêng Ri6',       href: '/dat-nong-nghiep?q=sau+rieng'     },
  { label: 'Cà phê nhân xô',      href: '/dat-nong-nghiep?q=ca+phe'        },
  { label: 'Máy cày Kubota',      href: '/may-nong-nghiep?q=kubota'        },
  { label: 'Vườn mít Thái',       href: '/dat-nong-nghiep?q=mit'           },
  { label: 'Đất lúa An Giang',    href: '/dat-nong-nghiep?q=lua'           },
  { label: 'Tiêu đen Bình Phước', href: '/dat-nong-nghiep?q=tieu'          },
  { label: 'Tưới nhỏ giọt',       href: '/vat-tu?q=tuoi'                   },
  { label: 'Phân bón hữu cơ',     href: '/vat-tu?q=phan+bon'               },
  { label: 'Đất vườn Lâm Đồng',   href: '/dat-nong-nghiep?q=vuon+lam+dong' },
] as const

export function TrendingSearches() {
  return (
    <div className="border-b border-gray-100 px-4 py-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <span
            className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-widest text-gray-400"
            aria-label="Xu hướng tìm kiếm"
          >
            Xu hướng:
          </span>
          {TRENDING.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-white
                         px-3 py-1 text-xs font-medium text-gray-600 no-underline
                         transition-colors hover:bg-gray-50"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
