// ── Reusable Supabase query filters ───────────────────────────────────────────
// Centralise repeated moderation / visibility conditions so a policy change
// only needs to happen in one place.

// Duck-typed interface matching the subset of Supabase's query builder that
// these helpers use. Avoids importing internal Supabase generics.
interface FilterChain {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eq(column: string, value: unknown): any
}

// Both public AND moderation-approved — use for all consumer-facing listing queries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function publicApproved(query: FilterChain): any {
  return query
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
}

// Public only — for tables that don't have moderation_status (e.g. storefronts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function publicOnly(query: FilterChain): any {
  return query.eq('is_public', true)
}

// Active only — for tables using an is_active boolean (e.g. categories).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function activeOnly(query: FilterChain): any {
  return query.eq('is_active', true)
}
