'use client'

import { useState }  from 'react'
import Link          from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function QuenMatKhauPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase    = createClient()
    const redirectTo  = `${window.location.origin}/auth/callback?next=/dat-lai-mat-khau`

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-5xl">📬</div>
          <h1 className="mb-2 text-xl font-bold text-neutral-900">Kiểm tra hộp thư!</h1>
          <p className="mb-6 text-sm leading-relaxed text-neutral-500">
            Chúng tôi đã gửi link đặt lại mật khẩu đến{' '}
            <strong className="text-neutral-800">{email}</strong>.
            Link có hiệu lực trong 1 giờ.
          </p>
          <Link
            href="/login"
            className="block rounded-xl bg-vio-forest px-4 py-3 text-center text-sm font-semibold text-white no-underline hover:opacity-90"
          >
            Về trang đăng nhập
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Quên mật khẩu?</h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6">
          {error && (
            <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-neutral-700">
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
              className="h-11 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-vio-forest focus:ring-1 focus:ring-vio-forest"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="h-11 w-full rounded-xl bg-vio-forest text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500">
          Nhớ mật khẩu rồi?{' '}
          <Link href="/login" className="font-semibold text-vio-forest no-underline hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  )
}
