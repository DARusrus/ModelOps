import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import AppShell from '@/components/app-shell/AppShell';
import { requireWorkspaceContext, type WorkspaceContext } from '@/lib/auth/workspace-context';
import { WORKSPACE_PATH_HEADER } from '@/lib/auth/workspace-path';
import { workspaceAccessRedirect } from '@/lib/auth/workspace-access';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const requestedPath = requestHeaders.get(WORKSPACE_PATH_HEADER) ?? undefined;
  let context: WorkspaceContext;

  try {
    context = await requireWorkspaceContext();
  } catch (error) {
    redirect(workspaceAccessRedirect(error, requestedPath));
  }

  return <AppShell context={context}>{children}</AppShell>;
}
