import Link from 'next/link'

const POLICY_LINKS = [
  { href: '/chinh-sach-bao-mat', label: 'Chính sách bảo mật' },
  { href: '/dieu-khoan-su-dung', label: 'Điều khoản sử dụng' },
  { href: '/lien-he',            label: 'Liên hệ' },
]

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--line)] bg-[var(--header-bg)]">
      <div className="page-wrap py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
        <span>© {new Date().getFullYear()} VIO LOCAL — Nền tảng thương mại địa phương Việt Nam</span>
        <nav className="flex flex-wrap gap-4" aria-label="Chính sách">
          {POLICY_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[var(--muted)] no-underline hover:text-[var(--sea-ink-soft)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
