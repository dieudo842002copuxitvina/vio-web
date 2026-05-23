'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/client'

// Note: metadata exports are not used in 'use client' pages — move to a
// parent layout or use generateMetadata from a Server Component wrapper if SEO
// matters for this route.

export default function DangNhapPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email hoặc mật khẩu không đúng.'
          : authError.message,
      )
      return
    }

    router.push('/dashboard')
    router.refresh() // sync server-side session
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
          <h1 className="text-2xl font-bold text-[var(--sea-ink)] m-0 mb-1">Đăng nhập</h1>
          <p className="text-sm text-[var(--muted)] m-0">Quản lý cửa hàng và tin đăng của bạn</p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="island-shell rounded-2xl p-6 flex flex-col gap-4"
        >
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[#fff1f0] border border-[#ffc9c3] text-sm text-[#c0392b]"
            >
              <svg className="shrink-0 mt-0.5" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="7.5" cy="7.5" r="6.5" />
                <path d="M7.5 4.5v3M7.5 10h.01" />
              </svg>
              {error}
            </div>
          )}

          <fieldset className="flex flex-col gap-1.5 border-0 m-0 p-0">
            <label htmlFor="email" className="text-sm font-medium text-[var(--sea-ink-soft)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ban@email.com"
              required
              autoComplete="email"
              className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 border-0 m-0 p-0">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-[var(--sea-ink-soft)]">
                Mật khẩu
              </label>
              <Link href="/quen-mat-khau" className="text-xs text-[var(--lagoon-deep)] no-underline hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--sea-ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lagoon)] transition-colors"
            />
          </fieldset>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn-primary w-full mt-1"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
                  </svg>
                  Đang đăng nhập...
                </span>
              : 'Đăng nhập'
            }
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          Chưa có tài khoản?{' '}
          <Link href="/dang-ky" className="text-[var(--lagoon-deep)] font-medium no-underline hover:underline">
            Đăng ký miễn phí
          </Link>
        </p>

      </div>
    </main>
  )
}
