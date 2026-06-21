import { redirect }                                     from 'next/navigation'
import { getAgencyForUser }                              from '@/features/agency/api/agency.server'
import { getAgencyMembers, inviteMember }                from '@/features/agency/api/agency-members.server'
import { TeamTable }                                     from '../_components/TeamTable'
import type { AgencyMemberRole }                         from '@/features/agency/api/agency-members.server'

export const metadata = { title: 'Quản lý nhóm | VIO AGRI' }

export default async function AgencyTeamPage() {
  const { agency, role } = await getAgencyForUser()
  if (!agency) redirect('/dashboard')

  const members = await getAgencyMembers(agency.id)
  const agencyId = agency.id

  async function inviteAction(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const r     = formData.get('role')  as AgencyMemberRole
    await inviteMember(agencyId, email, r)
  }

  const canManage = role === 'owner' || role === 'manager'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Quản lý nhóm</h1>
          <p className="mt-0.5 text-sm text-neutral-500">{members.length} thành viên</p>
        </div>
      </div>

      {canManage && (
        <form action={inviteAction} className="flex gap-2">
          <input
            name="email"
            type="email"
            placeholder="Email thành viên mới"
            required
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          <select
            name="role"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            <option value="agent">Nhân viên</option>
            <option value="manager">Quản lý</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Mời
          </button>
        </form>
      )}

      <TeamTable
        members={members}
        agencyId={agencyId}
        selfRole={role as AgencyMemberRole}
      />
    </div>
  )
}
