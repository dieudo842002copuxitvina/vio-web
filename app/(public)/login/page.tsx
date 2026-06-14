import type { Metadata } from 'next'
import { LoginForm }    from './_components/login-form'

export const metadata: Metadata = {
  title:       'Đăng nhập — VIO AGRI',
  description: 'Đăng nhập để quản lý tin đăng đất nông nghiệp của bạn trên VIO AGRI.',
  robots:      { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <LoginForm next={next} authError={error} />
      </div>
    </main>
  )
}
