import { createServerClient } from '@supabase/ssr'
import { NextResponse }       from 'next/server'
import type { NextRequest }   from 'next/server'
import type { User }          from '@supabase/supabase-js'

// ── updateSession ──────────────────────────────────────────────────────────
// Must be called from middleware.ts on every request.
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
  // Start with a passthrough response; may be replaced inside setAll.
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
          // Write cookies to the request object first so the new client
          // instance sees them immediately within this middleware run.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // Rebuild the response so Set-Cookie headers are forwarded to
          // the browser. Every mutation here must go onto this object.
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Validate the session server-side. NEVER use getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
