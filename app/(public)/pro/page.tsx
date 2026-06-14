import type { Metadata }        from 'next'
import Link                      from 'next/link'
import { createClient }          from '@/lib/supabase/server'
import { getActiveSubscription } from '@/features/billing/api/subscription.server'
import { PricingFaq }            from './_components/PricingFaq'

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       'Pro — VIO AGRI',
  description: 'Mở khóa số liên hệ, theo dõi giá và dữ liệu thị trường đất nông nghiệp.',
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  { label: 'Xem tin đăng',     ok: true  },
  { label: 'Tìm kiếm cơ bản',  ok: true  },
  { label: 'Xem bản đồ',       ok: true  },
  { label: 'Xem liên hệ',      ok: false },
  { label: 'Lưu tìm kiếm',     ok: false },
  { label: 'Theo dõi giá',      ok: false },
  { label: 'Dữ liệu thị trường',ok: false },
]

const PRO_FEATURES = [
  { label: 'Xem số điện thoại'      },
  { label: 'Xem Zalo'               },
  { label: 'Lưu tin'                },
  { label: 'Lưu tìm kiếm'          },
  { label: 'Cảnh báo bất động sản mới' },
  { label: 'Theo dõi giá'           },
  { label: 'Dữ liệu thị trường'     },
  { label: 'Ưu tiên hỗ trợ'         },
]

