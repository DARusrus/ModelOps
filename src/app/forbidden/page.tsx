import Link from 'next/link';
import SignOutButton from '@/components/auth/SignOutButton';

const actionClass = 'inline-flex min-h-11 items-center justify-center rounded border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2';

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-xl border border-rose-300 bg-white p-6 shadow-sm sm:p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-rose-700">ModelOps workspace</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Access is not available</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your role in the active organization does not permit this action. You can return to the workspace, select another organization, or ask an administrator to update your role.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className={actionClass}>Return to workspace</Link>
          <Link href="/select-organization" className={actionClass}>Switch organization</Link>
          <Link href="/modelops#faq" className={actionClass}>Open help</Link>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-5">
          <SignOutButton className={`${actionClass} cursor-pointer`} />
        </div>
      </section>
    </main>
  );
}
