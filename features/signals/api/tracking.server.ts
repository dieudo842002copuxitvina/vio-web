'use server'

// ── Listing event tracking — fire-and-forget server helpers ───────────────────
//
// These functions insert rows into public.listing_events.  They are safe to
// call without awaiting: all DB and network errors are caught internally and
// logged, never re-thrown.  This guarantees tracking failures cannot crash or
// slow down SSR page rendering.
//
// Recommended call patterns:
//
//   // Non-blocking from a Server Component (runs in parallel with main fetch):
//   const [listing] = await Promise.allSettled([
//     getListingDetail(slug),
//     trackListingImpression(listing.id),
//   ])
//
//   // From a Server Action or Client Component:
//   void trackListingClick(listingId)          // fire-and-forget
//   await trackListingClick(listingId)         // block until confirmed

import { createClient } from '@/lib/supabase/server'

// ── Internal types ────────────────────────────────────────────────────────────

type TrackingEventType =
  | 'impression'
  | 'click'
  | 'save'
  | 'inquiry'
  | 'phone_reveal'
  | 'share'

interface TrackingOptions {
  profileId?: string
  sessionId?: string
  metadata?:  Record<string, string | number | boolean | null>
}

// ── Core insert helper ────────────────────────────────────────────────────────
// All public functions delegate here.  The try/catch is intentionally wide:
// we want to silence ALL failure modes (missing env, network timeout, RLS
// rejection, constraint violation) so callers never need to handle tracking
// errors themselves.

async function insertEvent(
  listingId: string,
  eventType: TrackingEventType,
  options:   TrackingOptions = {},
): Promise<void> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('listing_events').insert({
      listing_id: listingId,
      profile_id: options.profileId ?? null,
      event_type: eventType,
      session_id: options.sessionId ?? null,
      metadata:   options.metadata  ?? {},
    })
    if (error) {
      // Log but do not throw — tracking errors must never surface to callers.
      console.error('[tracking]', eventType, listingId, error.message)
    }
  } catch (err) {
    console.error('[tracking]', eventType, listingId, err)
  }
}

// ── Public tracking helpers ───────────────────────────────────────────────────

/**
 * Track a listing appearing in a search result, feed, or browse page.
 * Called server-side when a listing card is rendered.
 * Use `void trackListingImpression(id)` to avoid blocking the render.
 */
export async function trackListingImpression(
  listingId: string,
  options?: TrackingOptions,
): Promise<void> {
  return insertEvent(listingId, 'impression', options)
}

/**
 * Track a user navigating to a listing detail page.
 * Pass `source` in metadata to attribute the click origin
 * (e.g. 'search', 'browse', 'recommendation').
 */
export async function trackListingClick(
  listingId: string,
  options?: TrackingOptions & { source?: string },
): Promise<void> {
  const { source, ...rest } = options ?? {}
  return insertEvent(listingId, 'click', {
    ...rest,
    metadata: source ? { ...rest.metadata, source } : rest.metadata,
  })
}

/**
 * Track a user revealing the seller's phone number.
 * High-intent signal (weight ×2 in engagement_score).
 */
export async function trackPhoneReveal(
  listingId: string,
  options?: TrackingOptions,
): Promise<void> {
  return insertEvent(listingId, 'phone_reveal', options)
}

/**
 * Track a user saving / bookmarking a listing.
 * High-intent signal (weight ×3 in engagement_score).
 */
export async function trackSave(
  listingId: string,
  options?: TrackingOptions,
): Promise<void> {
  return insertEvent(listingId, 'save', options)
}

/**
 * Track a user submitting an inquiry form for a listing.
 * Highest-intent signal (weight ×5 in engagement_score).
 * Typically called from the inquiry Server Action after successful insert.
 */
export async function trackInquiry(
  listingId: string,
  options?: TrackingOptions,
): Promise<void> {
  return insertEvent(listingId, 'inquiry', options)
}

/**
 * Track a listing share action (copy link, social share, etc.).
 */
export async function trackShare(
  listingId: string,
  options?: TrackingOptions,
): Promise<void> {
  return insertEvent(listingId, 'share', options)
}
