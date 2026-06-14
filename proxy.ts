import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// ── Public auth routes ────────────────────────────────────────────────────────
// These pages MUST be reachable without a session.
// The proxy short-circuits here: unauthenticated → pass through,
// authenticated → redirect to /dashboard (no point showing login/register).
const PUBLIC_AUTH_ROUTES = new Set([
  '/login',
  '/dang-ky',
  '/quen-mat-khau',
  '/dat-lai-mat-khau',
  '/auth/callback',   // Supabase PKCE code-exchange — must NEVER be intercepted
])

// ── Protected route prefixes ──────────────────────────────────────────────────
// Any pathname that equals one of these, or starts with one + '/', requires
// an authenticated session.  Everything else is public by default.
const PROTECTED = [
  '/dashboard',
  '/quan-ly-leads',
  '/quan-ly-lich-hen',
  '/quan-ly',
  '/tin-dang-cua-toi',
  '/tin-da-luu',
  '/tim-kiem-da-luu',
  '/phan-tich',
  '/xuc-tien-tin-dang',
  '/goi-thanh-vien',
  '/nang-cap',
  '/ho-so',
  '/ho-so-ca-nhan',
  '/dang-tin',
  '/admin',
  '/agency',
  '/marketplace',
  '/xac-thuc',
]

export async function proxy(request: NextRequest) {
  // updateSession() creates a Supabase SSR client, refreshes the auth token if
  // needed, and returns the response that carries any new Set-Cookie headers.
  // We MUST return (or copy from) that response — never construct a fresh
  // NextResponse.next() after this call, or the refreshed token is lost.
  const { supabaseResponse, user } = await updateSession(request)

  const { pathname } = request.nextUrl

  // ── 1. Public auth routes ──────────────────────────────────────────────────
  // /login, /dang-ky, /quen-mat-khau, etc.
  // Unauthenticated → always pass through.
  // Authenticated → no reason to show these pages, send to dashboard.
  if (PUBLIC_AUTH_ROUTES.has(pathname)) {
    if (user) {
      return buildRedirect(request, supabaseResponse, '/dashboard')
    }
    return supabaseResponse
  }

  // ── 2. Protected routes ────────────────────────────────────────────────────
  // Unauthenticated access → redirect to /login, preserve intended destination
  // in the `next` query param so the login form can redirect back afterwards.
  const isProtected = PROTECTED.some(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/'),
  )

  if (!user && isProtected) {
    return buildRedirect(request, supabaseResponse, '/login', { next: pathname })
  }

  // ── 3. Everything else is public ───────────────────────────────────────────
  return supabaseResponse
}

// ── buildRedirect ─────────────────────────────────────────────────────────────
// Constructs a redirect response while copying the refreshed session cookies
// from supabaseResponse so the auth token survives the redirect hop.
function buildRedirect(
  request:          NextRequest,
  supabaseResponse: NextResponse,
  pathname:         string,
  searchParams?:    Record<string, string>,
): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search   = ''

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value)
    }
  }

  const redirectResponse = NextResponse.redirect(url)

  supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) =>
    redirectResponse.cookies.set(name, value, opts),
  )

  return redirectResponse
}

export const config = {
  matcher: [
    // Run on every route except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
