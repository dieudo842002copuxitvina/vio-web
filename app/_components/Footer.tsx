import Link from 'next/link'

// ── Link columns ──────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    heading: 'Nền tảng',
    links: [
      { label: 'Khám phá đất',    href: '/dat-nong-nghiep'          },
      { label: 'Tỉnh thành',      href: '/dat-nong-nghiep'            },
      { label: 'Bản đồ',          href: '/ban-do'                    },
      { label: 'Doanh nghiệp',    href: '/doanh-nghiep'              },
      { label: 'Membership',      href: '/membership'                },
      { label: 'Đăng tin',        href: '/dashboard/tin-dang/moi'   },
    ],
  },
  {
    heading: 'Tỉnh thành',
    links: [
      { label: 'Lâm Đồng',   href: '/dat-nong-nghiep/lam-dong'    },
      { label: 'Đắk Lắk',   href: '/dat-nong-nghiep/dak-lak'     },
      { label: 'Gia Lai',    href: '/dat-nong-nghiep/gia-lai'     },
      { label: 'Đồng Nai',  href: '/dat-nong-nghiep/dong-nai'    },
      { label: 'Bình Phước', href: '/dat-nong-nghiep/binh-phuoc'  },
      { label: 'An Giang',   href: '/dat-nong-nghiep/an-giang'    },
    ],
  },
  {
    heading: 'Công ty',
    links: [
      { label: 'Về VIO AGRI',      href: '/ve-chung-toi'          },
      { label: 'Blog & Tin tức',   href: '/blog'                  },
      { label: 'Tuyển dụng',       href: '/tuyen-dung'            },
      { label: 'Liên hệ',          href: '/lien-he'               },
    ],
  },
  {
    heading: 'Hỗ trợ',
    links: [
      { label: 'Trung tâm hỗ trợ', href: '/ho-tro'                 },
      { label: 'Báo cáo lỗi',      href: '/bao-loi'               },
      { label: 'Quy trình đăng tin', href: '/ho-tro/dang-tin'     },
      { label: 'Xác minh pháp lý', href: '/ho-tro/phap-ly'       },
    ],
  },
] as const

// ── Social icons ──────────────────────────────────────────────────────────────

const SOCIAL = [
  {
    label: 'Facebook',
    href:  'https://facebook.com/vioagri',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href:  'https://youtube.com/@vioagri',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      </svg>
    ),
  },
] as const

const LEGAL = [
  { label: 'Chính sách bảo mật', href: '/chinh-sach-bao-mat' },
  { label: 'Điều khoản sử dụng', href: '/dieu-khoan-su-dung' },
  { label: 'Cookie',             href: '/chinh-sach-cookie'  },
] as const

// ── Footer ────────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="bg-[#0A0A0A]" aria-label="Footer">
      <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-16 sm:px-8">

        {/* ── Top row: brand + link columns ────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">

          {/* Brand column */}
          <div>
            <Link href="/" className="inline-block no-underline" aria-label="VIO AGRI — Trang chủ">
              <span className="text-[1.125rem] font-black tracking-tight text-white">
                VIO
              </span>
              <span className="ml-0.5 text-[0.7rem] font-bold tracking-[0.12em] text-vio-forest">
                AGRI
              </span>
            </Link>

            <p className="mt-3 max-w-[260px] text-[13px] leading-relaxed text-white/45">
              Nền tảng giao dịch đất nông nghiệp cao cấp tại Việt Nam. Kết nối nhà đầu tư với chủ đất uy tín.
            </p>

            <div className="mt-5 flex gap-3" aria-label="Mạng xã hội">
              {SOCIAL.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl
                             text-white/35 transition-colors hover:text-white"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map(col => (
            <div key={col.heading}>
              <p className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/35">
                {col.heading}
              </p>
              <ul className="m-0 list-none space-y-3 p-0">
                {col.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] leading-none text-white/55 no-underline
                                 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Divider ───────────────────────────────────────────────── */}
        <div className="my-10 h-px bg-white/[0.07]" aria-hidden="true" />

        {/* ── Bottom row: copyright + legal ─────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-[13px] text-white/25">
            © {new Date().getFullYear()} VIO AGRI. Bảo lưu mọi quyền.
          </p>
          <nav aria-label="Điều khoản pháp lý">
            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
              {LEGAL.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-white/35 no-underline
                               transition-colors hover:text-white/65"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

      </div>
    </footer>
  )
}
