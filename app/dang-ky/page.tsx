'use client'

import { useState }      from 'react'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/client'

export default function DangKyPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [fullName, setFullName] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const [loading,  setLoading]  = useState(false)

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
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data:        { full_name: fullName || undefined },
        // Must point to /auth/callback so Supabase PKCE code exchange happens
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
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
      <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-5xl">📬</div>
          <h1 className="mb-2 text-xl font-bold text-neutral-900">Kiểm tra hộp thư!</h1>
          <p className="mb-6 text-sm leading-relaxed text-neutral-500">
            Chúng tôi đã gửi email xác nhận đến{' '}
            <strong className="text-neutral-800">{email}</strong>.
            Nhấn vào link trong email để kích hoạt tài khoản.
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
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-4 text-xl font-bold tracking-tight text-neutral-900 no-underline">
            VIO AGRI
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-neutral-500">Miễn phí, không cần thẻ tín dụng</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6">
          {error && (
            <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-neutral-700">Họ tên</label>
            <input
              id="fullName" type="text" value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A" autoComplete="name"
              className="h-11 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-vio-forest focus:ring-1 focus:ring-vio-forest"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-neutral-700">Email</label>
            <input
              id="email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ban@email.com" required autoComplete="email"
              className="h-11 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-vio-forest focus:ring-1 focus:ring-vio-forest"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700">Mật khẩu</label>
            <input
              id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự" required autoComplete="new-password"
              className="h-11 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-vio-forest focus:ring-1 focus:ring-vio-forest"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-neutral-700">Xác nhận mật khẩu</label>
            <input
              id="confirm" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu" required autoComplete="new-password"
              className="h-11 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-vio-forest focus:ring-1 focus:ring-vio-forest"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password || !confirm}
            className="h-11 w-full rounded-xl bg-vio-forest text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản miễn phí'}
          </button>

          <p className="text-center text-xs leading-relaxed text-neutral-400">
            Bằng cách đăng ký, bạn đồng ý với{' '}
            <Link href="/dieu-khoan-su-dung" className="text-vio-forest no-underline hover:underline">
              Điều khoản sử dụng
            </Link>
          </p>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold text-vio-forest no-underline hover:underline">
            Đăng nhập
          </Link>
        </p>

      </div>
    </main>
  )
}
