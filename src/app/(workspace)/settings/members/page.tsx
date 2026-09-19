import { redirect } from 'next/navigation';
import MemberAdministration from '@/components/settings/MemberAdministration';
import { requireDefaultActor } from '@/lib/auth/actor';
import { workspaceAccessRedirect } from '@/lib/auth/workspace-access';

export const metadata = { title: 'Members and invitations | ModelOps', description: 'Manage organization access and reviewer roles.' };

export default async function MembersSettingsPage() {
  try {
    await requireDefaultActor('admin');
  } catch (error) {
    redirect(workspaceAccessRedirect(error, '/settings/members'));
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <MemberAdministration />
    </div>
  );
}
