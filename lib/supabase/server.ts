import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Anon client — Server Components, Server Actions, Route Handlers.
 * Respects RLS policies. Sử dụng cho mọi data fetching công khai.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Component không thể set cookie — middleware lo việc refresh.
          }
        },
      },
    },
  )
}

/**
 * Stateless anon client — safe inside unstable_cache().
 *
 * createClient() reads cookies(), which is a dynamic data source that
 * Next.js forbids inside unstable_cache() boundaries.  Use this variant
 * for cached server functions that read fully-public data (no per-user
 * RLS filtering needed).  Cookies are never sent, so auth headers are
 * absent and Supabase applies only public RLS policies.
 */
export function createCachedClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
}

/**
 * Service-role client — bypass RLS.
 * CHỈ dùng trong Server Actions hoặc Route Handlers có xác thực admin.
 * KHÔNG bao giờ import vào Client Component.
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {}
        },
      },
    },
  )
}
