import { createClient }          from '@/lib/supabase/server'
import { getActiveSubscription }  from '@/features/billing/api/subscription.server'
import { UserMenuClient }         from './UserMenuClient'

// ── UserMenuServer ────────────────────────────────────────────────────────────
// Async server component — reads session + subscription, renders client shell.
// Wrapped in <Suspense fallback={<UserMenuSkeleton />}> by the layout.

export async function UserMenuServer() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <UserMenuClient user={null} isPro={false} />

    const sub   = await getActiveSubscription(user.id)
    const isPro = sub?.status === 'active'

    return (
      <UserMenuClient
        user={{
          id:    user.id,
          email: user.email ?? '',
          name:  (user.user_metadata?.full_name as string | undefined) ?? '',
        }}
        isPro={isPro}
      />
    )
  } catch {
    // Auth failure is non-fatal — show signed-out state
    return <UserMenuClient user={null} isPro={false} />
  }
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
