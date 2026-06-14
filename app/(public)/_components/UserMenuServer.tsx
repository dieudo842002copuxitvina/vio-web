import { createClient }          from '@/lib/supabase/server'
import { getActiveSubscription }  from '@/features/billing/api/subscription.server'
import { UserMenuClient }         from './UserMenuClient'

// ── UserMenuServer ────────────────────────────────────────────────────────────
// Async server component — reads session + subscription, renders client shell.
// Wrapped in <Suspense fallback={<UserMenuSkeleton />}> by the layout.

export async function UserMenuServer() {
  let userProp: { id: string; email: string; name: string } | null = null
  let isPro = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const sub = await getActiveSubscription(user.id)
      isPro = sub?.status === 'active'
      userProp = {
        id:    user.id,
        email: user.email ?? '',
        name:  (user.user_metadata?.full_name as string | undefined) ?? '',
      }
    }
  } catch {
    // Auth failure is non-fatal — show signed-out state
  }
  return <UserMenuClient user={userProp} isPro={isPro} />
}

// ── UserMenuSkeleton ──────────────────────────────────────────────────────────
// Shown by Suspense while UserMenuServer is fetching.

export function UserMenuSkeleton() {
  return (
    <div
      className="h-9 w-9 animate-pulse rounded-full bg-[var(--sand)]"
      aria-hidden="true"
    />
  )
}
