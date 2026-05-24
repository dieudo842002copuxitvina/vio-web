import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession }   from '@/shared/utils/supabase/middleware'

// ── Protected path prefixes ────────────────────────────────────────────────
// Routes that require an authenticated session.
// These correspond to all pages rendered by app/(dashboard)/layout.tsx.
const PROTECTED: string[] = [
  '/dashboard',
  '/quan-ly-leads',
  '/quan-ly',
  '/dang-tin',
]

function isProtected(pathname: string): boolean {
  return PROTECTED.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))
}

// ── Middleware ─────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  // 1. Refresh the Supabase session token and get the current user.
  //    The returned `supabaseResponse` carries the updated Set-Cookie headers;
  //    it MUST be returned (or merged) — never replaced with a new NextResponse.
  const { supabaseResponse, user } = await updateSession(request)

  // 2. Guard protected routes.
  if (isProtected(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the attempted path so the login page can redirect back.
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Redirect authenticated users away from auth pages.
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/dang-nhap')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

// ── Matcher ────────────────────────────────────────────────────────────────
// Runs on all routes EXCEPT:
//   - Next.js internals (_next/static, _next/image)
//   - Static assets (favicon, images, fonts, etc.)
//   - API routes are intentionally included so their session cookies refresh

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
