import { redirect } from 'next/navigation';
import { requireDefaultActor } from '@/lib/auth/actor';
import { workspaceAccessRedirect } from '@/lib/auth/workspace-access';
import ModelOpsWorkspace from './Workspace';

export default async function ModelOpsWorkspacePage() {
  try {
    await requireDefaultActor('read');
  } catch (error) {
    redirect(workspaceAccessRedirect(error));
  }
  return <ModelOpsWorkspace />;
}
