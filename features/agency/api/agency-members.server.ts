'use server'

import { revalidatePath }                            from 'next/cache'
import { createClient, createAdminClient, createCachedClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgencyMemberRole = 'owner' | 'manager' | 'agent'

export interface AgencyMember {
  id:         string
  agency_id:  string
  user_id:    string
  role:       AgencyMemberRole
  invited_at: string
  joined_at:  string | null
  profile?: {
    full_name:   string | null
    email:       string | null
    avatar_url:  string | null
    phone:       string | null
  } | null
}

// ── getAgencyMembers ──────────────────────────────────────────────────────────

export async function getAgencyMembers(agencyId: string): Promise<AgencyMember[]> {
  const supabase = await createCachedClient()

  const { data, error } = await supabase
    .from('agency_members')
    .select(`
      id, agency_id, user_id, role, invited_at, joined_at,
      profile:profiles(full_name, email, avatar_url, phone)
    `)
    .eq('agency_id', agencyId)
    .order('role', { ascending: true })

  if (error) {
    console.error('[getAgencyMembers]', error.message)
    return []
  }

  return (data ?? []) as unknown as AgencyMember[]
}

// ── inviteMember ──────────────────────────────────────────────────────────────

export async function inviteMember(
  agencyId: string,
  email:    string,
  role:     AgencyMemberRole = 'agent',
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Chưa đăng nhập.' }

  // Verify caller is owner or manager
  const { data: self } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', agencyId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!self || !['owner', 'manager'].includes(self.role)) {
    return { ok: false, error: 'Không có quyền mời thành viên.' }
  }

  // Look up target user by email in profiles
  const admin = await createAdminClient()
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!targetProfile) {
    return { ok: false, error: 'Không tìm thấy tài khoản với email này.' }
  }

  const { error } = await admin.from('agency_members').insert({
    agency_id:  agencyId,
    user_id:    targetProfile.id,
    role,
    invited_at: new Date().toISOString(),
  })

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Người dùng đã là thành viên.' }
    return { ok: false, error: error.message }
  }

  revalidatePath('/agency/team')
  return { ok: true }
}

// ── removeMember ──────────────────────────────────────────────────────────────

export async function removeMember(
  agencyId: string,
  memberId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Chưa đăng nhập.' }

  const { data: self } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', agencyId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!self || !['owner', 'manager'].includes(self.role)) {
    return { ok: false, error: 'Không có quyền xóa thành viên.' }
  }

  // Cannot remove the owner
  const { data: target } = await supabase
    .from('agency_members')
    .select('role')
    .eq('id', memberId)
    .maybeSingle()

  if (target?.role === 'owner') {
    return { ok: false, error: 'Không thể xóa chủ sở hữu.' }
  }

  const admin = await createAdminClient()
  const { error } = await admin.from('agency_members').delete().eq('id', memberId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/agency/team')
  return { ok: true }
}

// ── updateMemberRole ──────────────────────────────────────────────────────────

export async function updateMemberRole(
  agencyId: string,
  memberId: string,
  newRole:  Exclude<AgencyMemberRole, 'owner'>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Chưa đăng nhập.' }

  const { data: self } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', agencyId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (self?.role !== 'owner') {
    return { ok: false, error: 'Chỉ chủ sở hữu mới thay đổi được vai trò.' }
  }

  const admin = await createAdminClient()
  const { error } = await admin
    .from('agency_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('agency_id', agencyId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/agency/team')
  return { ok: true }
}
