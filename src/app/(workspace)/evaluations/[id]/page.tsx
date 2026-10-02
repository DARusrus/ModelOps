import { notFound } from 'next/navigation';
import EvaluationDetail from '@/components/evaluations/EvaluationDetail';
import { UuidSchema } from '@/domain/modelops/api-contracts';

export const metadata = {
  title: 'Evaluation detail | ModelOps',
  description: 'Inspect a persisted governed model evaluation.',
};

export default async function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = UuidSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  return <EvaluationDetail evaluationId={parsed.data} />;
}
