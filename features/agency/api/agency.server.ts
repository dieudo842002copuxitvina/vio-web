'use server'

import { revalidatePath }               from 'next/cache'
import { createClient, createAdminClient, createCachedClient } from '@/lib/supabase/server'
import { writeAuditLog }                from '@/features/admin/api/audit.server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgencyAccount {
  id:                   string
  company_name:         string
  representative_name:  string
  phone:                string
  email:                string | null
  province_id:          number | null
  website:              string | null
  verification_status:  'pending' | 'verified' | 'suspended'
  trust_score:          number
  owner_user_id:        string | null
  metadata:             Record<string, unknown>
  created_at:           string
  updated_at:           string
}

export interface AgencyMetrics {
  agency_id:       string
  total_listings:  number
  active_listings: number
  total_leads:     number
  visit_requests:  number
  legal_reviews:   number
  leads_won_30d:   number
  revenue_vnd:     number
  updated_at:      string
}

export interface CreateAgencyData {
  company_name:        string
  representative_name: string
  phone:               string
  email?:              string
  province_id?:        number
  website?:            string
}

// ── createAgencyAccount ───────────────────────────────────────────────────────

export async function createAgencyAccount(
  data: CreateAgencyData,
): Promise<{ ok: boolean; agency?: AgencyAccount; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Chưa đăng nhập.' }

  const { data: existing } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existing) return { ok: false, error: 'Bạn đã thuộc một công ty môi giới.' }

  const admin = await createAdminClient()

  const { data: agency, error: agencyErr } = await admin
    .from('agency_accounts')
    .insert({
      ...data,
      owner_user_id: user.id,
      verification_status: 'pending',
    })
    .select()
    .single()

  if (agencyErr) return { ok: false, error: agencyErr.message }

  // Add owner as first member
  await admin.from('agency_members').insert({
    agency_id: agency.id,
    user_id:   user.id,
    role:      'owner',
    joined_at: new Date().toISOString(),
  })

  revalidatePath('/agency')
  return { ok: true, agency: agency as unknown as AgencyAccount }
}

// ── getAgencyForUser ──────────────────────────────────────────────────────────

export async function getAgencyForUser(): Promise<{
  agency: AgencyAccount | null
  role: 'owner' | 'manager' | 'agent' | null
  metrics: AgencyMetrics | null
}> {
  const supabase = await createCachedClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { agency: null, role: null, metrics: null }

  const { data: membership } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return { agency: null, role: null, metrics: null }

  const [{ data: agency }, { data: metrics }] = await Promise.all([
    supabase
      .from('agency_accounts')
      .select('*')
      .eq('id', membership.agency_id)
      .single(),
    supabase
      .from('agency_metrics')
      .select('*')
      .eq('agency_id', membership.agency_id)
      .maybeSingle(),
  ])

  return {
    agency:  agency  as unknown as AgencyAccount | null,
    role:    membership.role as 'owner' | 'manager' | 'agent',
    metrics: metrics as unknown as AgencyMetrics | null,
  }
}

// ── verifyAgency ──────────────────────────────────────────────────────────────

export async function verifyAgency(
  agencyId: string,
  adminId:  string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await createAdminClient()

  const { error } = await admin
    .from('agency_accounts')
    .update({ verification_status: 'verified', updated_at: new Date().toISOString() })
    .eq('id', agencyId)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('agency.verify', 'agency_account', agencyId, adminId, { status: 'verified' })
  revalidatePath('/admin')
  return { ok: true }
}

// ── suspendAgency ─────────────────────────────────────────────────────────────

export async function suspendAgency(
  agencyId: string,
  adminId:  string,
  reason?:  string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await createAdminClient()

  const { error } = await admin
    .from('agency_accounts')
    .update({ verification_status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', agencyId)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('agency.suspend', 'agency_account', agencyId, adminId, { reason })
  revalidatePath('/admin')
  return { ok: true }
}

// ── refreshAgencyMetrics ──────────────────────────────────────────────────────

export async function refreshAgencyMetrics(agencyId: string): Promise<void> {
  const admin = await createAdminClient()
  await (admin.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>)(
    'refresh_agency_metrics',
    { p_agency_id: agencyId },
  )
}
