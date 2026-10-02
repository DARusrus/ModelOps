import { redirect } from 'next/navigation';
import ReviewQueue from '@/components/reviews/ReviewQueue';
import { ReviewQueueFilterSchema } from '@/domain/reviews/contracts';
import { requireDefaultActor } from '@/lib/auth/actor';
import { workspaceAccessRedirect } from '@/lib/auth/workspace-access';

export const metadata = {
  title: 'Review queue | ModelOps',
  description: 'Find submitted model evaluations requiring governed review.',
};

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  try {
    await requireDefaultActor('review');
  } catch (error) {
    redirect(workspaceAccessRedirect(error, '/reviews'));
  }
  const parsedState = ReviewQueueFilterSchema.safeParse((await searchParams).state ?? 'all');
  const initialState = parsedState.success ? parsedState.data : 'all';

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-7 border-b border-slate-300 pb-6">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">Governance work queue</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Reviews</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Open submitted work in its permanent evaluation dossier. Decisions remain evidence-aware and server-authorized.</p>
      </header>
      <ReviewQueue initialState={initialState} />
    </div>
  );
}
