'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DangKyPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    setLoading(false)

    if (authError) {
      setError(
        authError.message === 'User already registered'
          ? 'Email này đã được đăng ký. Hãy đăng nhập.'
          : authError.message,
      )
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <main className="flex items-center justify-center py-16 px-4 min-h-[calc(100vh-8rem)]">
        <div className="w-full max-w-sm text-center">
          <span className="text-5xl block mb-4">📬</span>
          <h1 className="text-xl font-bold text-[var(--sea-ink)] mb-2">Kiểm tra hộp thư!</h1>
          <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
            Chúng tôi đã gửi email xác nhận đến <strong className="text-[var(--sea-ink)]">{email}</strong>.
            Nhấn vào link trong email để kích hoạt tài khoản.
          </p>
          <Link href="/dang-nhap" className="btn-primary w-full">
            Về trang đăng nhập
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex items-center justify-center py-16 px-4 min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block font-bold text-xl text-[var(--sea-ink)] no-underline mb-4"
            style={{ fontFamily: '"Fraunces", Georgia, serif' }}
          >
            VIO<span className="text-[var(--lagoon)]">.</span>LOCAL
          </Link>
          <h1 className="text-2xl font-bold text-[var(--sea-ink)] m-0 mb-1">Tạo tài khoản</h1>
          <p className="text-sm text-[var(--muted)] m-0">Miễn phí, không cần thẻ tín dụng</p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} noValidate className="island-shell rounded-2xl p-6 flex flex-col gap-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[#fff1f0] border border-[#ffc9c3] text-sm text-[#c0392b]">
              <svg className="shrink-0 mt-0.5" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="7.5" cy="7.5" r="6.5" /><path d="M7.5 4.5v3M7.5 10h.01" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[var(--sea-ink-soft)]">Email</label>
            <input
              id="email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ban@email.com" required autoComplete="email"
              className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[var(--sea-ink-soft)]">Mật khẩu</label>
            <input
              id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự" required autoComplete="new-password"
              className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-[var(--sea-ink-soft)]">Xác nhận mật khẩu</label>
            <input
              id="confirm" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu" required autoComplete="new-password"
              className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password || !confirm}
            className="btn-primary w-full mt-1"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
                  </svg>
                  Đang tạo tài khoản...
                </span>
              : 'Tạo tài khoản miễn phí'
            }
          </button>

          <p className="text-[0.6875rem] text-[var(--muted)] text-center leading-relaxed m-0">
            Bằng cách đăng ký, bạn đồng ý với{' '}
            <Link href="/dieu-khoan-su-dung" className="text-[var(--lagoon-deep)] no-underline hover:underline">Điều khoản sử dụng</Link>
            {' '}và{' '}
            <Link href="/chinh-sach-bao-mat" className="text-[var(--lagoon-deep)] no-underline hover:underline">Chính sách bảo mật</Link>.
          </p>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          Đã có tài khoản?{' '}
          <Link href="/dang-nhap" className="text-[var(--lagoon-deep)] font-medium no-underline hover:underline">
            Đăng nhập
          </Link>
        </p>

      </div>
    </main>
  )
}
