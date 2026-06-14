'use client'

import { useActionState } from 'react'
import { useFormStatus }  from 'react-dom'
import Link               from 'next/link'
import { Card, CardContent } from '@/shared/ui/card'
import { Input }             from '@/shared/ui/input'
import { Button }            from '@/shared/ui/button'
import { login }             from '@/features/auth/api/auth.server'
import type { AuthActionState } from '@/features/auth/api/auth.server'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      isLoading={pending}
      className="w-full"
    >
      Đăng nhập
    </Button>
  )
}

interface LoginFormProps {
  next?:      string
  authError?: string
}

export function LoginForm({ next, authError }: LoginFormProps) {
  const [state, action] = useActionState<AuthActionState, FormData>(login, null)

  const errorMessage = (state && 'error' in state ? state.error : null) ?? authError ?? null

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

        {/* Error banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-2xl bg-red-50 px-4 py-3 text-[0.875rem] text-red-600"
          >
            <svg
              width="16" height="16" viewBox="0 0 16 16"
              fill="currentColor" aria-hidden="true" className="mt-0.5 shrink-0"
            >
              <path
                fillRule="evenodd" clipRule="evenodd"
                d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5Zm0 7a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z"
              />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form action={action} noValidate className="flex flex-col gap-4">

          {/* Pass `next` so login() can redirect to the originally requested page */}
          {next && <input type="hidden" name="next" value={next} />}

          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="ban@email.com"
            autoComplete="email"
            inputMode="email"
            required
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="password"
                className="text-[0.8125rem] font-semibold text-gray-600"
              >
                Mật khẩu
              </label>
              <Link
                href="/quen-mat-khau"
                className="text-xs text-vio-primary no-underline hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="mt-2">
            <SubmitButton />
          </div>

        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-[0.875rem] text-gray-500">
          Chưa có tài khoản?{' '}
          <Link
            href="/dang-ky"
            className="font-semibold text-vio-primary no-underline hover:underline"
          >
            Đăng ký miễn phí
          </Link>
        </p>

      </CardContent>
    </Card>
  )
}
