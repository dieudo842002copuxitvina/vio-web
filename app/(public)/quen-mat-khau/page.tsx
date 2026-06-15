'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm }                             from 'react-hook-form'
import { zodResolver }                         from '@hookform/resolvers/zod'
import { z }                                   from 'zod'
import Link                                    from 'next/link'
import { Card, CardContent }                   from '@/shared/ui/card'
import { Input }                               from '@/shared/ui/input'
import { Button }                              from '@/shared/ui/button'
import { resetPasswordAction }                 from '@/app/actions/auth'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().min(1, 'Email là bắt buộc').email('Email không hợp lệ'),
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
        /* Envelope icon for "check your email" */
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
             className="mt-0.5 shrink-0" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9A1.5 1.5 0 0 1 12.5 14h-9A1.5
               1.5 0 0 1 2 12.5v-9ZM3.5 3a.5.5 0 0 0-.5.5v.382l4.553 3.033a.75.75 0 0 0 .894
               0L13 3.882V3.5a.5.5 0 0 0-.5-.5h-9ZM13 5.088l-3.842 2.56a2.25 2.25 0 0 1-2.316
               0L3 5.088V12.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V5.088Z"/>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuenMatKhauPage() {
  const [isPending, startTransition] = useTransition()
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Success alerts stay until dismissed (user needs to read the instructions)
  // Error alerts auto-dismiss after 6 s
  useEffect(() => {
    if (!alert || alert.type !== 'error') return
    const t = setTimeout(() => setAlert(null), 6000)
    return () => clearTimeout(t)
  }, [alert])

  function onSubmit(data: FormData) {
    setAlert(null)
    startTransition(async () => {
      const result = await resetPasswordAction(data.email)
      if (!result.ok) {
        setAlert({ type: 'error', message: result.error })
        return
      }
      setAlert({
        type:    'success',
        message: result.message ??
          'Vui lòng kiểm tra hộp thư email của bạn để đặt lại mật khẩu.',
      })
    })
  }

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block mb-5 text-xl font-bold tracking-tight text-gray-900 no-underline"
          >
            VIO AGRI
          </Link>
          <h1 className="m-0 text-[1.5rem] font-bold tracking-tight text-gray-900">
            Quên mật khẩu?
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-gray-500">
            Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu.
          </p>
        </div>

        <Card>
          <CardContent className="py-7">

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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

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

              <div className="mt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isPending}
                  className="w-full"
                >
                  Gửi link đặt lại mật khẩu
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm text-gray-500">
          Nhớ mật khẩu rồi?{' '}
          <Link href="/login" className="font-semibold text-vio-forest no-underline hover:underline">
            Đăng nhập
          </Link>
        </p>

      </div>
    </main>
  )
}
