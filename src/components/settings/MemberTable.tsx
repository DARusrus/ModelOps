import { UserMinus } from 'lucide-react';
import type { OrganizationMember, OrganizationRole } from '@/domain/organization/contracts';
import type { OrganizationRoleOption } from './organization-role-options';

const roleSelectClass = [
  'min-h-11 cursor-pointer rounded border border-slate-300 bg-white px-2 capitalize',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const removeButtonClass = [
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded border border-rose-300 px-3',
  'text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

type MemberTableProps = {
  members: OrganizationMember[];
  roles: readonly OrganizationRoleOption[];
  loading: boolean;
  busy: boolean;
  onRoleChange: (member: OrganizationMember, role: OrganizationRole) => void;
  onRemove: (member: OrganizationMember) => void;
};

export default function MemberTable({ members, roles, loading, busy, onRoleChange, onRemove }: MemberTableProps) {
  function confirmRemoval(member: OrganizationMember) {
    const confirmed = window.confirm(
      `Remove ${member.email} from this organization? Their organization access will end immediately.`,
    );
    if (confirmed) onRemove(member);
  }

  return (
    <section aria-labelledby="members-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="members-heading" className="text-lg font-bold text-slate-950">Current members</h2>
          <p className="text-sm text-slate-600">At least one administrator must remain.</p>
        </div>
        <span className="font-mono text-xs text-slate-500">{members.length} ACTIVE</span>
      </div>

      <div className="overflow-x-auto border border-slate-300 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Identity</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Joined</th>
              <th scope="col" className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-slate-600">Loading organization members…</td>
              </tr>
            )}
            {!loading && members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-slate-600">No members were returned.</td>
              </tr>
            )}
            {!loading && members.map((member) => (
              <tr key={member.user_id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {member.email}
                  {member.is_current_user && (
                    <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">You</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Role for ${member.email}`}
                    value={member.role}
                    disabled={busy || member.is_current_user}
                    title={member.is_current_user ? 'Another administrator must change your role.' : undefined}
                    onChange={(event) => onRoleChange(member, event.target.value as OrganizationRole)}
                    className={roleSelectClass}
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">{new Date(member.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  {member.is_current_user ? (
                    <span className="text-xs text-slate-500">Current session</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => confirmRemoval(member)}
                      className={removeButtonClass}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
