import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RunComparison from '@/components/modelops/RunComparison';
import { UuidSchema } from '@/domain/modelops/api-contracts';
import { redirect } from 'next/navigation';
import { requireDefaultActor } from '@/lib/auth/actor';
import { workspaceAccessRedirect } from '@/lib/auth/workspace-access';

function optionalId(value: string | null) {
  const parsed = UuidSchema.safeParse(value);
  return parsed.success ? parsed.data : '';
}

export const metadata = {
  title: 'Compare evaluations | ModelOps',
  description: 'Compare two persisted evaluations inside the active organization.',
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ baseline?: string; candidate?: string }> }) {
  const query = await searchParams;
  try {
    await requireDefaultActor('compare');
  } catch (error) {
    redirect(workspaceAccessRedirect(error, '/compare'));
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <Link href="/evaluations" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded text-sm font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to evaluations
      </Link>
      <header className="mb-6 border-b border-slate-300 pb-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">Governed analysis</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Compare evaluations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Select two persisted records. The server reloads both inside the active organization before calculating the diff.</p>
      </header>
      <RunComparison initialBaselineId={optionalId(query.baseline ?? null)} initialCandidateId={optionalId(query.candidate ?? null)} />
    </div>
  );
}
