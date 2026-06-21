'use client'

import { useState }          from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Input }             from '@/shared/ui/input'
import { Button }            from '@/shared/ui/button'
import { Textarea }          from '@/shared/ui/textarea'

// metadata phải export từ Server Component; trang này là client vì có form.
// Dùng dạng object const và re-export để Next.js có thể đọc.
// → Thực tế: đặt metadata trong layout hoặc tách thành page wrapper nếu cần SSR.

// ── Contact info ──────────────────────────────────────────────────────────────

const CONTACT_INFO = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    label:   'Email',
    value:   'hello@vioagri.vn',
    href:    'mailto:hello@vioagri.vn',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69
                 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 0h3a2 2 0 0 1 2 1.72
                 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91
                 a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45
                 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
    label:   'Hotline',
    value:   '1800 6868',
    href:    'tel:18006868',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    label:   'Văn phòng',
    value:   '123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh',
    href:    null,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    label:   'Giờ làm việc',
    value:   'Thứ Hai — Thứ Sáu: 8:00 — 18:00\nThứ Bảy: 8:00 — 12:00',
    href:    null,
  },
]

// ── Form component ────────────────────────────────────────────────────────────

type FormState = 'idle' | 'submitting' | 'success' | 'error'

function ContactForm() {
  const [state, setState] = useState<FormState>('idle')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')
    // TODO: wire to server action
    setTimeout(() => setState('success'), 1200)
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" stroke="#34C759"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="m-0 text-[1.0625rem] font-bold text-gray-900">
          Tin nhắn đã được gửi!
        </h3>
        <p className="m-0 max-w-[280px] text-[0.9375rem] text-gray-500">
          Chúng tôi sẽ phản hồi trong vòng 1 ngày làm việc. Cảm ơn bạn đã liên hệ.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="mt-2 text-sm font-semibold text-vio-forest hover:underline"
        >
          Gửi tin nhắn khác
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="name"
          name="name"
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          required
        />
        <Input
          id="phone"
          name="phone"
          type="tel"
          label="Số điện thoại"
          placeholder="0912 345 678"
          autoComplete="tel"
          inputMode="tel"
          required
        />
      </div>

      <Input
        id="email"
        name="email"
        type="email"
        label="Email (tuỳ chọn)"
        placeholder="ban@email.com"
        autoComplete="email"
        inputMode="email"
      />

      <Input
        id="subject"
        name="subject"
        label="Chủ đề"
        placeholder="VD: Hỏi về xác minh sổ đỏ"
        required
      />

      <Textarea
        id="message"
        name="message"
        label="Nội dung"
        placeholder="Mô tả chi tiết vấn đề hoặc câu hỏi của bạn…"
        rows={5}
        required
      />

      <div className="mt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={state === 'submitting'}
          className="w-full"
        >
          Gửi tin nhắn
        </Button>
      </div>

      <p className="text-center text-xs text-gray-400">
        Thông tin của bạn được bảo mật và không chia sẻ cho bên thứ ba.
      </p>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LienHePage() {
  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-vio-forest py-20 sm:py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 120%, #34C759 0%, transparent 100%)' }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-8">
          <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-vio-primary">
            Liên hệ
          </p>
          <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[2.75rem]">
            Chúng tôi lắng nghe bạn
          </h1>
          <p className="mx-auto mt-4 max-w-[480px] text-[1.0625rem] leading-relaxed text-white/65">
            Dù bạn cần hỗ trợ kỹ thuật, tư vấn pháp lý hay muốn hợp tác — đội ngũ VIO AGRI
            luôn sẵn sàng trong vòng 24 giờ.
          </p>
        </div>
      </div>

      {/* ── 2-column layout ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">

          {/* ── Cột trái: thông tin liên hệ ─────────────────────────────── */}
          <aside>
            <h2 className="mb-6 text-[1.25rem] font-bold tracking-tight text-gray-900">
              Thông tin liên hệ
            </h2>

            <ul className="m-0 space-y-6 p-0">
              {CONTACT_INFO.map(info => (
                <li key={info.label} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center
                                  rounded-xl bg-vio-forest/8 text-vio-forest">
                    {info.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-400">
                      {info.label}
                    </p>
                    {info.href ? (
                      <a
                        href={info.href}
                        className="mt-0.5 block text-[0.9375rem] font-semibold text-gray-900
                                   no-underline hover:text-vio-forest"
                      >
                        {info.value}
                      </a>
                    ) : (
                      <p className="m-0 mt-0.5 whitespace-pre-line text-[0.9375rem] text-gray-700">
                        {info.value}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Map placeholder */}
            <div className="mt-8 overflow-hidden rounded-2xl bg-gray-100"
                 style={{ height: '200px' }}>
              <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="text-sm">Bản đồ Google Maps</span>
              </div>
            </div>

            {/* Social links */}
            <div className="mt-8">
              <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-400">
                Mạng xã hội
              </p>
              <div className="flex gap-3">
                {[
                  { label: 'Facebook', href: 'https://facebook.com/vioagri' },
                  { label: 'YouTube',  href: 'https://youtube.com/@vioagri'  },
                ].map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2
                               text-[0.8125rem] font-semibold text-gray-600
                               no-underline hover:border-gray-300 hover:bg-gray-50"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Cột phải: form liên hệ ───────────────────────────────────── */}
          <div>
            <Card>
              <CardContent className="py-8 sm:py-10">
                <h2 className="m-0 mb-6 text-[1.25rem] font-bold tracking-tight text-gray-900">
                  Gửi tin nhắn cho chúng tôi
                </h2>
                <ContactForm />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </>
  )
}
