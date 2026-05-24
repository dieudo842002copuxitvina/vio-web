import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Bắt buộc dùng getUser() — validate JWT phía server.
  // KHÔNG dùng getSession() ở proxy (không validate token).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Protected routes (dashboard + admin pages) ─────────────────────────
  // All paths served by app/(dashboard)/layout.tsx which has its own server-
  // side auth guard, but the proxy rejects unauthenticated requests earlier
  // so the layout never renders for guests.
  const PROTECTED = [
    '/dashboard',
    '/quan-ly-leads',
    '/quan-ly',
    '/dang-tin',
  ]

  const isProtected = PROTECTED.some(
    p => pathname === p || pathname.startsWith(p + '/'),
  )

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dang-nhap'
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── Redirect authenticated users away from auth pages ──────────────────
  if (user && (pathname === '/dang-nhap' || pathname === '/login' || pathname === '/dang-ky')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    redirectUrl.searchParams.delete('next')
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Chạy trên tất cả routes trừ static assets và Next.js internals
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
