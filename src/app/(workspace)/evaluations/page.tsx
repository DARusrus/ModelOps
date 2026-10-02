import EvaluationCatalog from '@/components/evaluations/EvaluationCatalog';
import EvaluationPageActions from '@/components/evaluations/EvaluationPageActions';

export const metadata = {
  title: 'Evaluations | ModelOps',
  description: 'Search and reopen governed model evaluations in the active organization.',
};

export default function EvaluationsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-7 flex flex-col gap-4 border-b border-slate-300 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">Organization ledger</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Evaluations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Search persisted dossiers, inspect their review state, and reopen the exact governed record.
          </p>
        </div>
        <EvaluationPageActions />
      </header>
      <EvaluationCatalog />
    </div>
  );
}
