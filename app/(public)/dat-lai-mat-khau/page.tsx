'use client'

import { useState }       from 'react'
import { useRouter }      from 'next/navigation'
import Link               from 'next/link'
import { createClient }   from '@/lib/supabase/client'

export default function DatLaiMatKhauPage() {
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)
  const router = useRouter()

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
    const { error: authError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (success) {
    return (
      <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-2 text-xl font-bold text-neutral-900">Mật khẩu đã được cập nhật!</h1>
          <p className="text-sm text-neutral-500">Đang chuyển hướng về dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Đặt lại mật khẩu</h1>
          <p className="mt-1.5 text-sm text-neutral-500">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6">
          {error && (
            <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700">
              Mật khẩu mới
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              required
              autoComplete="new-password"
              className="h-11 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-vio-forest focus:ring-1 focus:ring-vio-forest"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-neutral-700">
              Xác nhận mật khẩu
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
              autoComplete="new-password"
              className="h-11 rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-vio-forest focus:ring-1 focus:ring-vio-forest"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="h-11 w-full rounded-xl bg-vio-forest text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500">
          <Link href="/login" className="font-semibold text-vio-forest no-underline hover:underline">
            ← Về trang đăng nhập
          </Link>
        </p>
      </div>
    </main>
  )
}
