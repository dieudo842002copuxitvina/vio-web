import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient }             from '@supabase/ssr'
import { cookies }                        from 'next/headers'

// ── /auth/callback ────────────────────────────────────────────────────────────
// Supabase sends PKCE-based email links (email confirmation, password reset)
// to this route. We exchange the one-time code for a session here, then
// redirect the user to wherever they were headed.
//
// URL shape from Supabase:
//   /auth/callback?code=<pkce_code>&next=<destination>
//   /auth/callback#access_token=...  (implicit flow — not used here)
//
// On success: user is authenticated, redirect to `next` (default /dashboard).
// On error:   redirect to /login with an error message.

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code     = searchParams.get('code')
  const next     = searchParams.get('next') ?? '/dashboard'
  const origin   = request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback]', error.message)
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', 'auth_error')
    return NextResponse.redirect(loginUrl)
  }

  // Validate `next` to prevent open redirect
  const safeNext = next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
