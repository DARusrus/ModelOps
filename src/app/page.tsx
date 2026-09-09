import { redirect } from 'next/navigation';
import { requireDefaultActor } from '@/lib/auth/actor';
import { workspaceAccessRedirect } from '@/lib/auth/workspace-access';

export default async function HomePage() {
  try {
    await requireDefaultActor('read');
  } catch (error) {
    redirect(workspaceAccessRedirect(error));
  }
  redirect('/modelops');
}
