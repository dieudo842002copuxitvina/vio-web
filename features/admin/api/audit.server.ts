'use server'

import { createAdminClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id:          number
  action:      string
  entity_type: string | null
  entity_id:   string | null
  actor_id:    string | null
  metadata:    Record<string, unknown> | null
  created_at:  string
  actor?:      { full_name: string | null; email: string | null } | null
}

export interface AuditLogFilters {
  action?:      string
  entity_type?: string
  entity_id?:   string
  actor_id?:    string
  date_from?:   string
  date_to?:     string
  page?:        number
  limit?:       number
}

// ── writeAuditLog ─────────────────────────────────────────────────────────────

export async function writeAuditLog(
  action:      string,
  entityType:  string,
  entityId:    string,
  actorId:     string,
  metadata?:   Record<string, unknown>,
): Promise<void> {
  const supabase = await createAdminClient()
  await supabase.from('audit_logs').insert({
    action,
    entity_type: entityType,
    entity_id:   entityId,
    actor_id:    actorId,
    metadata:    metadata ?? null,
  })
}

// ── getAuditLogs ──────────────────────────────────────────────────────────────

export async function getAuditLogs(
  filters: AuditLogFilters = {},
): Promise<{ items: AuditLog[]; total: number }> {
  const supabase = await createAdminClient()
  const page  = filters.page  ?? 1
  const limit = filters.limit ?? 50
  const from  = (page - 1) * limit

  let q = supabase
    .from('audit_logs')
    .select('*, actor:actor_id(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (filters.action)      q = q.eq('action',      filters.action)
  if (filters.entity_type) q = q.eq('entity_type', filters.entity_type)
  if (filters.entity_id)   q = q.eq('entity_id',   filters.entity_id)
  if (filters.actor_id)    q = q.eq('actor_id',     filters.actor_id)
  if (filters.date_from)   q = q.gte('created_at',  filters.date_from)
  if (filters.date_to)     q = q.lte('created_at',  filters.date_to)

  const { data, count } = await q
  return {
    items: (data ?? []) as unknown as AuditLog[],
    total: count ?? 0,
  }
}
