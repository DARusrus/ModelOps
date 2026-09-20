import EvaluationComposer from '@/components/evaluations/EvaluationComposer';
import { redirect } from 'next/navigation';
import { requireDefaultActor } from '@/lib/auth/actor';
import { workspaceAccessRedirect } from '@/lib/auth/workspace-access';

export const metadata = {
  title: 'New evaluation | ModelOps',
  description: 'Create and persist a governed model evaluation.',
};

export default async function NewEvaluationPage() {
  try {
    await requireDefaultActor('evaluate');
  } catch (error) {
    redirect(workspaceAccessRedirect(error, '/evaluations/new'));
  }
  return <EvaluationComposer />;
}
