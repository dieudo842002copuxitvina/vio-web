import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CrossSellConfig {
  accent:   string
  brand:    string
  headline: string
  sub:      string
  cta:      string
  href:     string
  disabled: boolean
}

// ── Land type → LOCAL cross-sell messaging ────────────────────────────────────
// Maps VIO AGRI land types to relevant VIO LOCAL / VIO EXPORT value props.

const CROSS_SELL_CONFIGS: Record<string, CrossSellConfig> = {
  lua: {
    accent:   '#32ADE6',
    brand:    'VIO LOCAL',
    headline: 'Có lúa — bán ở đâu?',
    sub:      'Kết nối trực tiếp với nhà máy xay xát, thương lái và siêu thị qua VIO LOCAL.',
    cta:      'Tìm người mua lúa →',
    href:     'https://violocal.vn',
    disabled: false,
  },
  'rau-mau': {
    accent:   '#32ADE6',
    brand:    'VIO LOCAL',
    headline: 'Rau màu của bạn — thị trường đang cần',
    sub:      'Kết nối chuỗi siêu thị, nhà hàng và bếp công nghiệp qua VIO LOCAL.',
    cta:      'Xem thị trường nông sản →',
    href:     'https://violocal.vn',
    disabled: false,
  },
  'cay-lau-nam': {
    accent:   '#FF9500',
    brand:    'VIO EXPORT',
    headline: 'Cây lâu năm — giá trị xuất khẩu cao',
    sub:      'Tiêu, cà phê, cao su Việt Nam đang có nhu cầu xuất khẩu lớn. VIO EXPORT đang chuẩn bị hạ tầng.',
    cta:      'Đăng ký quan tâm →',
    href:     '#',
    disabled: true,
  },
  'an-trai': {
    accent:   '#FF9500',
    brand:    'VIO EXPORT',
    headline: 'Trái cây Việt — xuất khẩu đi 40+ thị trường',
    sub:      'Xoài, thanh long, sầu riêng đang có nhu cầu xuất khẩu rất lớn. VIO EXPORT sắp ra mắt.',
    cta:      'Đăng ký quan tâm →',
    href:     '#',
    disabled: true,
  },
  'lam-nghiep': {
    accent:   '#32ADE6',
    brand:    'VIO LOCAL',
    headline: 'Gỗ & lâm sản — kết nối thị trường nội địa',
    sub:      'Nhà máy chế biến gỗ và đối tác thu mua lâm sản đang tìm nguồn cung ổn định trên VIO LOCAL.',
    cta:      'Xem VIO LOCAL →',
    href:     'https://violocal.vn',
    disabled: false,
  },
  'mat-nuoc': {
    accent:   '#32ADE6',
    brand:    'VIO LOCAL',
    headline: 'Nuôi trồng thủy sản — chuỗi thu mua đang mở',
    sub:      'Cá tra, tôm, cua và các loại thủy sản có nhu cầu thu mua lớn qua VIO LOCAL.',
    cta:      'Kết nối thu mua →',
    href:     'https://violocal.vn',
    disabled: false,
  },
}

const DEFAULT_CONFIG: CrossSellConfig = {
  accent:   '#32ADE6',
  brand:    'VIO LOCAL',
  headline: 'Đất này có thể sản xuất gì?',
  sub:      'Kết nối nông sản từ mảnh đất này với hệ thống thu mua và phân phối trên VIO LOCAL.',
  cta:      'Khám phá VIO LOCAL →',
  href:     'https://violocal.vn',
  disabled: false,
}

// ── CrossSellBanner ───────────────────────────────────────────────────────────

export function CrossSellBanner({ landType }: { landType?: string | null }) {
  const cfg: CrossSellConfig = (landType ? CROSS_SELL_CONFIGS[landType] : undefined) ?? DEFAULT_CONFIG

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor:     `${cfg.accent}25`,
        backgroundColor: `${cfg.accent}08`,
      }}
    >
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">

        {/* Brand pill */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-black"
          style={{ background: `${cfg.accent}18`, color: cfg.accent }}
          aria-hidden="true"
        >
          {cfg.brand === 'VIO EXPORT' ? '✈' : '🌱'}
        </div>

        {/* Text */}
        <div className="flex-1">
          <p className="m-0 text-[0.875rem] font-semibold text-gray-900">{cfg.headline}</p>
          <p className="m-0 mt-0.5 text-[0.8125rem] leading-snug text-gray-500">{cfg.sub}</p>
        </div>

        {/* CTA */}
        {cfg.disabled ? (
          <span className="shrink-0 rounded-full border border-gray-200 px-4 py-2
                           text-[0.8125rem] font-semibold text-gray-400 whitespace-nowrap">
            {cfg.cta}
          </span>
        ) : (
          <Link
            href={cfg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full px-4 py-2 text-[0.8125rem] font-semibold
                       no-underline transition-opacity hover:opacity-80 whitespace-nowrap"
            style={{
              background:   `${cfg.accent}15`,
              color:         cfg.accent,
              border:       `1px solid ${cfg.accent}30`,
            }}
          >
            {cfg.cta}
          </Link>
        )}
      </div>
    </div>
  )
}
