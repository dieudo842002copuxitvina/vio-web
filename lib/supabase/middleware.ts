import { createServerClient } from '@supabase/ssr'
import { NextResponse }       from 'next/server'
import type { NextRequest }   from 'next/server'
import type { User }          from '@supabase/supabase-js'

// ── updateSession ──────────────────────────────────────────────────────────
// Must be called from proxy.ts on every request.
//
// Critical contract (from @supabase/ssr docs):
//   1. The Supabase client MUST be created inside this function so it can
//      read request cookies and write refreshed tokens back to the response.
//   2. The returned `supabaseResponse` MUST be forwarded to the caller.
//      Never construct a new NextResponse after calling this — doing so
//      drops the Set-Cookie headers that refresh the session token.
//   3. auth.getUser() is used (not getSession()) because getUser() validates
//      the token against the Supabase server; getSession() only reads the
//      local cookie and can return a stale or forged session.

export interface UpdateSessionResult {
  supabaseResponse: NextResponse
  user:             User | null
}

export async function updateSession(
  request: NextRequest,
): Promise<UpdateSessionResult> {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
