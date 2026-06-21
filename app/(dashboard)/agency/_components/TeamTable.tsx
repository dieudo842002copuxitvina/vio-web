'use client'

import { useState } from 'react'
import type { AgencyMember, AgencyMemberRole } from '@/features/agency/api/agency-members.server'
import { removeMember, updateMemberRole }       from '@/features/agency/api/agency-members.server'

const ROLE_LABELS: Record<AgencyMemberRole, string> = {
  owner:   'Chủ sở hữu',
  manager: 'Quản lý',
  agent:   'Nhân viên',
}

const ROLE_BADGE: Record<AgencyMemberRole, string> = {
  owner:   'bg-amber-100 text-amber-800',
  manager: 'bg-blue-100 text-blue-800',
  agent:   'bg-neutral-100 text-neutral-700',
}

interface Props {
  members:    AgencyMember[]
  agencyId:   string
  selfRole:   AgencyMemberRole
}

export function TeamTable({ members, agencyId, selfRole }: Props) {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const canManage = selfRole === 'owner' || selfRole === 'manager'

  async function handleRemove(memberId: string) {
    setPending(memberId)
    setError(null)
    const res = await removeMember(agencyId, memberId)
    if (!res.ok) setError(res.error ?? 'Có lỗi xảy ra.')
    setPending(null)
  }

  async function handleRoleChange(memberId: string, newRole: 'manager' | 'agent') {
    if (selfRole !== 'owner') return
    setPending(memberId)
    setError(null)
    const res = await updateMemberRole(agencyId, memberId, newRole)
    if (!res.ok) setError(res.error ?? 'Có lỗi xảy ra.')
    setPending(null)
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">Thành viên</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">Vai trò</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">Tham gia</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {members.map(m => (
              <tr key={m.id} className="bg-white">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">
                    {m.profile?.full_name ?? '—'}
                  </p>
                  <p className="text-xs text-neutral-500">{m.profile?.email ?? m.user_id.slice(0, 8)}</p>
                </td>
                <td className="px-4 py-3">
                  {selfRole === 'owner' && m.role !== 'owner' ? (
                    <select
                      className="rounded-md border border-neutral-200 px-2 py-1 text-xs"
                      value={m.role}
                      disabled={pending === m.id}
                      onChange={e => handleRoleChange(m.id, e.target.value as 'manager' | 'agent')}
                    >
                      <option value="manager">Quản lý</option>
                      <option value="agent">Nhân viên</option>
                    </select>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[m.role]}`}>
                      {ROLE_LABELS[m.role]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {m.joined_at
                    ? new Date(m.joined_at).toLocaleDateString('vi-VN')
                    : 'Đang chờ'}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {m.role !== 'owner' && (
                      <button
                        className="text-xs text-red-600 hover:underline disabled:opacity-40"
                        disabled={pending === m.id}
                        onClick={() => handleRemove(m.id)}
                      >
                        {pending === m.id ? '...' : 'Xóa'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
