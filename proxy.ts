import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// ── Protected route prefixes ──────────────────────────────────────────────────
const PROTECTED = [
  '/dashboard',
  '/quan-ly-leads',
  '/quan-ly',
  '/dang-tin',
  '/ho-so',
]

export async function proxy(request: NextRequest) {
  // updateSession() creates a Supabase SSR client, refreshes the auth token if
  // needed, and returns the response object that carries any new Set-Cookie
  // headers.  We MUST return (or copy from) that response — never construct a
  // plain NextResponse.next() after this call, or the refreshed token is lost.
  const { supabaseResponse, user } = await updateSession(request)

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED.some(
    p => pathname === p || pathname.startsWith(p + '/'),
  )

  // ── Redirect unauthenticated users away from protected routes ─────────────
  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dang-nhap'
    redirectUrl.searchParams.set('next', pathname)

    const redirectResponse = NextResponse.redirect(redirectUrl)

    // Copy refreshed session cookies so the token survives the redirect.
    // Without this, a token refreshed during getUser() is silently dropped.
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) =>
      redirectResponse.cookies.set(name, value, opts),
    )

    return redirectResponse
  }

  // ── Redirect authenticated users away from auth pages ────────────────────
  if (user && (pathname === '/dang-nhap' || pathname === '/login' || pathname === '/dang-ky')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    redirectUrl.searchParams.delete('next')

    const redirectResponse = NextResponse.redirect(redirectUrl)

    supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) =>
      redirectResponse.cookies.set(name, value, opts),
    )

    return redirectResponse
  }

  // For all non-redirect paths, return supabaseResponse as-is so Set-Cookie
  // headers from any token refresh are forwarded to the browser.
  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on every route except Next.js internals and static file extensions.
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
