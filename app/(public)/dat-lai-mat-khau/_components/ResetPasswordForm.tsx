'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { useForm }                 from 'react-hook-form'
import { zodResolver }             from '@hookform/resolvers/zod'
import { z }                       from 'zod'
import Link                        from 'next/link'
import { Card, CardContent }       from '@/shared/ui/card'
import { Input }                   from '@/shared/ui/input'
import { Button }                  from '@/shared/ui/button'
import { updatePasswordAction }    from '@/app/actions/auth'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    confirm:  z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine(d => d.password === d.confirm, {
    message: 'Mật khẩu xác nhận không khớp.',
    path:    ['confirm'],
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
            d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0
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
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────────

export default function ResetPasswordForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [alert, setAlert]   = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function onSubmit(data: FormData) {
    setAlert(null)
    startTransition(async () => {
      const result = await updatePasswordAction(data.password)
      if (!result.ok) {
        setAlert({ type: 'error', message: result.error })
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    })
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-10 text-center">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" stroke="#34C759"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <h1 className="m-0 text-xl font-bold text-gray-900">Mật khẩu đã được cập nhật!</h1>
            <p className="m-0 mt-3 text-sm text-gray-500">
              Đang chuyển hướng về trang đăng nhập…
            </p>

            <div className="mx-auto mt-5 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-vio-primary"
                style={{ animation: 'progress-fill 2s linear forwards' }}
              />
            </div>

            <style>{`
              @keyframes progress-fill {
                from { width: 0% }
                to   { width: 100% }
              }
            `}</style>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── Reset form ──────────────────────────────────────────────────────────────

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block mb-5 text-xl font-bold tracking-tight text-gray-900 no-underline"
          >
            VIO AGRI
          </Link>
          <h1 className="m-0 text-[1.5rem] font-bold tracking-tight text-gray-900">
            Đặt lại mật khẩu
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-gray-500">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        <Card>
          <CardContent className="py-7">

            {alert && (
              <div className="mb-5">
                <AlertBanner
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert(null)}
                />
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

              <Input
                id="password"
                type="password"
                label="Mật khẩu mới"
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                id="confirm"
                type="password"
                label="Xác nhận mật khẩu mới"
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                error={errors.confirm?.message}
                {...register('confirm')}
              />

              <div className="mt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isPending}
                  className="w-full"
                >
                  Cập nhật mật khẩu
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm text-gray-500">
          <Link href="/login" className="font-semibold text-vio-forest no-underline hover:underline">
            ← Về trang đăng nhập
          </Link>
        </p>

      </div>
    </main>
  )
}
