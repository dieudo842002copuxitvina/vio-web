import Link from 'next/link'

// ── Journey step data ─────────────────────────────────────────────────────────

const STEPS = [
  {
    phase:   '01',
    brand:   'VIO AGRI',
    accent:  '#34C759',
    title:   'Sở hữu đất',
    body:    'Tìm, xác minh pháp lý và mua đất nông nghiệp phù hợp trực tiếp với chủ đất — không qua môi giới.',
    bullets: ['Đất đã xác thực pháp lý', 'Giá thực thị trường', 'Kết nối trực tiếp chủ đất'],
    href:    '/dat-nong-nghiep',
    cta:     'Tìm đất',
    active:  true,
  },
  {
    phase:   '02',
    brand:   'VIO LOCAL',
    accent:  '#32ADE6',
    title:   'Sản xuất & Bán nội địa',
    body:    'Kết nối nông sản, thực phẩm địa phương với doanh nghiệp và người tiêu dùng trong nước.',
    bullets: ['Chợ B2B nông sản Việt', 'Kết nối nhà máy & siêu thị', 'Chuỗi lạnh & logistics'],
    href:    'https://violocal.vn',
    cta:     'Khám phá VIO LOCAL',
    active:  false,
  },
  {
    phase:   '03',
    brand:   'VIO EXPORT',
    accent:  '#FF9500',
    title:   'Xuất khẩu quốc tế',
    body:    'Đưa nông sản Việt ra thế giới — từ chứng nhận GlobalGAP đến logistics và đối tác nhập khẩu.',
    bullets: ['Chứng nhận xuất khẩu', 'Mạng lưới nhập khẩu toàn cầu', 'Logistics chuỗi lạnh'],
    href:    '#',
    cta:     'Sắp ra mắt',
    active:  false,
  },
]

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({ step, isLast }: { step: typeof STEPS[number]; isLast: boolean }) {
  const isDisabled = step.href === '#'

  return (
    <div className="relative flex flex-col">
      {/* Connector line */}
      {!isLast && (
        <div
          className="absolute left-[calc(50%+72px)] top-[28px] hidden h-px w-[calc(50%-72px+80px)] lg:block"
          style={{ background: `linear-gradient(90deg, ${step.accent}40, transparent)` }}
          aria-hidden="true"
        />
      )}

      <div className={[
        'flex flex-1 flex-col gap-4 rounded-3xl border p-6',
        step.active
          ? 'border-[#34C759]/20 bg-[#34C759]/5'
          : 'border-gray-200/60 bg-white',
      ].join(' ')}>

        {/* Phase + brand */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-black"
            style={{ background: `${step.accent}15`, color: step.accent }}
          >
            {step.phase}
          </div>
          <span
            className="text-[0.6875rem] font-black uppercase tracking-[0.12em]"
            style={{ color: step.accent }}
          >
            {step.brand}
          </span>
          {step.active && (
            <span className="ml-auto rounded-full bg-[#34C759]/10 px-2.5 py-1 text-[0.6rem]
                             font-bold uppercase tracking-[0.1em] text-[#34C759]">
              Bạn đang ở đây
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="m-0 text-[1.125rem] font-bold tracking-tight text-gray-900">
          {step.title}
        </h3>

        {/* Body */}
        <p className="m-0 flex-1 text-[0.875rem] leading-relaxed text-gray-500">{step.body}</p>

        {/* Bullets */}
        <ul className="m-0 list-none space-y-1.5 p-0">
          {step.bullets.map(b => (
            <li key={b} className="flex items-center gap-2 text-[0.8125rem] text-gray-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                   className="shrink-0" style={{ color: step.accent }} aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {b}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isDisabled ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200
                           px-4 py-2 text-[0.8125rem] font-semibold text-gray-400">
            {step.cta}
          </span>
        ) : (
          <Link
            href={step.href}
            target={step.href.startsWith('http') ? '_blank' : undefined}
            rel={step.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2
                       text-[0.8125rem] font-semibold no-underline transition-opacity hover:opacity-80"
            style={{ background: `${step.accent}15`, color: step.accent, border: `1px solid ${step.accent}30` }}
          >
            {step.cta}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 19L19 5M9 5h10v10" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        )}
      </div>
    </div>
  )
}

// ── EcosystemJourney ──────────────────────────────────────────────────────────

export function EcosystemJourney() {
  return (
    <section
      aria-labelledby="journey-heading"
      className="bg-[#FBFBFD] px-4 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-[1280px]">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gray-400">
            Hành trình nông nghiệp
          </p>
          <h2
            id="journey-heading"
            className="text-[1.75rem] font-bold tracking-tight text-gray-900 sm:text-[2.25rem]"
          >
            Từ đất đến bàn ăn thế giới
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[1rem] leading-relaxed text-gray-500">
            VIO xây dựng hạ tầng số cho toàn bộ chuỗi giá trị nông nghiệp — một hành trình liền mạch.
          </p>
        </div>

        {/* Journey steps */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <StepCard key={step.phase} step={step} isLast={i === STEPS.length - 1} />
          ))}
        </div>

        {/* Stat strip */}
        <div className="mt-10 grid grid-cols-1 divide-y divide-gray-100 overflow-hidden
                        rounded-2xl border border-gray-100 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { value: '63',      label: 'Tỉnh thành',      sub: 'Phủ sóng toàn quốc' },
            { value: '100%',    label: 'Kết nối trực tiếp', sub: 'Không qua môi giới' },
            { value: '3 bước',  label: 'Hành trình',       sub: 'AGRI → LOCAL → EXPORT' },
          ].map(s => (
            <div key={s.label} className="px-6 py-5 text-center">
              <p className="m-0 text-[1.75rem] font-black tracking-tight text-gray-900">{s.value}</p>
              <p className="m-0 mt-0.5 text-[0.875rem] font-semibold text-gray-700">{s.label}</p>
              <p className="m-0 text-[0.75rem] text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