const WHY_ITEMS = [
  {
    title: 'Tiết kiệm thời gian',
    body:  'Xem ngay số điện thoại và Zalo của chủ đất — không cần đợi, không cần gửi yêu cầu.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 3"/>
      </svg>
    ),
  },
  {
    title: 'Liên hệ trực tiếp',
    body:  'Gọi điện hoặc nhắn Zalo ngay lập tức. Tiếp cận chủ đất trước người khác.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C7.61 21 3 16.39 3 11a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.26.2 2.47.57 3.58a1 1 0 0 1-.24 1.01l-2.21 2.2z"/>
      </svg>
    ),
  },
  {
    title: 'Theo dõi thị trường',
    body:  'Dữ liệu biến động giá theo tỉnh, loại đất, theo tháng — phân tích trước khi quyết định.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M7 14l4-4 4 4 4-4"/>
      </svg>
    ),
  },
  {
    title: 'Nhận thông báo sớm',
    body:  'Cảnh báo tức thì khi có tin mới đúng tiêu chí của bạn — không bỏ lỡ cơ hội đầu tư.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-vio-forest" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-neutral-300" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPro = false
  if (user) {
    const sub = await getActiveSubscription(user.id)
    isPro = sub?.plan_id === 'pro'
  }

  return (
    <div className="bg-[#FBFBFD]">

      {/* ── S1: Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0D1A12] px-4 py-24 text-center sm:py-32">
        {/* Subtle radial wash — not a gradient, just depth */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(26,77,46,0.55),transparent)]"/>

        <div className="relative mx-auto max-w-[720px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10
                          bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase
                          tracking-[0.12em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-vio-primary"/>
            VIO Pro
          </div>

          <h1 className="mx-auto mt-0 max-w-[600px] text-[36px] font-black
                         leading-[1.1] tracking-tight text-white
                         sm:text-[48px] md:text-[56px]">
            Mở khóa toàn bộ tiềm năng đầu tư đất nông nghiệp
          </h1>

          <p className="mx-auto mt-5 max-w-[480px] text-[16px] leading-relaxed text-white/55
                        sm:text-[18px]">
            Tiếp cận dữ liệu và thông tin liên hệ dành cho nhà đầu tư nghiêm túc.
          </p>

          <div className="mt-9">
            {isPro ? (
              <div className="inline-flex flex-col items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-vio-primary/30
                                bg-vio-primary/10 px-5 py-3 text-[14px] font-bold text-vio-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Bạn đang dùng Pro
                </div>
                <Link href="/tim-kiem"
                  className="text-[13px] font-semibold text-white/50 no-underline
                             transition-colors hover:text-white/80">
                  Tìm đất ngay →
                </Link>
              </div>
            ) : (
              <Link
                href="#pricing"
                className="inline-flex h-13 items-center gap-2 rounded-[14px]
                           bg-vio-primary px-8 text-[15px] font-bold text-white
                           no-underline shadow-[0_4px_24px_rgba(52,199,89,0.35)]
                           transition-all duration-200
                           hover:bg-vio-primary-dark hover:shadow-[0_8px_32px_rgba(52,199,89,0.45)]"
              >
                Nâng cấp Pro
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── S2: Plan comparison ──────────────────────────────────────── */}
      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-[900px]">

          <h2 className="mb-12 text-center text-[13px] font-bold uppercase
                         tracking-[0.12em] text-neutral-400">
            So sánh gói
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">

            {/* FREE card */}
            <div className="rounded-[24px] border border-neutral-150 bg-white p-7
                            shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="mb-6">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                  Free
                </span>
                <p className="m-0 mt-2 text-[28px] font-black text-[#1d1d1f]">0 đ</p>
                <p className="m-0 text-[13px] text-neutral-400">Miễn phí mãi mãi</p>
              </div>

              <div className="space-y-3">
                {FREE_FEATURES.map(f => (
                  <div key={f.label} className="flex items-center gap-3">
                    <CheckIcon ok={f.ok}/>
                    <span className={[
                      'text-[14px]',
                      f.ok ? 'text-[#1d1d1f]' : 'text-neutral-300',
                    ].join(' ')}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {!user && (
                <Link
                  href="/dang-ky"
                  className="mt-7 flex h-11 w-full items-center justify-center rounded-xl
                             border border-neutral-200 text-[14px] font-semibold
                             text-neutral-500 no-underline transition-colors hover:bg-neutral-50"
                >
                  Tạo tài khoản
                </Link>
              )}
            </div>

            {/* PRO card */}
            <div className="relative rounded-[24px] border-2 border-vio-forest bg-white p-7
                            shadow-[0_8px_40px_rgba(26,77,46,0.12)]">
              {/* Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-vio-forest
                                 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                  </svg>
                  Phổ biến nhất
                </span>
              </div>

              <div className="mb-6">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-vio-forest">
                  Pro
                </span>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <p className="m-0 text-[28px] font-black text-[#1d1d1f]">990.000 đ</p>
                  <span className="text-[13px] text-neutral-400">/ tháng</span>
                </div>
                <p className="m-0 text-[13px] text-neutral-400">Hủy bất kỳ lúc nào</p>
              </div>

              <div className="space-y-3">
                {PRO_FEATURES.map(f => (
                  <div key={f.label} className="flex items-center gap-3">
                    <CheckIcon ok={true}/>
                    <span className="text-[14px] text-[#1d1d1f]">{f.label}</span>
                  </div>
                ))}
              </div>

              {!isPro && (
                <Link
                  href="#pricing"
                  id="pricing"
                  className="mt-7 flex h-12 w-full items-center justify-center rounded-xl
                             bg-vio-forest text-[14px] font-bold text-white no-underline
                             transition-opacity hover:opacity-90"
                >
                  Bắt đầu ngay
                </Link>
              )}
              {isPro && (
                <div className="mt-7 flex h-12 w-full items-center justify-center rounded-xl
                                bg-vio-forest/10 text-[14px] font-semibold text-vio-forest">
                  Đang hoạt động
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── S3: Pricing ──────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="border-y border-neutral-100 bg-white px-4 py-20 text-center sm:py-24"
      >
        <div className="mx-auto max-w-[480px]">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-neutral-400">
            Định giá
          </p>

          <div className="mt-6 flex items-end justify-center gap-2">
            <span className="text-[56px] font-black leading-none tracking-tight text-[#1d1d1f]
                             sm:text-[72px]">
              990.000
            </span>
            <span className="mb-2 text-[18px] font-semibold text-neutral-400">đ</span>
          </div>
          <p className="mt-1 text-[15px] text-neutral-400">mỗi tháng · hủy bất kỳ lúc nào</p>

          <div className="mt-2 text-[13px] text-neutral-300">
            ~33.000 đ / ngày
          </div>

          {isPro ? (
            <div className="mt-9 inline-flex items-center gap-2 rounded-full
                            bg-vio-forest/8 px-5 py-3 text-[14px] font-semibold text-vio-forest">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Bạn đang dùng Pro
            </div>
          ) : (
            <>
              <Link
                href={user ? '/thanh-toan/pro' : '/dang-nhap?next=/pro'}
                className="mt-9 inline-flex h-13 min-w-[200px] items-center justify-center
                           rounded-[14px] bg-vio-forest px-8 text-[15px] font-bold text-white
                           no-underline shadow-[0_4px_24px_rgba(26,77,46,0.25)]
                           transition-all hover:shadow-[0_8px_32px_rgba(26,77,46,0.35)]
                           hover:opacity-95"
              >
                Bắt đầu ngay
              </Link>
              {!user && (
                <p className="mt-3 text-[12px] text-neutral-400">
                  Cần tài khoản.{' '}
                  <Link href="/dang-ky" className="font-semibold text-vio-forest no-underline">
                    Đăng ký miễn phí
                  </Link>
                </p>
              )}
            </>
          )}

          {/* Trust signals */}
          <div className="mt-10 flex items-center justify-center gap-6 text-[12px] text-neutral-400">
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Thanh toán bảo mật
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <path d="M9 22V12h6v10"/>
              </svg>
              Hủy bất cứ lúc nào
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              Hoàn tiền 7 ngày
            </div>
          </div>
        </div>
      </section>

      {/* ── S4: Why Pro ──────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-[900px]">

          <h2 className="mb-12 text-center text-[13px] font-bold uppercase
                         tracking-[0.12em] text-neutral-400">
            Tại sao chọn Pro
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_ITEMS.map(item => (
              <div
                key={item.title}
                className="rounded-[20px] border border-neutral-100 bg-white p-6
                           shadow-[0_1px_4px_rgba(0,0,0,0.04)]
                           transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center
                                rounded-2xl bg-vio-forest/8 text-vio-forest">
                  {item.icon}
                </div>
                <h3 className="m-0 text-[14px] font-bold text-[#1d1d1f]">{item.title}</h3>
                <p className="m-0 mt-2 text-[13px] leading-relaxed text-neutral-500">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S5: FAQ ──────────────────────────────────────────────────── */}
      <section className="border-t border-neutral-100 bg-white px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-[640px]">
          <h2 className="mb-10 text-center text-[13px] font-bold uppercase
                         tracking-[0.12em] text-neutral-400">
            Câu hỏi thường gặp
          </h2>
          <PricingFaq/>
        </div>
      </section>

      {/* ── S6: Final CTA ─────────────────────────────────────────────── */}
      {!isPro && (
        <section className="bg-[#0D1A12] px-4 py-20 text-center sm:py-28">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(26,77,46,0.45),transparent)]"/>
          <div className="relative mx-auto max-w-[560px]">
            <p className="mb-3 text-[13px] font-semibold text-white/40">Sẵn sàng bắt đầu?</p>

            <h2 className="m-0 text-[32px] font-black leading-tight tracking-tight text-white
                           sm:text-[40px]">
              Đầu tư thông minh hơn với Pro
            </h2>

            <p className="mx-auto mt-4 max-w-[380px] text-[15px] leading-relaxed text-white/50">
              Tiếp cận thông tin liên hệ, dữ liệu giá và cảnh báo thị trường dành cho nhà đầu tư nghiêm túc.
            </p>

            <Link
              href={user ? '/thanh-toan/pro' : '/dang-nhap?next=/pro'}
              className="mt-9 inline-flex h-13 min-w-[200px] items-center justify-center
                         rounded-[14px] bg-vio-primary px-8 text-[15px] font-bold text-white
                         no-underline shadow-[0_4px_24px_rgba(52,199,89,0.3)]
                         transition-all hover:bg-vio-primary-dark
                         hover:shadow-[0_8px_32px_rgba(52,199,89,0.4)]"
            >
              Nâng cấp Pro
            </Link>

            <p className="mt-4 text-[12px] text-white/30">
              990.000 đ / tháng · Hủy bất cứ lúc nào
            </p>
          </div>
        </section>
      )}

    </div>
  )
}
