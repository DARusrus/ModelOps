import DashboardOverview from '@/components/dashboard/DashboardOverview';

export const metadata = {
  title: 'Dashboard | ModelOps',
  description: 'Review the active organization evaluation and governance state.',
};

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-7 border-b border-slate-300 pb-6">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">Operational governance ledger</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Organization dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A bounded view of persisted evaluations, review demand, and safe organization activity.</p>
      </header>
      <DashboardOverview />
    </div>
  );
}
