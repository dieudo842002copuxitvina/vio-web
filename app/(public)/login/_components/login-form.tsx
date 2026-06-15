'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter }                           from 'next/navigation'
import { useForm }                             from 'react-hook-form'
import { zodResolver }                         from '@hookform/resolvers/zod'
import { z }                                   from 'zod'
import Link                                    from 'next/link'
import { Card, CardContent }                   from '@/shared/ui/card'
import { Input }                               from '@/shared/ui/input'
import { Button }                              from '@/shared/ui/button'
import { loginAction }                         from '@/app/actions/auth'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  email:    z.string().min(1, 'Email là bắt buộc').email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
})
type FormData = z.infer<typeof schema>

// ── Alert banner ──────────────────────────────────────────────────────────────

function AlertBanner({
  type, message, onClose,
}: {
  type:    'error' | 'success'
  message: string
  onClose: () => void
}) {
  const isError = type === 'error'
  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
        isError
          ? 'border-red-200   bg-red-50   text-red-700'
          : 'border-green-200 bg-green-50 text-green-800',
      ].join(' ')}
    >
      {isError ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
             className="mt-0.5 shrink-0" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0
               1-1.5 0v-3A.75.75 0 0 1 8 4.5Zm0 7a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
             className="mt-0.5 shrink-0" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm3.28 4.97a.75.75 0 0 1 0 1.06l-4 4a.75.75
               0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06L6.75 9.44l3.47-3.47a.75.75 0 0 1 1.06 0Z"/>
        </svg>
      )}
      <span className="flex-1 leading-relaxed">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 opacity-50 transition-opacity hover:opacity-100"
        aria-label="Đóng thông báo"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

// ── LoginForm ─────────────────────────────────────────────────────────────────

interface LoginFormProps {
  next?:      string
  authError?: string
}

export function LoginForm({ next, authError }: LoginFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(
    authError ? { type: 'error', message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' } : null,
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Auto-dismiss success alerts
  useEffect(() => {
    if (!alert || alert.type !== 'success') return
    const t = setTimeout(() => setAlert(null), 4000)
    return () => clearTimeout(t)
  }, [alert])

  function onSubmit(data: FormData) {
    setAlert(null)
    startTransition(async () => {
      const result = await loginAction(data.email, data.password, next)
      if (!result.ok) {
        setAlert({ type: 'error', message: result.error })
        return
      }
      router.push(result.redirectTo ?? '/dashboard')
    })
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardContent className="pt-8 pb-8">

        {/* Brand + heading */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block mb-5 text-xl font-bold tracking-tight text-gray-900 no-underline"
          >
            VIO AGRI
          </Link>
          <h1 className="m-0 text-[1.5rem] font-bold tracking-tight text-gray-900">
            Đăng nhập
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-gray-500">
            Quản lý tin đăng đất nông nghiệp của bạn
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <div className="mb-5">
            <AlertBanner
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {next && <input type="hidden" name="next" value={next} />}

          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="ban@email.com"
            autoComplete="email"
            inputMode="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            id="password"
            type="password"
            label="Mật khẩu"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="mt-2 flex flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isPending}
              className="w-full"
            >
              Đăng nhập
            </Button>

            <p className="text-center text-[0.875rem]">
              <Link
                href="/quen-mat-khau"
                className="text-vio-forest no-underline hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </p>
          </div>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-[0.875rem] text-gray-500">
          Chưa có tài khoản?{' '}
          <Link
            href="/dang-ky"
            prefetch={false}
            className="font-semibold text-vio-forest no-underline hover:underline"
          >
            Đăng ký miễn phí
          </Link>
        </p>

      </CardContent>
    </Card>
  )
}
