import Link from 'next/link'

const POLICY_LINKS = [
  { href: '/chinh-sach-bao-mat', label: 'Chính sách bảo mật' },
  { href: '/dieu-khoan-su-dung', label: 'Điều khoản sử dụng' },
  { href: '/lien-he',            label: 'Liên hệ' },
]

export function Footer() {
  return (
    <footer className="mt-24 border-t border-gray-200/70 dark:border-white/[0.07]">
      <div className="page-wrap py-8 flex flex-wrap items-center justify-between gap-y-3 gap-x-8">

        <span className="text-sm text-gray-400 dark:text-gray-600 tracking-tight select-none">
          © {new Date().getFullYear()} VIO LOCAL
        </span>

        <nav className="flex flex-wrap gap-5" aria-label="Chính sách">
          {POLICY_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-gray-400 dark:text-gray-600 no-underline hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-150"
            >
              {l.label}
            </Link>
          ))}
        </nav>

      </div>
    </footer>
  )
}
