// Server-only. Lead event recording — call after any high-intent buyer action.
// Fire-and-forget: all errors are caught internally, never re-thrown.
//
// Architecture:
//   • Calls Postgres record_lead_event() SECURITY DEFINER function.
//   • That function inserts into lead_events AND updates crm_leads score.
//   • Authenticated users get their crm_lead auto-scored.
//   • Anonymous users get events recorded by session_id (score not applied to CRM).
//
// Usage:
//   void recordLeadEvent(listingId, 'call_click')           // fire-and-forget
//   await recordLeadEvent(listingId, 'request_visit')       // block until confirmed

import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LeadEventType =
  | 'save'
  | 'unsave'
  | 'chat_click'
  | 'call_click'
  | 'map_view'
  | 'request_visit'
  | 'legal_review'
  | 'share'
  | 'ecosystem_local_click'
  | 'ecosystem_export_click'

export interface LeadEventOptions {
  sessionId?:    string
  source?:       string   // 'listing_detail' | 'search' | 'dashboard'
  metadata?:     Record<string, string | number | boolean | null>
}

// ─────────────────────────────────────────────────────────────────────────────
// recordLeadEvent — primary entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function recordLeadEvent(
  listingId: string,
  eventType: LeadEventType,
  options:   LeadEventOptions = {},
): Promise<void> {
  try {
    const supabase   = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await (supabase.rpc as unknown as (
      fn: string, args: Record<string, unknown>
    ) => Promise<{ error: unknown }>)(
      'record_lead_event',
      {
        p_listing_id: listingId,
        p_profile_id: user?.id ?? null,
        p_event_type: eventType,
        p_session_id: options.sessionId ?? null,
        p_source:     options.source    ?? null,
        p_metadata:   options.metadata  ?? {},
      },
    )

    if (error) {
      console.error('[recordLeadEvent]', eventType, listingId, (error as { message: string }).message)
    }
  } catch (err) {
    console.error('[recordLeadEvent]', eventType, listingId, err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience wrappers — named per action for readability at call sites
// ─────────────────────────────────────────────────────────────────────────────

export const recordSaveListing    = (id: string, opts?: LeadEventOptions) =>
  recordLeadEvent(id, 'save',          opts)

export const recordChatClick      = (id: string, opts?: LeadEventOptions) =>
  recordLeadEvent(id, 'chat_click',    opts)

export const recordCallClick      = (id: string, opts?: LeadEventOptions) =>
  recordLeadEvent(id, 'call_click',    opts)

export const recordVisitRequest   = (id: string, opts?: LeadEventOptions) =>
  recordLeadEvent(id, 'request_visit', opts)

export const recordLegalReview    = (id: string, opts?: LeadEventOptions) =>
  recordLeadEvent(id, 'legal_review',  opts)

export const recordShare          = (id: string, opts?: LeadEventOptions) =>
  recordLeadEvent(id, 'share',         opts)

export const recordMapView        = (id: string, opts?: LeadEventOptions) =>
  recordLeadEvent(id, 'map_view',      opts)

export const recordEcosystemLocalClick  = (id: string, opts?: LeadEventOptions) =>
  recordLeadEvent(id, 'ecosystem_local_click',  opts)

export const recordEcosystemExportClick = (id: string, opts?: LeadEventOptions) =>
  recordLeadEvent(id, 'ecosystem_export_click', opts)

// ─────────────────────────────────────────────────────────────────────────────
// getLeadEvents — for seller dashboard heat-map / activity feed
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadEventRow {
  id:           string
  listing_id:   string
  event_type:   LeadEventType
  event_source: string | null
  created_at:   string
  metadata:     Record<string, unknown>
}

export async function getRecentLeadEvents(
  sellerId: string,
  limit = 50,
): Promise<LeadEventRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lead_events')
    .select('id, listing_id, event_type, event_source, created_at, metadata')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentLeadEvents]', error.message)
    return []
  }

  return (data ?? []) as unknown as LeadEventRow[]
}

// ─────────────────────────────────────────────────────────────────────────────
// getLeadFunnelCounts — funnel analytics for a seller's listings
// Returns aggregated event counts per type for the last N days.
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadFunnelCounts {
  save:          number
  chat_click:    number
  call_click:    number
  request_visit: number
  legal_review:  number
}

export async function getLeadFunnelCounts(
  sellerId: string,
  days = 30,
): Promise<LeadFunnelCounts> {
  const supabase  = await createClient()
  const since     = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('lead_events')
    .select('event_type')
    .eq('seller_id', sellerId)
    .gte('created_at', since)
    .in('event_type', ['save', 'chat_click', 'call_click', 'request_visit', 'legal_review'])

  if (error) {
    console.error('[getLeadFunnelCounts]', error.message)
    return { save: 0, chat_click: 0, call_click: 0, request_visit: 0, legal_review: 0 }
  }

  const rows = (data ?? []) as { event_type: string }[]
  const count = (type: string) => rows.filter(r => r.event_type === type).length

  return {
    save:          count('save'),
    chat_click:    count('chat_click'),
    call_click:    count('call_click'),
    request_visit: count('request_visit'),
    legal_review:  count('legal_review'),
  }
}
