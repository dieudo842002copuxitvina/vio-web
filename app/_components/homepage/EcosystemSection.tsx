import Link from 'next/link'

// ── Node data ──────────────────────────────────────────────────────────────────

const NODES = [
  {
    id:    'agri',
    brand: 'VIO AGRI',
    title: 'Mua bán đất\nnông nghiệp',
    body:  'Nền tảng giao dịch đất nông nghiệp minh bạch — tìm, kiểm tra pháp lý và kết nối người mua, người bán trên toàn quốc.',
    href:  '/',
    cta:   'Tìm đất ngay',
    accent: '#34C759',
  },
  {
    id:    'local',
    brand: 'VIO LOCAL',
    title: 'Sản xuất &\nkinh doanh địa phương',
    body:  'Kết nối nông sản Việt với doanh nghiệp, nhà máy, nhà bán lẻ trong nước — chuỗi giá trị nông nghiệp hoàn chỉnh.',
    href:  'https://violocal.vn',
    cta:   'Khám phá',
    accent: '#32ADE6',
  },
  {
    id:    'export',
    brand: 'VIO EXPORT',
    title: 'Xuất khẩu\nnông sản Việt',
    body:  'Đưa nông sản chất lượng Việt Nam ra thị trường quốc tế — từ chứng nhận, logistics đến đối tác nhập khẩu toàn cầu.',
    href:  '#',
    cta:   'Sắp ra mắt',
    accent: '#FF9500',
  },
]

// ── Arrow connector ────────────────────────────────────────────────────────────

function Arrow() {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      {/* Horizontal on desktop */}
      <svg
        className="hidden w-10 lg:block"
        height="24" viewBox="0 0 40 24" fill="none"
      >
        <path d="M0 12h34" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
        <path d="M30 7l6 5-6 5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {/* Vertical on mobile / tablet */}
      <svg
        className="block lg:hidden"
        width="24" height="40" viewBox="0 0 24 40" fill="none"
      >
        <path d="M12 0v34" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
        <path d="M7 30l5 6 5-6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

// ── EcosystemNode ──────────────────────────────────────────────────────────────

function EcosystemNode({
  brand, title, body, href, cta, accent,
}: Omit<typeof NODES[number], 'id'>) {
  const isExternal = href.startsWith('http')
  const isDisabled = href === '#'

  return (
    <div className="flex flex-1 flex-col gap-4 rounded-[20px] bg-white/[0.07] p-6 backdrop-blur-sm border border-white/[0.1] sm:p-7">
      {/* Brand chip */}
      <div
        className="inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ background: `${accent}22`, color: accent }}
      >
        {brand}
      </div>

      {/* Title */}
      <h3
        className="text-[22px] font-bold leading-snug tracking-[-0.02em] text-white sm:text-[24px]"
        style={{ whiteSpace: 'pre-line' }}
      >
        {title}
      </h3>

      {/* Body */}
      <p className="flex-1 text-[14px] leading-relaxed text-white/60">
        {body}
      </p>

      {/* CTA */}
      {isDisabled ? (
        <span
          className="inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white/40 border border-white/20 cursor-default"
        >
          {cta}
        </span>
      ) : (
        <Link
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-150"
          style={{
            background: `${accent}20`,
            border: `1px solid ${accent}40`,
            color: accent,
          }}
        >
          {cta}
          {!isDisabled && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 9.5l7-7M4 2.5h5.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </Link>
      )}
    </div>
  )
}

// ── EcosystemSection ───────────────────────────────────────────────────────────

export function EcosystemSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0D2E1A 0%,#0A2010 50%,#071508 100%)' }}
      aria-labelledby="ecosystem-heading"
    >
      {/* Subtle texture dots */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1280px] px-4 py-16 sm:px-8 sm:py-24">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#34C759]/60">
            HỆ SINH THÁI
          </p>
          <h2
            id="ecosystem-heading"
            className="text-[28px] font-bold tracking-[-0.02em] text-white sm:text-[36px]"
          >
            Từ đất → Sản xuất → Xuất khẩu
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-relaxed text-white/50">
            VIO xây dựng hạ tầng số cho toàn bộ chuỗi giá trị nông nghiệp Việt Nam.
          </p>
        </div>

        {/* Nodes + arrows */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-0">
          {NODES.map((node, i) => (
            <div key={node.id} className="contents">
              <EcosystemNode {...node} />
              {i < NODES.length - 1 && <Arrow />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
