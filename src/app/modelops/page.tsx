import { redirect } from 'next/navigation';
import { requireDefaultActor } from '@/lib/auth/actor';
import { workspaceAccessRedirect } from '@/lib/auth/workspace-access';
import ModelOpsWorkspace from './Workspace';

export default async function ModelOpsWorkspacePage() {
  let role: 'viewer' | 'editor' | 'reviewer' | 'admin';
  try {
    ({ role } = await requireDefaultActor('read'));
  } catch (error) {
    redirect(workspaceAccessRedirect(error, '/modelops'));
  }
  return <ModelOpsWorkspace role={role} />;
}
